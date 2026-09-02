import { createHash, randomBytes } from 'node:crypto';

import { OWNERSHIP_CLAIMS_ENABLED } from '../featureFlags';
import { getAdminFirestore } from './firebaseAdmin';

export const OWNERSHIP_CLAIMS_COLLECTION = 'ownershipClaims' as const;
export const OWNERSHIP_CLAIM_GUARDS_COLLECTION = 'ownershipClaimGuards' as const;
export const OWNERSHIP_CLAIM_TOKEN_BYTES = 32 as const;

export type OwnershipClaimStatus = 'active' | 'revoked' | 'consumed' | 'expired';

export type OwnershipClaimRecord = {
  businessId: string;
  applicationId: string;
  emailNormalized: string;
  tokenHash: string;
  status: OwnershipClaimStatus;
  expiresAt: Date;
  consumedAt: Date | null;
  consumedByUid: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  revokedAt?: Date;
  revokedReason?: 'reissued';
};

export type IssueOwnershipClaimInput = {
  businessId: string;
  applicationId: string;
  email: string;
  expiresAt: Date;
};

type OwnershipClaimOptions = {
  now?: Date;
  enabled?: boolean;
  db?: ReturnType<typeof getAdminFirestore>;
};

function requiredId(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized || normalized.length > 128 || normalized.includes('/')) {
    throw new Error(`${field}_INVALID`);
  }
  return normalized;
}

export function normalizeClaimEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  if (!normalized || normalized.length > 200 || !normalized.includes('@')) {
    throw new Error('CLAIM_EMAIL_INVALID');
  }
  return normalized;
}

export function generateOwnershipClaimToken(): string {
  return randomBytes(OWNERSHIP_CLAIM_TOKEN_BYTES).toString('base64url');
}

export function hashOwnershipClaimToken(token: string): string {
  if (!token) throw new Error('CLAIM_TOKEN_REQUIRED');
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

/**
 * Emite o reemite una concesión de claim dentro de una transacción Firestore.
 * No existe ruta de cliente para este helper en 0.2R.1.
 */
export async function issueOwnershipClaim(
  input: IssueOwnershipClaimInput,
  options: OwnershipClaimOptions = {},
) {
  const enabled = options.enabled ?? OWNERSHIP_CLAIMS_ENABLED;
  if (!enabled) throw new Error('OWNERSHIP_CLAIMS_DISABLED');

  const now = options.now ?? new Date();
  if (!(input.expiresAt instanceof Date) || input.expiresAt.getTime() <= now.getTime()) {
    throw new Error('CLAIM_EXPIRATION_INVALID');
  }

  const businessId = requiredId(input.businessId, 'BUSINESS_ID');
  const applicationId = requiredId(input.applicationId, 'APPLICATION_ID');
  const emailNormalized = normalizeClaimEmail(input.email);
  const token = generateOwnershipClaimToken();
  const tokenHash = hashOwnershipClaimToken(token);
  const db = options.db ?? getAdminFirestore();
  const claims = db.collection(OWNERSHIP_CLAIMS_COLLECTION);
  const claimRef = claims.doc();
  const guardRef = db.collection(OWNERSHIP_CLAIM_GUARDS_COLLECTION).doc(businessId);
  const businessRef = db.collection('businesses').doc(businessId);
  const applicationRef = db.collection('applications').doc(applicationId);

  let version = 1;
  await db.runTransaction(async (transaction) => {
    const [businessSnap, applicationSnap, guardSnap, existingClaims] = await Promise.all([
      transaction.get(businessRef),
      transaction.get(applicationRef),
      transaction.get(guardRef),
      transaction.get(claims.where('businessId', '==', businessId)),
    ]);

    if (!businessSnap.exists) throw new Error('CLAIM_BUSINESS_NOT_FOUND');
    if (businessSnap.data()?.ownerId) throw new Error('CLAIM_BUSINESS_ALREADY_OWNED');
    if (!applicationSnap.exists) throw new Error('CLAIM_APPLICATION_NOT_FOUND');
    const applicationData = applicationSnap.data() || {};
    if (applicationData.status !== 'approved') {
      throw new Error('CLAIM_APPLICATION_NOT_APPROVED');
    }
    if (applicationData.businessId !== businessId) {
      throw new Error('CLAIM_APPLICATION_BUSINESS_MISMATCH');
    }
    if (normalizeClaimEmail(String(applicationData.ownerEmail || '')) !== emailNormalized) {
      throw new Error('CLAIM_APPLICATION_EMAIL_MISMATCH');
    }

    const versions = existingClaims.docs.map((doc) => Number(doc.data().version) || 0);
    const guardVersion = guardSnap.exists ? Number(guardSnap.data()?.version) || 0 : 0;
    version = Math.max(guardVersion, 0, ...versions) + 1;

    for (const doc of existingClaims.docs) {
      if (doc.data().status !== 'active') continue;
      transaction.update(doc.ref, {
        status: 'revoked',
        revokedAt: now,
        revokedReason: 'reissued',
        updatedAt: now,
      });
    }

    const record: OwnershipClaimRecord = {
      businessId,
      applicationId,
      emailNormalized,
      tokenHash,
      status: 'active',
      expiresAt: input.expiresAt,
      consumedAt: null,
      consumedByUid: null,
      version,
      createdAt: now,
      updatedAt: now,
    };
    transaction.create(claimRef, record);
    transaction.set(guardRef, {
      businessId,
      activeClaimId: claimRef.id,
      version,
      updatedAt: now,
    });
  });

  // El secreto se devuelve una sola vez al llamador servidor y nunca forma parte del documento.
  return { claimId: claimRef.id, token, version };
}
