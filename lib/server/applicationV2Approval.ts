import { randomBytes } from 'node:crypto';

import {
  ApplicationV2Schema,
  type ApplicationV2,
  type OwnershipInvitationStatus,
} from '../applications/applicationV2';
import {
  OWNERSHIP_CLAIMS_ENABLED,
  PUBLIC_APPLICATION_V2_ENABLED,
} from '../featureFlags';
import { getAdminFirestore } from './firebaseAdmin';
import {
  OWNERSHIP_CLAIMS_COLLECTION,
  OWNERSHIP_CLAIM_GUARDS_COLLECTION,
  buildOwnershipClaimRecord,
  normalizeClaimEmail,
  prepareOwnershipClaim,
} from './ownershipClaims';

export const OWNERSHIP_INVITATION_OUTBOX_COLLECTION = 'ownershipInvitationOutbox' as const;
export const OWNERSHIP_CLAIM_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

export type OwnershipInvitationOutboxStatus =
  | 'pending'
  | 'sending'
  | 'delivered'
  | 'failed';

export type OwnershipInvitationOutboxRecord = {
  kind: 'ownership_claim_invitation_v1';
  status: OwnershipInvitationOutboxStatus;
  applicationId: string;
  businessId: string;
  claimId: string;
  claimVersion: number;
  emailNormalized: string;
  attemptCount: number;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  deliveryAttemptId?: string;
  deliveryLeaseExpiresAt?: Date;
  deliveredAt?: Date;
  failedAt?: Date;
  failureCode?: string;
  supersededAt?: Date;
};

export type ApplicationV2ApprovalResult = {
  created: boolean;
  applicationId: string;
  businessId: string;
  claimId: string | null;
  outboxId: string | null;
  invitationStatus: OwnershipInvitationStatus;
  /** Secreto efímero: sólo lo consume el orquestador servidor inmediatamente tras el commit. */
  token: string | null;
};

export type ApplicationV2ApprovalOptions = {
  db?: ReturnType<typeof getAdminFirestore>;
  now?: Date;
  publicApplicationV2Enabled?: boolean;
  ownershipClaimsEnabled?: boolean;
  businessId?: string;
  claimId?: string;
  outboxId?: string;
  claimLifetimeMs?: number;
};

function requiredId(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized || normalized.length > 128 || normalized.includes('/')) {
    throw new Error(`${field}_INVALID`);
  }
  return normalized;
}

function assertRolloutEnabled(options: ApplicationV2ApprovalOptions): void {
  const publicEnabled = options.publicApplicationV2Enabled ?? PUBLIC_APPLICATION_V2_ENABLED;
  const claimsEnabled = options.ownershipClaimsEnabled ?? OWNERSHIP_CLAIMS_ENABLED;
  if (!publicEnabled) throw new Error('PUBLIC_APPLICATION_V2_DISABLED');
  if (!claimsEnabled) throw new Error('OWNERSHIP_CLAIMS_DISABLED');
}

function parseApplicationV2(data: Record<string, unknown>): ApplicationV2 {
  if (data.schemaVersion !== 2) {
    throw new Error('APPLICATION_SCHEMA_VERSION_UNSUPPORTED');
  }
  const parsed = ApplicationV2Schema.safeParse(data);
  if (!parsed.success) throw new Error('APPLICATION_V2_INVALID');
  if ('ownerId' in data || 'ownerUid' in data) {
    throw new Error('APPLICATION_V2_OWNERSHIP_FIELDS_FORBIDDEN');
  }
  return parsed.data;
}

function nextClaimVersion(guardData: Record<string, unknown> | undefined, claimDocs: any[]): number {
  const versions = claimDocs.map((doc) => Number(doc.data()?.version) || 0);
  return Math.max(Number(guardData?.version) || 0, 0, ...versions) + 1;
}

function buildOwnerlessBusiness(applicationId: string, application: ApplicationV2, now: Date) {
  const source = application.business;
  const business: Record<string, unknown> = {
    name: source.businessName,
    category: source.category || '',
    categoryId: source.categoryId || '',
    categoryGroupId: source.categoryGroupId || '',
    description: source.description || '',
    address: source.address || '',
    colonia: source.colonia || '',
    municipio: source.municipio || '',
    phone: source.phone || application.ownerPhone,
    WhatsApp: source.whatsapp || '',
    Facebook: source.facebookPage || '',
    instagramUser: source.instagramUser || '',
    emailContact: source.emailContact || application.ownerEmail,
    website: source.website || '',
    hours: source.hours || '',
    horarios: source.horarios || {},
    gallery: source.gallery || [],
    hasEnvio: source.hasEnvio === true,
    envioCost: source.envioCost || '',
    envioInfo: source.envioInfo || '',
    location: source.location || null,
    contactName: application.ownerName,
    contactEmail: application.ownerEmail,
    contactPhone: application.ownerPhone,
    sourceApplicationId: applicationId,
    applicationSchemaVersion: 2,
    status: 'draft',
    businessStatus: 'draft',
    applicationStatus: 'approved',
    adminStatus: 'active',
    visibility: 'hidden',
    isActive: true,
    plan: 'free',
    featured: false,
    isOpen: 'si',
    rating: 0,
    createdAt: now,
    updatedAt: now,
  };

  // ownerId/ownerUid se omiten deliberadamente. El email de contacto no es ownership.
  return business;
}

async function readExistingApproval(
  transaction: any,
  db: ReturnType<typeof getAdminFirestore>,
  applicationId: string,
  application: ApplicationV2,
): Promise<ApplicationV2ApprovalResult> {
  if (!application.businessId) throw new Error('APPROVAL_INTEGRITY_ERROR');
  if (!application.ownershipInvitationOutboxId) throw new Error('APPROVAL_INTEGRITY_ERROR');
  const businessRef = db.collection('businesses').doc(application.businessId);
  const outboxRef = db
    .collection(OWNERSHIP_INVITATION_OUTBOX_COLLECTION)
    .doc(application.ownershipInvitationOutboxId);
  const [businessSnapshot, outboxSnapshot] = await Promise.all([
    transaction.get(businessRef),
    transaction.get(outboxRef),
  ]);
  if (!businessSnapshot.exists || !outboxSnapshot.exists) {
    throw new Error('APPROVAL_INTEGRITY_ERROR');
  }
  const business = businessSnapshot.data() || {};
  const outbox = outboxSnapshot.data() || {};
  if (business.sourceApplicationId !== applicationId) throw new Error('APPROVAL_INTEGRITY_ERROR');
  if (business.ownerId || business.ownerUid) throw new Error('APPROVAL_OWNER_ASSIGNED_PREMATURELY');
  if (
    outbox.applicationId !== applicationId ||
    outbox.businessId !== application.businessId ||
    typeof outbox.claimId !== 'string' ||
    !['pending', 'sending', 'delivered', 'failed'].includes(String(outbox.status))
  ) {
    throw new Error('APPROVAL_INTEGRITY_ERROR');
  }

  const claimRef = db.collection(OWNERSHIP_CLAIMS_COLLECTION).doc(outbox.claimId);
  const guardRef = db.collection(OWNERSHIP_CLAIM_GUARDS_COLLECTION).doc(application.businessId);
  const [claimSnapshot, guardSnapshot] = await Promise.all([
    transaction.get(claimRef),
    transaction.get(guardRef),
  ]);
  if (!claimSnapshot.exists || !guardSnapshot.exists) throw new Error('APPROVAL_INTEGRITY_ERROR');
  const claim = claimSnapshot.data() || {};
  const guard = guardSnapshot.data() || {};
  if (
    claim.status !== 'active' ||
    claim.businessId !== application.businessId ||
    claim.applicationId !== applicationId ||
    claim.emailNormalized !== normalizeClaimEmail(application.ownerEmail) ||
    outbox.emailNormalized !== claim.emailNormalized ||
    Number(outbox.claimVersion) !== Number(claim.version) ||
    guard.businessId !== application.businessId ||
    guard.activeClaimId !== outbox.claimId ||
    Number(guard.version) !== Number(claim.version)
  ) {
    throw new Error('APPROVAL_INTEGRITY_ERROR');
  }

  return {
    created: false,
    applicationId,
    businessId: application.businessId,
    claimId: outbox.claimId,
    outboxId: application.ownershipInvitationOutboxId || null,
    invitationStatus: application.ownershipInvitationStatus || 'pending',
    token: null,
  };
}

/**
 * Aprobación v2 atómica: application + business ownerless + claim + outbox.
 * No autentica por sí misma; todos los entry points deben validar admin antes de llamarla.
 */
export async function approveApplicationV2Transaction(
  applicationIdInput: string,
  approvedByInput: string,
  options: ApplicationV2ApprovalOptions = {},
): Promise<ApplicationV2ApprovalResult> {
  assertRolloutEnabled(options);
  const applicationId = requiredId(applicationIdInput, 'APPLICATION_ID');
  const approvedBy = requiredId(approvedByInput, 'APPROVED_BY');
  const now = options.now ?? new Date();
  const db = options.db ?? getAdminFirestore();
  const applicationRef = db.collection('applications').doc(applicationId);
  const initialSnapshot = await applicationRef.get();
  if (!initialSnapshot.exists) throw new Error('APPLICATION_NOT_FOUND');
  const initialApplication = parseApplicationV2(initialSnapshot.data() || {});
  if (initialApplication.status === 'approved') {
    return db.runTransaction(async (transaction) => {
      const currentSnapshot = await transaction.get(applicationRef);
      if (!currentSnapshot.exists) throw new Error('APPLICATION_NOT_FOUND');
      const currentApplication = parseApplicationV2(currentSnapshot.data() || {});
      if (currentApplication.status !== 'approved') {
        throw new Error('APPLICATION_V2_STATUS_NOT_APPROVABLE');
      }
      return readExistingApproval(transaction, db, applicationId, currentApplication);
    });
  }
  if (initialApplication.status !== 'submitted' || initialApplication.businessId !== null) {
    throw new Error('APPLICATION_V2_STATUS_NOT_APPROVABLE');
  }
  const businessRef = options.businessId
    ? db.collection('businesses').doc(options.businessId)
    : db.collection('businesses').doc();
  const claimRef = options.claimId
    ? db.collection(OWNERSHIP_CLAIMS_COLLECTION).doc(options.claimId)
    : db.collection(OWNERSHIP_CLAIMS_COLLECTION).doc();
  const guardRef = db.collection(OWNERSHIP_CLAIM_GUARDS_COLLECTION).doc(businessRef.id);
  const outboxRef = options.outboxId
    ? db.collection(OWNERSHIP_INVITATION_OUTBOX_COLLECTION).doc(options.outboxId)
    : db.collection(OWNERSHIP_INVITATION_OUTBOX_COLLECTION).doc();
  const preparedClaim = prepareOwnershipClaim(
    {
      businessId: businessRef.id,
      applicationId,
      email: initialApplication.ownerEmail,
      expiresAt: new Date(now.getTime() + (options.claimLifetimeMs ?? OWNERSHIP_CLAIM_LIFETIME_MS)),
    },
    { now, enabled: options.ownershipClaimsEnabled ?? OWNERSHIP_CLAIMS_ENABLED },
  );

  return db.runTransaction(async (transaction) => {
    const applicationSnapshot = await transaction.get(applicationRef);
    if (!applicationSnapshot.exists) throw new Error('APPLICATION_NOT_FOUND');
    const application = parseApplicationV2(applicationSnapshot.data() || {});

    if (application.status === 'approved') {
      return readExistingApproval(transaction, db, applicationId, application);
    }
    if (application.status !== 'submitted' || application.businessId !== null) {
      throw new Error('APPLICATION_V2_STATUS_NOT_APPROVABLE');
    }

    const emailNormalized = normalizeClaimEmail(application.ownerEmail);
    if (emailNormalized !== preparedClaim.emailNormalized) {
      throw new Error('APPLICATION_V2_CHANGED_DURING_APPROVAL');
    }
    const [guardSnapshot, claimsSnapshot, linkedBusinessesSnapshot] = await Promise.all([
      transaction.get(guardRef),
      transaction.get(db.collection(OWNERSHIP_CLAIMS_COLLECTION).where('businessId', '==', businessRef.id)),
      transaction.get(db.collection('businesses').where('sourceApplicationId', '==', applicationId)),
    ]);
    if ((linkedBusinessesSnapshot.docs || []).length > 0) {
      throw new Error('APPROVAL_INTEGRITY_ERROR');
    }
    const claimDocs = claimsSnapshot.docs || [];
    const version = nextClaimVersion(guardSnapshot.data?.(), claimDocs);

    for (const existingClaim of claimDocs) {
      if (existingClaim.data()?.status !== 'active') continue;
      transaction.update(existingClaim.ref, {
        status: 'revoked',
        revokedAt: now,
        revokedReason: 'reissued',
        updatedAt: now,
      });
    }

    transaction.create(businessRef, buildOwnerlessBusiness(applicationId, application, now));
    transaction.create(claimRef, buildOwnershipClaimRecord(preparedClaim, version));
    transaction.set(guardRef, {
      businessId: businessRef.id,
      activeClaimId: claimRef.id,
      version,
      updatedAt: now,
    });
    transaction.create(outboxRef, {
      kind: 'ownership_claim_invitation_v1',
      status: 'pending',
      applicationId,
      businessId: businessRef.id,
      claimId: claimRef.id,
      claimVersion: version,
      emailNormalized,
      attemptCount: 0,
      createdAt: now,
      updatedAt: now,
      expiresAt: preparedClaim.expiresAt,
    } satisfies OwnershipInvitationOutboxRecord);
    transaction.update(applicationRef, {
      status: 'approved',
      businessId: businessRef.id,
      approvedAt: now,
      approvedBy,
      updatedAt: now,
      ownershipInvitationStatus: 'pending',
      ownershipInvitationOutboxId: outboxRef.id,
      ownershipInvitationUpdatedAt: now,
    });

    return {
      created: true,
      applicationId,
      businessId: businessRef.id,
      claimId: claimRef.id,
      outboxId: outboxRef.id,
      invitationStatus: 'pending',
      token: preparedClaim.token,
    };
  });
}

/** Reemite un claim y outbox nuevos; el negocio y la application aprobada se reutilizan. */
export async function reissueOwnershipInvitationV2Transaction(
  applicationIdInput: string,
  requestedByInput: string,
  options: ApplicationV2ApprovalOptions = {},
): Promise<ApplicationV2ApprovalResult> {
  assertRolloutEnabled(options);
  const applicationId = requiredId(applicationIdInput, 'APPLICATION_ID');
  const requestedBy = requiredId(requestedByInput, 'REQUESTED_BY');
  const now = options.now ?? new Date();
  const db = options.db ?? getAdminFirestore();
  const applicationRef = db.collection('applications').doc(applicationId);
  const initialSnapshot = await applicationRef.get();
  if (!initialSnapshot.exists) throw new Error('APPLICATION_NOT_FOUND');
  const initialApplication = parseApplicationV2(initialSnapshot.data() || {});
  if (initialApplication.status !== 'approved' || !initialApplication.businessId) {
    throw new Error('APPLICATION_V2_NOT_APPROVED');
  }

  const businessId = initialApplication.businessId;
  const businessRef = db.collection('businesses').doc(businessId);
  const claimRef = options.claimId
    ? db.collection(OWNERSHIP_CLAIMS_COLLECTION).doc(options.claimId)
    : db.collection(OWNERSHIP_CLAIMS_COLLECTION).doc();
  const guardRef = db.collection(OWNERSHIP_CLAIM_GUARDS_COLLECTION).doc(businessId);
  const outboxRef = options.outboxId
    ? db.collection(OWNERSHIP_INVITATION_OUTBOX_COLLECTION).doc(options.outboxId)
    : db.collection(OWNERSHIP_INVITATION_OUTBOX_COLLECTION).doc();
  const preparedClaim = prepareOwnershipClaim(
    {
      businessId,
      applicationId,
      email: initialApplication.ownerEmail,
      expiresAt: new Date(now.getTime() + (options.claimLifetimeMs ?? OWNERSHIP_CLAIM_LIFETIME_MS)),
    },
    { now, enabled: options.ownershipClaimsEnabled ?? OWNERSHIP_CLAIMS_ENABLED },
  );

  return db.runTransaction(async (transaction) => {
    const applicationSnapshot = await transaction.get(applicationRef);
    if (!applicationSnapshot.exists) throw new Error('APPLICATION_NOT_FOUND');
    const application = parseApplicationV2(applicationSnapshot.data() || {});
    if (application.status !== 'approved' || application.businessId !== businessId) {
      throw new Error('APPLICATION_V2_NOT_APPROVED');
    }

    const previousOutboxRef = application.ownershipInvitationOutboxId
      ? db.collection(OWNERSHIP_INVITATION_OUTBOX_COLLECTION).doc(application.ownershipInvitationOutboxId)
      : null;
    const [businessSnapshot, guardSnapshot, claimsSnapshot, previousOutboxSnapshot] = await Promise.all([
      transaction.get(businessRef),
      transaction.get(guardRef),
      transaction.get(db.collection(OWNERSHIP_CLAIMS_COLLECTION).where('businessId', '==', businessId)),
      previousOutboxRef ? transaction.get(previousOutboxRef) : Promise.resolve(null),
    ]);
    if (!businessSnapshot.exists) throw new Error('APPROVAL_INTEGRITY_ERROR');
    const business = businessSnapshot.data() || {};
    if (business.sourceApplicationId !== applicationId) throw new Error('APPROVAL_INTEGRITY_ERROR');
    if (business.ownerId || business.ownerUid) throw new Error('CLAIM_BUSINESS_ALREADY_OWNED');
    if (normalizeClaimEmail(application.ownerEmail) !== preparedClaim.emailNormalized) {
      throw new Error('CLAIM_APPLICATION_EMAIL_MISMATCH');
    }

    const claimDocs = claimsSnapshot.docs || [];
    const version = nextClaimVersion(guardSnapshot.data?.(), claimDocs);
    for (const existingClaim of claimDocs) {
      if (existingClaim.data()?.status !== 'active') continue;
      transaction.update(existingClaim.ref, {
        status: 'revoked',
        revokedAt: now,
        revokedReason: 'reissued',
        updatedAt: now,
      });
    }
    if (previousOutboxRef && previousOutboxSnapshot?.exists) {
      const previousOutbox = previousOutboxSnapshot.data() || {};
      const leaseExpiresAt = previousOutbox.deliveryLeaseExpiresAt instanceof Date
        ? previousOutbox.deliveryLeaseExpiresAt
        : previousOutbox.deliveryLeaseExpiresAt?.toDate?.();
      if (
        previousOutbox.status === 'sending' &&
        (!(leaseExpiresAt instanceof Date) || leaseExpiresAt.getTime() > now.getTime())
      ) {
        throw new Error('INVITATION_DELIVERY_IN_PROGRESS');
      }
      transaction.update(previousOutboxRef, {
        supersededAt: now,
        updatedAt: now,
        ...(previousOutbox.status === 'delivered'
          ? {}
          : { status: 'failed', failureCode: 'CLAIM_REISSUED' }),
      });
    }

    transaction.create(claimRef, buildOwnershipClaimRecord(preparedClaim, version));
    transaction.set(guardRef, {
      businessId,
      activeClaimId: claimRef.id,
      version,
      updatedAt: now,
    });
    transaction.create(outboxRef, {
      kind: 'ownership_claim_invitation_v1',
      status: 'pending',
      applicationId,
      businessId,
      claimId: claimRef.id,
      claimVersion: version,
      emailNormalized: preparedClaim.emailNormalized,
      attemptCount: 0,
      createdAt: now,
      updatedAt: now,
      expiresAt: preparedClaim.expiresAt,
    } satisfies OwnershipInvitationOutboxRecord);
    transaction.update(applicationRef, {
      ownershipInvitationStatus: 'pending',
      ownershipInvitationOutboxId: outboxRef.id,
      ownershipInvitationUpdatedAt: now,
      ownershipInvitationFailureCode: null,
      invitationReissuedAt: now,
      invitationReissuedBy: requestedBy,
      updatedAt: now,
    });

    return {
      created: false,
      applicationId,
      businessId,
      claimId: claimRef.id,
      outboxId: outboxRef.id,
      invitationStatus: 'pending',
      token: preparedClaim.token,
    };
  });
}

export function generateOwnershipInvitationDeliveryAttemptId(): string {
  return randomBytes(16).toString('base64url');
}
