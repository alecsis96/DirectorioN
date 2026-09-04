import { timingSafeEqual } from 'node:crypto';

import { OWNERSHIP_CLAIMS_ENABLED } from '../featureFlags';
import { getAdminFirestore } from './firebaseAdmin';
import {
  OWNERSHIP_CLAIMS_COLLECTION,
  OWNERSHIP_CLAIM_GUARDS_COLLECTION,
  hashOwnershipClaimToken,
  normalizeClaimEmail,
} from './ownershipClaims';

export const OWNERSHIP_CLAIM_AUDITS_COLLECTION = 'ownershipClaimAudits' as const;

export type RedeemOwnershipClaimCode =
  | 'OWNERSHIP_CLAIMS_DISABLED'
  | 'CLAIM_TOKEN_INVALID'
  | 'CLAIM_INVALID'
  | 'CLAIM_EMAIL_NOT_VERIFIED'
  | 'CLAIM_EMAIL_MISMATCH'
  | 'CLAIM_EXPIRED'
  | 'CLAIM_REVOKED'
  | 'CLAIM_ALREADY_USED'
  | 'BUSINESS_ALREADY_CLAIMED'
  | 'CLAIM_INTEGRITY_ERROR';

export class RedeemOwnershipClaimError extends Error {
  readonly code: RedeemOwnershipClaimCode;

  constructor(code: RedeemOwnershipClaimCode) {
    super(code);
    this.name = 'RedeemOwnershipClaimError';
    this.code = code;
  }
}

export type VerifiedClaimIdentity = {
  uid: string;
  email: string;
  emailVerified: boolean;
};

type RedeemOwnershipClaimOptions = {
  db?: ReturnType<typeof getAdminFirestore>;
  enabled?: boolean;
  now?: Date;
  attempt?: { id: string; secretHash: string };
};

type ValidateClaimEmailLinkOptions = RedeemOwnershipClaimOptions;

function asDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (value && typeof (value as { toDate?: unknown }).toDate === 'function') {
    const converted = (value as { toDate: () => Date }).toDate();
    return converted instanceof Date ? converted : null;
  }
  return null;
}

function safeHashEqual(expected: unknown, actual: string): boolean {
  if (typeof expected !== 'string' || expected.length !== actual.length) return false;
  const expectedBytes = Buffer.from(expected, 'utf8');
  const actualBytes = Buffer.from(actual, 'utf8');
  return expectedBytes.length === actualBytes.length && timingSafeEqual(expectedBytes, actualBytes);
}

function validateToken(token: string): string {
  const normalized = token.trim();
  // 32 bytes encoded as unpadded base64url.
  if (!/^[A-Za-z0-9_-]{43}$/.test(normalized)) {
    throw new RedeemOwnershipClaimError('CLAIM_TOKEN_INVALID');
  }
  return normalized;
}

function validateIdentity(identity: VerifiedClaimIdentity): { uid: string; emailNormalized: string } {
  const uid = identity.uid.trim();
  if (!uid || uid.length > 128 || uid.includes('/')) {
    throw new RedeemOwnershipClaimError('CLAIM_INTEGRITY_ERROR');
  }
  if (!identity.emailVerified) {
    throw new RedeemOwnershipClaimError('CLAIM_EMAIL_NOT_VERIFIED');
  }
  try {
    return { uid, emailNormalized: normalizeClaimEmail(identity.email) };
  } catch {
    throw new RedeemOwnershipClaimError('CLAIM_EMAIL_MISMATCH');
  }
}

/**
 * Prevalida una solicitud de Email Link sin consumir ni revelar datos del claim.
 * El redeem vuelve a comprobar todas las invariantes; esto sólo impide usar la UI
 * como emisor de enlaces para tokens inventados o correos ajenos a la invitación.
 */
export async function validateOwnershipClaimForEmailLink(
  tokenInput: string,
  emailInput: string | null,
  options: ValidateClaimEmailLinkOptions = {},
): Promise<{ claimId: string; emailNormalized: string }> {
  if (!(options.enabled ?? OWNERSHIP_CLAIMS_ENABLED)) {
    throw new RedeemOwnershipClaimError('OWNERSHIP_CLAIMS_DISABLED');
  }
  const token = validateToken(tokenInput);
  const tokenHash = hashOwnershipClaimToken(token);
  const db = options.db ?? getAdminFirestore();
  const now = options.now ?? new Date();
  const query = await db
    .collection(OWNERSHIP_CLAIMS_COLLECTION)
    .where('tokenHash', '==', tokenHash)
    .limit(2)
    .get();
  if (query.size !== 1) throw new RedeemOwnershipClaimError('CLAIM_INVALID');

  const claimSnapshot = query.docs[0];
  const claim = claimSnapshot.data() || {};
  let emailNormalized: string;
  try {
    emailNormalized = emailInput === null
      ? normalizeClaimEmail(String(claim.emailNormalized || ''))
      : normalizeClaimEmail(emailInput);
  } catch {
    throw new RedeemOwnershipClaimError('CLAIM_INVALID');
  }
  const expiresAt = asDate(claim.expiresAt);
  if (
    !safeHashEqual(claim.tokenHash, tokenHash) ||
    claim.status !== 'active' ||
    !expiresAt ||
    expiresAt.getTime() <= now.getTime() ||
    claim.emailNormalized !== emailNormalized ||
    typeof claim.businessId !== 'string' ||
    typeof claim.applicationId !== 'string'
  ) {
    throw new RedeemOwnershipClaimError('CLAIM_INVALID');
  }

  const guardRef = db.collection(OWNERSHIP_CLAIM_GUARDS_COLLECTION).doc(claim.businessId);
  const businessRef = db.collection('businesses').doc(claim.businessId);
  const applicationRef = db.collection('applications').doc(claim.applicationId);
  const [guard, business, application] = await Promise.all([
    guardRef.get(), businessRef.get(), applicationRef.get(),
  ]);
  const guardData = guard.data() || {};
  const businessData = business.data() || {};
  const applicationData = application.data() || {};
  let applicationEmail = '';
  try {
    applicationEmail = normalizeClaimEmail(String(applicationData.ownerEmail || ''));
  } catch {}
  if (
    !guard.exists ||
    !business.exists ||
    !application.exists ||
    guardData.activeClaimId !== claimSnapshot.id ||
    guardData.businessId !== claim.businessId ||
    Number(guardData.version) !== Number(claim.version) ||
    Object.prototype.hasOwnProperty.call(businessData, 'ownerId') ||
    Object.prototype.hasOwnProperty.call(businessData, 'ownerUid') ||
    businessData.sourceApplicationId !== claim.applicationId ||
    applicationData.schemaVersion !== 2 ||
    applicationData.status !== 'approved' ||
    applicationData.businessId !== claim.businessId ||
    applicationEmail !== claim.emailNormalized
  ) {
    throw new RedeemOwnershipClaimError('CLAIM_INVALID');
  }
  return { claimId: claimSnapshot.id, emailNormalized };
}

/**
 * Consume una invitación v2 usando exclusivamente identidad verificada por Firebase.
 * El token se convierte a hash antes de consultar y nunca se persiste ni se registra.
 */
export async function redeemOwnershipClaim(
  tokenInput: string,
  identityInput: VerifiedClaimIdentity,
  options: RedeemOwnershipClaimOptions = {},
): Promise<{ businessId: string; idempotent: boolean }> {
  if (!(options.enabled ?? OWNERSHIP_CLAIMS_ENABLED)) {
    throw new RedeemOwnershipClaimError('OWNERSHIP_CLAIMS_DISABLED');
  }

  const token = validateToken(tokenInput);
  const tokenHash = hashOwnershipClaimToken(token);
  return redeemOwnershipClaimHash(tokenHash, identityInput, options);
}

/** Server-only continuation: the hash must come from a verified attempt, never a request body. */
export async function redeemOwnershipClaimHash(
  tokenHash: string,
  identityInput: VerifiedClaimIdentity,
  options: RedeemOwnershipClaimOptions = {},
): Promise<{ businessId: string; idempotent: boolean }> {
  if (!(options.enabled ?? OWNERSHIP_CLAIMS_ENABLED)) {
    throw new RedeemOwnershipClaimError('OWNERSHIP_CLAIMS_DISABLED');
  }
  const identity = validateIdentity(identityInput);
  const db = options.db ?? getAdminFirestore();
  const claimsQuery = await db
    .collection(OWNERSHIP_CLAIMS_COLLECTION)
    .where('tokenHash', '==', tokenHash)
    .limit(2)
    .get();

  if (claimsQuery.size !== 1) {
    throw new RedeemOwnershipClaimError(
      claimsQuery.size > 1 ? 'CLAIM_INTEGRITY_ERROR' : 'CLAIM_INVALID',
    );
  }

  const claimRef = claimsQuery.docs[0].ref;
  const auditRef = db.collection(OWNERSHIP_CLAIM_AUDITS_COLLECTION).doc();

  return db.runTransaction(async (transaction) => {
    const now = options.now ?? new Date();
    const attemptRef = options.attempt
      ? db.collection('ownershipClaimAttempts').doc(options.attempt.id) : null;
    if (attemptRef && options.attempt) {
      const attempt = (await transaction.get(attemptRef)).data();
      if (!attempt || !safeHashEqual(attempt.secretHash, options.attempt.secretHash) ||
          attempt.targetUid !== identity.uid || attempt.tokenHash !== tokenHash ||
          attempt.claimId !== claimRef.id || !attempt.confirmedAt ||
          !['ready', 'completed'].includes(attempt.status) ||
          (asDate(attempt.expiresAt)?.getTime() ?? 0) <= now.getTime()) {
        throw new RedeemOwnershipClaimError('CLAIM_INVALID');
      }
    }
    const claimSnapshot = await transaction.get(claimRef);
    if (!claimSnapshot.exists) throw new RedeemOwnershipClaimError('CLAIM_INVALID');
    const claim = claimSnapshot.data() || {};
    if (attemptRef) {
      const attempt = (await transaction.get(attemptRef)).data()!;
      if (attempt.claimVersion !== claim.version) {
        throw new RedeemOwnershipClaimError('CLAIM_INTEGRITY_ERROR');
      }
    }
    const businessId = typeof claim.businessId === 'string' ? claim.businessId : '';
    const applicationId = typeof claim.applicationId === 'string' ? claim.applicationId : '';
    if (!businessId || !applicationId || !safeHashEqual(claim.tokenHash, tokenHash)) {
      throw new RedeemOwnershipClaimError('CLAIM_INTEGRITY_ERROR');
    }

    const guardRef = db.collection(OWNERSHIP_CLAIM_GUARDS_COLLECTION).doc(businessId);
    const businessRef = db.collection('businesses').doc(businessId);
    const applicationRef = db.collection('applications').doc(applicationId);
    const [guardSnapshot, businessSnapshot, applicationSnapshot] = await Promise.all([
      transaction.get(guardRef),
      transaction.get(businessRef),
      transaction.get(applicationRef),
    ]);
    if (!guardSnapshot.exists || !businessSnapshot.exists || !applicationSnapshot.exists) {
      throw new RedeemOwnershipClaimError('CLAIM_INTEGRITY_ERROR');
    }

    const guard = guardSnapshot.data() || {};
    const business = businessSnapshot.data() || {};
    const application = applicationSnapshot.data() || {};
    const claimVersion = Number(claim.version);
    const guardVersion = Number(guard.version);
    const claimEmail = typeof claim.emailNormalized === 'string' ? claim.emailNormalized : '';
    const expiresAt = asDate(claim.expiresAt);

    if (claimEmail !== identity.emailNormalized) {
      throw new RedeemOwnershipClaimError('CLAIM_EMAIL_MISMATCH');
    }

    if (claim.status === 'consumed') {
      if (
        claim.consumedByUid === identity.uid &&
        business.ownerId === identity.uid &&
        guard.consumedClaimId === claimRef.id &&
        guard.businessId === businessId &&
        guardVersion === claimVersion
      ) {
        if (attemptRef) transaction.update(attemptRef, { status: 'completed', completedAt: now });
        return { businessId, idempotent: true };
      }
      throw new RedeemOwnershipClaimError('CLAIM_ALREADY_USED');
    }
    if (claim.status === 'revoked') throw new RedeemOwnershipClaimError('CLAIM_REVOKED');
    if (claim.status === 'expired' || !expiresAt || expiresAt.getTime() <= now.getTime()) {
      throw new RedeemOwnershipClaimError('CLAIM_EXPIRED');
    }
    if (claim.status !== 'active') throw new RedeemOwnershipClaimError('CLAIM_INVALID');
    if (
      Object.prototype.hasOwnProperty.call(business, 'ownerId') ||
      Object.prototype.hasOwnProperty.call(business, 'ownerUid')
    ) {
      throw new RedeemOwnershipClaimError('BUSINESS_ALREADY_CLAIMED');
    }

    let applicationEmail: string;
    try {
      applicationEmail = normalizeClaimEmail(String(application.ownerEmail || ''));
    } catch {
      throw new RedeemOwnershipClaimError('CLAIM_INTEGRITY_ERROR');
    }
    if (
      guard.businessId !== businessId ||
      guard.activeClaimId !== claimRef.id ||
      guardVersion !== claimVersion ||
      application.schemaVersion !== 2 ||
      application.status !== 'approved' ||
      application.businessId !== businessId ||
      applicationEmail !== claimEmail ||
      business.sourceApplicationId !== applicationId ||
      business.applicationSchemaVersion !== 2
    ) {
      throw new RedeemOwnershipClaimError('CLAIM_INTEGRITY_ERROR');
    }

    transaction.update(businessRef, { ownerId: identity.uid, updatedAt: now });
    if (attemptRef) transaction.update(attemptRef, { status: 'completed', completedAt: now });
    transaction.update(claimRef, {
      status: 'consumed',
      consumedAt: now,
      consumedByUid: identity.uid,
      updatedAt: now,
    });
    transaction.update(guardRef, {
      activeClaimId: null,
      consumedClaimId: claimRef.id,
      consumedAt: now,
      consumedByUid: identity.uid,
      updatedAt: now,
    });
    transaction.create(auditRef, {
      event: 'ownership_claim_consumed',
      businessId,
      applicationId,
      claimId: claimRef.id,
      claimVersion,
      actorUid: identity.uid,
      occurredAt: now,
    });

    return { businessId, idempotent: false };
  });
}
