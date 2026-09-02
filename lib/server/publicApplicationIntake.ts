import { createHash, randomBytes } from 'node:crypto';

import { z } from 'zod';

import {
  AnonymousApplicationV2InputSchema,
  ApplicationV2BusinessSchema,
  buildApplicationV2Record,
} from '../applications/applicationV2';
import { PUBLIC_APPLICATION_V2_ENABLED } from '../featureFlags';
import { getAdminFirestore } from './firebaseAdmin';

const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;
const PUBLIC_REFERENCE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export const PUBLIC_APPLICATION_MAX_BODY_BYTES = 20_000;
export const PUBLIC_APPLICATION_RATE_LIMIT = 5;
export const PUBLIC_APPLICATION_RATE_WINDOW_MS = 60 * 60 * 1000;

const PublicApplicationBusinessSubmissionSchema = ApplicationV2BusinessSchema.pick({
  businessName: true,
  category: true,
  categoryId: true,
  categoryGroupId: true,
  phone: true,
  whatsapp: true,
})
  .extend({
    category: z.string().trim().min(1).max(120),
    categoryId: z.string().trim().min(1).max(120),
    categoryGroupId: z.string().trim().min(1).max(80),
  })
  .strict();

export const PublicApplicationSubmissionSchema = AnonymousApplicationV2InputSchema.pick({
  ownerEmail: true,
  ownerName: true,
  ownerPhone: true,
})
  .extend({
    business: PublicApplicationBusinessSubmissionSchema,
    /** Campo señuelo explícito: debe llegar vacío. */
    contactWebsite: z.string().trim().max(200).optional(),
  })
  .strict();

export type PublicApplicationSubmission = z.input<typeof PublicApplicationSubmissionSchema>;

export interface PublicApplicationChallengeVerifier {
  verify(input: {
    requestHeaders: Headers;
    clientIdentifier: string;
  }): Promise<{ ok: boolean }>;
}

export class PublicApplicationIntakeError extends Error {
  constructor(
    public readonly code:
      | 'PUBLIC_APPLICATION_V2_DISABLED'
      | 'INVALID_IDEMPOTENCY_KEY'
      | 'IDEMPOTENCY_KEY_REUSED'
      | 'RATE_LIMITED'
      | 'CHALLENGE_FAILED',
  ) {
    super(code);
    this.name = 'PublicApplicationIntakeError';
  }
}

type IntakeOptions = {
  enabled?: boolean;
  db?: ReturnType<typeof getAdminFirestore>;
  now?: Date;
  applicationId?: string;
  publicReference?: string;
  rateLimit?: number;
  challengeVerifier?: PublicApplicationChallengeVerifier;
  requestHeaders?: Headers;
};

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

export function generatePublicApplicationReference(now: Date = new Date()): string {
  const entropy = randomBytes(10);
  let suffix = '';
  for (let index = 0; index < 10; index += 1) {
    suffix += PUBLIC_REFERENCE_ALPHABET[entropy[index] % PUBLIC_REFERENCE_ALPHABET.length];
  }
  return `YJG-${now.getUTCFullYear()}-${suffix}`;
}

export function normalizePublicApplicationInput(input: PublicApplicationSubmission) {
  const parsed = PublicApplicationSubmissionSchema.parse(input);
  const { contactWebsite: _honeypot, ...application } = parsed;
  return AnonymousApplicationV2InputSchema.parse(application);
}

/**
 * Intake público exclusivamente servidor.
 * La solicitud, el guard de idempotencia y el contador persistente se escriben
 * atómicamente. El endpoint no crea users, businesses, ownership ni claims.
 */
export async function submitPublicApplicationV2(
  input: PublicApplicationSubmission,
  context: { idempotencyKey: string; clientIdentifier: string },
  options: IntakeOptions = {},
) {
  const enabled = options.enabled ?? PUBLIC_APPLICATION_V2_ENABLED;
  if (!enabled) throw new PublicApplicationIntakeError('PUBLIC_APPLICATION_V2_DISABLED');
  if (!IDEMPOTENCY_KEY_PATTERN.test(context.idempotencyKey)) {
    throw new PublicApplicationIntakeError('INVALID_IDEMPOTENCY_KEY');
  }

  if (options.challengeVerifier) {
    const challenge = await options.challengeVerifier.verify({
      requestHeaders: options.requestHeaders ?? new Headers(),
      clientIdentifier: context.clientIdentifier,
    });
    if (!challenge.ok) throw new PublicApplicationIntakeError('CHALLENGE_FAILED');
  }

  const parsed = PublicApplicationSubmissionSchema.parse(input);
  if (parsed.contactWebsite) {
    return { accepted: false as const, honeypot: true as const };
  }

  const applicationInput = normalizePublicApplicationInput(parsed);
  const now = options.now ?? new Date();
  const applicationId = options.applicationId ?? randomBytes(20).toString('base64url');
  const publicReference = options.publicReference ?? generatePublicApplicationReference(now);
  const record = buildApplicationV2Record(applicationInput, now, { publicReference });
  const requestHash = sha256(JSON.stringify(applicationInput));
  const idempotencyHash = sha256(`public-application-v2:${context.idempotencyKey}`);
  const windowStartMs =
    Math.floor(now.getTime() / PUBLIC_APPLICATION_RATE_WINDOW_MS) *
    PUBLIC_APPLICATION_RATE_WINDOW_MS;
  const clientHash = sha256(`public-application-client:${context.clientIdentifier}`);
  const db = options.db ?? getAdminFirestore();
  const applicationRef = db.collection('applications').doc(applicationId);
  const idempotencyRef = db.collection('publicApplicationIdempotency').doc(idempotencyHash);
  // Un solo bucket por cliente evita crear documentos sin límite cada hora.
  const rateLimitRef = db.collection('publicApplicationRateLimits').doc(clientHash);
  const limit = options.rateLimit ?? PUBLIC_APPLICATION_RATE_LIMIT;

  return db.runTransaction(async (transaction) => {
    const idempotencySnapshot = await transaction.get(idempotencyRef);
    if (idempotencySnapshot.exists) {
      const existing = idempotencySnapshot.data() || {};
      if (existing.requestHash !== requestHash) {
        throw new PublicApplicationIntakeError('IDEMPOTENCY_KEY_REUSED');
      }
      return {
        accepted: true as const,
        duplicate: true as const,
        applicationId: String(existing.applicationId),
        publicReference: String(existing.publicReference),
      };
    }

    const rateLimitSnapshot = await transaction.get(rateLimitRef);
    const storedWindowStart = rateLimitSnapshot.data()?.windowStart;
    const storedWindowStartMs = storedWindowStart instanceof Date
      ? storedWindowStart.getTime()
      : typeof storedWindowStart?.toDate === 'function'
        ? storedWindowStart.toDate().getTime()
        : null;
    const currentCount = rateLimitSnapshot.exists && storedWindowStartMs === windowStartMs
      ? Number(rateLimitSnapshot.data()?.count || 0)
      : 0;
    if (currentCount >= limit) {
      throw new PublicApplicationIntakeError('RATE_LIMITED');
    }

    transaction.create(applicationRef, record);
    transaction.create(idempotencyRef, {
      applicationId,
      publicReference,
      requestHash,
      createdAt: now,
      expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    });
    transaction.set(rateLimitRef, {
      clientHash,
      count: currentCount + 1,
      windowStart: new Date(windowStartMs),
      expiresAt: new Date(windowStartMs + PUBLIC_APPLICATION_RATE_WINDOW_MS),
      updatedAt: now,
    });

    return {
      accepted: true as const,
      duplicate: false as const,
      applicationId,
      publicReference,
    };
  });
}
