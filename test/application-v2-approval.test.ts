import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import {
  approveApplicationV2Transaction,
  reissueOwnershipInvitationV2Transaction,
} from '../lib/server/applicationV2Approval';
import {
  approveAndDeliverApplicationV2,
  reissueAndDeliverOwnershipInvitationV2,
} from '../lib/server/applicationV2ApprovalWorkflow';
import { hashOwnershipClaimToken } from '../lib/server/ownershipClaims';

type DocumentRecord = Record<string, unknown>;
type DocumentReference = {
  kind: 'doc';
  collection: string;
  id: string;
  get(): Promise<DocumentSnapshot>;
};
type QueryReference = {
  kind: 'query';
  collection: string;
  field: string;
  value: unknown;
};
type DocumentSnapshot = {
  exists: boolean;
  id: string;
  ref: DocumentReference;
  data(): DocumentRecord | undefined;
};

function clone<T>(value: T): T {
  return structuredClone(value);
}

function createApprovalDb(applicationOverrides: DocumentRecord = {}) {
  const documents = new Map<string, DocumentRecord>();
  const counters = new Map<string, number>();
  let transactionTail = Promise.resolve();

  const applicationId = 'application-random-v2';
  documents.set(`applications/${applicationId}`, {
    schemaVersion: 2,
    status: 'submitted',
    businessId: null,
    publicReference: 'YJG-2026-ABC2345678',
    ownerEmail: 'contacto@example.com',
    ownerName: 'Persona responsable',
    ownerPhone: '9191234567',
    business: {
      businessName: 'Café seguro',
      category: 'Cafetería',
      categoryId: 'cafeteria',
      categoryGroupId: 'alimentos',
      phone: '9197654321',
      whatsapp: '9197654321',
    },
    createdAt: new Date('2026-09-02T12:00:00.000Z'),
    updatedAt: new Date('2026-09-02T12:00:00.000Z'),
    ...applicationOverrides,
  });

  const makeRef = (collection: string, id: string): DocumentReference => {
    const reference: DocumentReference = {
      kind: 'doc',
      collection,
      id,
      async get() {
        return snapshot(reference);
      },
    };
    return reference;
  };

  const snapshot = (reference: DocumentReference): DocumentSnapshot => {
    const stored = documents.get(`${reference.collection}/${reference.id}`);
    return {
      exists: Boolean(stored),
      id: reference.id,
      ref: reference,
      data: () => stored ? clone(stored) : undefined,
    };
  };

  const db: any = {
    collection(name: string) {
      return {
        doc(id?: string) {
          const next = (counters.get(name) || 0) + 1;
          if (!id) counters.set(name, next);
          return makeRef(name, id || `${name}-${next}`);
        },
        where(field: string, operator: string, value: unknown): QueryReference {
          if (operator !== '==') throw new Error('Unsupported fake query');
          return { kind: 'query', collection: name, field, value };
        },
      };
    },
    async runTransaction<T>(callback: (transaction: any) => Promise<T>): Promise<T> {
      const previous = transactionTail;
      let release!: () => void;
      transactionTail = new Promise<void>((resolveTransaction) => {
        release = resolveTransaction;
      });
      await previous;
      const operations: Array<() => void> = [];
      try {
        const transaction = {
          async get(target: DocumentReference | QueryReference) {
            if (target.kind === 'doc') return snapshot(target);
            const docs: DocumentSnapshot[] = [];
            for (const [path, data] of documents) {
              const [collection, id] = path.split('/');
              if (collection === target.collection && data[target.field] === target.value) {
                docs.push(snapshot(makeRef(collection, id)));
              }
            }
            return { docs };
          },
          create(reference: DocumentReference, data: DocumentRecord) {
            operations.push(() => {
              const path = `${reference.collection}/${reference.id}`;
              if (documents.has(path)) throw new Error(`ALREADY_EXISTS:${path}`);
              documents.set(path, clone(data));
            });
          },
          set(reference: DocumentReference, data: DocumentRecord) {
            operations.push(() => documents.set(`${reference.collection}/${reference.id}`, clone(data)));
          },
          update(reference: DocumentReference, updates: DocumentRecord) {
            operations.push(() => {
              const path = `${reference.collection}/${reference.id}`;
              const current = documents.get(path);
              if (!current) throw new Error(`NOT_FOUND:${path}`);
              documents.set(path, { ...current, ...clone(updates) });
            });
          },
        };
        const result = await callback(transaction);
        operations.forEach((operation) => operation());
        return result;
      } finally {
        release();
      }
    },
  };

  const collection = (name: string) => [...documents.entries()]
    .filter(([path]) => path.startsWith(`${name}/`))
    .map(([path, data]) => ({ id: path.slice(name.length + 1), data: clone(data) }));

  return { applicationId, collection, db, documents };
}

const enabledOptions = {
  publicApplicationV2Enabled: true,
  ownershipClaimsEnabled: true,
  now: new Date('2026-09-03T12:00:00.000Z'),
  baseUrl: 'https://yajagon.example',
};

function source(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
}

describe('0.2R.3 atomic v2 approval', () => {
  it('requires admin authorization at every application-facing entry point', () => {
    const actions = source('app/actions/adminBusinessActions.ts');
    const legacyAction = source('app/actions/admin.ts');
    const legacyRoute = source('pages/api/admin/review-business.ts');
    expect(actions).toMatch(/approveApplicationV2[\s\S]*?assertAdminToken\(adminToken\)[\s\S]*?approveAndDeliverApplicationV2/);
    expect(actions).toMatch(/resendOwnershipInvitationV2[\s\S]*?assertAdminToken\(adminToken\)[\s\S]*?reissueAndDeliverOwnershipInvitationV2/);
    expect(legacyAction).toMatch(/adminUser = await verifyAdmin\(token\)[\s\S]*?approveAndDeliverApplicationV2/);
    expect(legacyRoute).toMatch(/verifyIdToken\(token\)[\s\S]*?approveAndDeliverApplicationV2/);
  });

  it('atomically creates one ownerless, hidden business, one claim and one outbox', async () => {
    const state = createApprovalDb();
    const result = await approveApplicationV2Transaction(state.applicationId, 'admin-uid', {
      ...enabledOptions,
      db: state.db,
      businessId: 'business-ownerless',
      claimId: 'claim-1',
      outboxId: 'outbox-1',
    });

    const applications = state.collection('applications');
    const businesses = state.collection('businesses');
    const claims = state.collection('ownershipClaims');
    const guards = state.collection('ownershipClaimGuards');
    const outboxes = state.collection('ownershipInvitationOutbox');
    expect(result.created).toBe(true);
    expect(applications[0].data).toMatchObject({
      status: 'approved',
      businessId: 'business-ownerless',
      approvedBy: 'admin-uid',
      ownershipInvitationStatus: 'pending',
    });
    expect(businesses).toHaveLength(1);
    expect(businesses[0].data).toMatchObject({
      sourceApplicationId: state.applicationId,
      businessStatus: 'draft',
      visibility: 'hidden',
      applicationStatus: 'approved',
    });
    expect(businesses[0].data).not.toHaveProperty('ownerId');
    expect(businesses[0].data).not.toHaveProperty('ownerUid');
    expect(businesses[0].data).not.toHaveProperty('ownerEmail');
    expect(businesses[0].data.contactEmail).toBe('contacto@example.com');
    expect(claims).toHaveLength(1);
    expect(claims[0].data).toMatchObject({
      businessId: 'business-ownerless',
      applicationId: state.applicationId,
      emailNormalized: 'contacto@example.com',
      status: 'active',
    });
    expect(claims[0].data.tokenHash).toBe(hashOwnershipClaimToken(result.token!));
    expect(guards[0].data).toMatchObject({ activeClaimId: 'claim-1', version: 1 });
    expect(outboxes[0].data).toMatchObject({ status: 'pending', claimId: 'claim-1' });
    expect(JSON.stringify([...state.documents.values()])).not.toContain(result.token!);
    expect(businesses[0].data.ownerId).not.toBe(state.applicationId);
  });

  it('is idempotent for repeated and concurrent approvals', async () => {
    const state = createApprovalDb();
    const options = { ...enabledOptions, db: state.db };
    const [first, second] = await Promise.all([
      approveApplicationV2Transaction(state.applicationId, 'admin-uid', options),
      approveApplicationV2Transaction(state.applicationId, 'admin-uid', options),
    ]);
    const third = await approveApplicationV2Transaction(state.applicationId, 'admin-uid', options);

    expect(new Set([first.businessId, second.businessId, third.businessId]).size).toBe(1);
    expect(state.collection('businesses')).toHaveLength(1);
    expect(state.collection('ownershipClaims').filter((claim) => claim.data.status === 'active')).toHaveLength(1);
    expect(state.collection('ownershipInvitationOutbox')).toHaveLength(1);
    expect([first.created, second.created].filter(Boolean)).toHaveLength(1);
    expect(third).toMatchObject({ created: false, token: null });
  });

  it('rejects unknown versions and non-approvable v2 states', async () => {
    const unknown = createApprovalDb({ schemaVersion: 99 });
    await expect(approveApplicationV2Transaction(unknown.applicationId, 'admin-uid', {
      ...enabledOptions,
      db: unknown.db,
    })).rejects.toThrow('APPLICATION_SCHEMA_VERSION_UNSUPPORTED');

    const rejected = createApprovalDb({ status: 'rejected' });
    await expect(approveApplicationV2Transaction(rejected.applicationId, 'admin-uid', {
      ...enabledOptions,
      db: rejected.db,
    })).rejects.toThrow('APPLICATION_V2_STATUS_NOT_APPROVABLE');
  });

  it('fails closed instead of hiding an approved-without-business or orphan-business inconsistency', async () => {
    const missingBusiness = createApprovalDb({
      status: 'approved',
      businessId: 'missing-business',
      approvedAt: new Date('2026-09-03T12:00:00.000Z'),
      approvedBy: 'admin-uid',
    });
    await expect(approveApplicationV2Transaction(missingBusiness.applicationId, 'admin-uid', {
      ...enabledOptions,
      db: missingBusiness.db,
    })).rejects.toThrow('APPROVAL_INTEGRITY_ERROR');

    const orphanBusiness = createApprovalDb();
    orphanBusiness.documents.set('businesses/orphan-business', {
      sourceApplicationId: orphanBusiness.applicationId,
      businessStatus: 'draft',
      visibility: 'hidden',
    });
    await expect(approveApplicationV2Transaction(orphanBusiness.applicationId, 'admin-uid', {
      ...enabledOptions,
      db: orphanBusiness.db,
    })).rejects.toThrow('APPROVAL_INTEGRITY_ERROR');
    expect(orphanBusiness.collection('businesses')).toHaveLength(1);
  });
});

describe('0.2R.3 invitation delivery and reissue', () => {
  it('sends only after the atomic approval has committed and never exposes the token in its result', async () => {
    const state = createApprovalDb();
    const sendMail = vi.fn(async (message: { html: string }) => {
      expect(state.collection('applications')[0].data.status).toBe('approved');
      expect(state.collection('businesses')).toHaveLength(1);
      expect(message.html).toContain('/reclamar-negocio#token=');
    });
    const result = await approveAndDeliverApplicationV2(state.applicationId, 'admin-uid', {
      ...enabledOptions,
      db: state.db,
      sendMail,
    });

    expect(result).toMatchObject({ ok: true, created: true, invitationStatus: 'delivered' });
    expect(result).not.toHaveProperty('token');
    expect(result).not.toHaveProperty('claimId');
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(state.collection('ownershipInvitationOutbox')[0].data.status).toBe('delivered');
    expect(state.collection('applications')[0].data.ownershipInvitationStatus).toBe('delivered');
  });

  it('records email failure without rolling back or duplicating the business', async () => {
    const state = createApprovalDb();
    const result = await approveAndDeliverApplicationV2(state.applicationId, 'admin-uid', {
      ...enabledOptions,
      db: state.db,
      sendMail: async () => { throw new Error('provider unavailable'); },
    });

    expect(result.invitationStatus).toBe('failed');
    expect(state.collection('businesses')).toHaveLength(1);
    expect(state.collection('applications')[0].data).toMatchObject({
      status: 'approved',
      ownershipInvitationStatus: 'failed',
    });
    expect(state.collection('ownershipInvitationOutbox')[0].data).toMatchObject({
      status: 'failed',
      failureCode: 'EMAIL_DELIVERY_FAILED',
    });
  });

  it('reissues a new claim, revokes the old one and keeps exactly one active claim', async () => {
    const state = createApprovalDb();
    const first = await approveApplicationV2Transaction(state.applicationId, 'admin-uid', {
      ...enabledOptions,
      db: state.db,
      businessId: 'business-ownerless',
      claimId: 'claim-1',
      outboxId: 'outbox-1',
    });
    const second = await reissueOwnershipInvitationV2Transaction(state.applicationId, 'admin-uid', {
      ...enabledOptions,
      db: state.db,
      claimId: 'claim-2',
      outboxId: 'outbox-2',
    });

    expect(second.token).not.toBe(first.token);
    const claims = state.collection('ownershipClaims');
    expect(claims).toHaveLength(2);
    expect(claims.filter((claim) => claim.data.status === 'active')).toHaveLength(1);
    expect(claims.find((claim) => claim.id === 'claim-1')?.data).toMatchObject({
      status: 'revoked',
      revokedReason: 'reissued',
    });
    expect(claims.find((claim) => claim.id === 'claim-2')?.data.version).toBe(2);
    expect(state.collection('ownershipClaimGuards')[0].data).toMatchObject({
      activeClaimId: 'claim-2',
      version: 2,
    });
    expect(JSON.stringify([...state.documents.values()])).not.toContain(second.token!);
  });

  it('delivers a reissued invitation without creating another business', async () => {
    const state = createApprovalDb();
    await approveAndDeliverApplicationV2(state.applicationId, 'admin-uid', {
      ...enabledOptions,
      db: state.db,
      sendMail: async () => { throw new Error('first failure'); },
    });
    const resend = await reissueAndDeliverOwnershipInvitationV2(state.applicationId, 'admin-uid', {
      ...enabledOptions,
      db: state.db,
      sendMail: async () => undefined,
    });

    expect(resend.invitationStatus).toBe('delivered');
    expect(state.collection('businesses')).toHaveLength(1);
    expect(state.collection('ownershipClaims').filter((claim) => claim.data.status === 'active')).toHaveLength(1);
    expect(state.collection('ownershipInvitationOutbox')).toHaveLength(2);
  });

  it('does not reissue while an email delivery lease is active', async () => {
    const state = createApprovalDb();
    await approveApplicationV2Transaction(state.applicationId, 'admin-uid', {
      ...enabledOptions,
      db: state.db,
      businessId: 'business-ownerless',
      claimId: 'claim-1',
      outboxId: 'outbox-1',
    });
    const outbox = state.documents.get('ownershipInvitationOutbox/outbox-1')!;
    state.documents.set('ownershipInvitationOutbox/outbox-1', {
      ...outbox,
      status: 'sending',
      deliveryLeaseExpiresAt: new Date('2026-09-03T12:05:00.000Z'),
    });

    await expect(reissueOwnershipInvitationV2Transaction(state.applicationId, 'admin-uid', {
      ...enabledOptions,
      db: state.db,
      claimId: 'claim-2',
      outboxId: 'outbox-2',
    })).rejects.toThrow('INVITATION_DELIVERY_IN_PROGRESS');
    expect(state.collection('ownershipClaims')).toHaveLength(1);
  });

  it('keeps claim collections and outbox server-only and exposes no redeem endpoint', () => {
    const rules = source('firestore.rules');
    expect(rules).toMatch(/match \/ownershipClaims\/\{claimId\}[\s\S]*?allow read, write: if false;/);
    expect(rules).toMatch(/match \/ownershipClaimGuards\/\{businessId\}[\s\S]*?allow read, write: if false;/);
    expect(rules).toMatch(/match \/ownershipInvitationOutbox\/\{outboxId\}[\s\S]*?allow read, write: if false;/);
    const routeFiles = source('app/reclamar-negocio/page.tsx');
    expect(routeFiles).not.toMatch(/issueOwnershipClaim|hashOwnershipClaimToken|updateDoc|setDoc|ownerId\s*=/);
    const approvalSources = [
      source('lib/server/applicationV2Approval.ts'),
      source('lib/server/applicationV2ApprovalWorkflow.ts'),
      source('lib/server/ownershipInvitationDelivery.ts'),
    ].join('\n');
    expect(approvalSources).not.toMatch(/console\.(log|warn|error)\([^\n]*token/i);
    expect(source('lib/featureFlags.ts')).toContain("process.env.OWNERSHIP_CLAIMS_ENABLED === 'true'");
  });

  it('keeps v1 approval code on its existing path', () => {
    const action = source('app/actions/admin.ts');
    expect(action).toContain('resolveApplicationOwnerId(applicationId, appData)');
    expect(action).toContain('await bizRef.set(payload, { merge: false })');
    expect(action).toContain('await appRef.delete()');
    expect(action).toMatch(
      /isApplicationV2\(appData\)[\s\S]*?appData\.status === 'approved'[\s\S]*?APPLICATION_V2_DELETE_REQUIRES_ARCHIVE/,
    );
  });
});
