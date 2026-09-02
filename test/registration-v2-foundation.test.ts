import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  AnonymousApplicationV2InputSchema,
  ApplicationV2Schema,
  buildApplicationV2Record,
} from '../lib/applications/applicationV2';
import {
  assertSupportedApplicationVersion,
  getApplicationAdminQueue,
  getApplicationNotificationReference,
  resolveApplicationOwnerId,
  resolveLinkedApplicationId,
} from '../lib/applications/compatibility';
import { generateApplicationV2Id } from '../lib/server/applicationV2';
import {
  hashOwnershipClaimToken,
  issueOwnershipClaim,
} from '../lib/server/ownershipClaims';
import {
  EMAIL_LINK_AUTH_ENABLED,
  OWNERSHIP_CLAIMS_ENABLED,
  PUBLIC_APPLICATION_V2_ENABLED,
} from '../lib/featureFlags';
import { updateBusinessState } from '../lib/businessStates';

const v2Input = {
  ownerEmail: ' Contacto@Example.com ',
  ownerName: 'Persona responsable',
  ownerPhone: '9191234567',
  business: {
    businessName: 'Negocio v2',
    category: 'Comida',
  },
};

function source(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
}

type StoredClaim = { id: string; data: Record<string, any> };

function createClaimsDb(existing: StoredClaim[] = []) {
  const claims = existing.map((claim) => ({ ...claim, data: { ...claim.data } }));
  const guard: { data: Record<string, any> | null; version: number } = {
    data: null,
    version: 0,
  };
  let nextId = claims.length + 1;
  let commitTail = Promise.resolve();

  const reference = (collection: string, id: string) => ({ kind: 'doc', collection, id });
  const db: any = {
    collection(name: string) {
      return {
        doc(id?: string) {
          return reference(name, id ?? `claim-${nextId++}`);
        },
        where(field: string, operator: string, value: unknown) {
          return { kind: 'query', collection: name, field, operator, value };
        },
      };
    },
    async runTransaction<T>(callback: (transaction: any) => Promise<T>): Promise<T> {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        let readGuardVersion: number | null = null;
        const operations: Array<() => void> = [];
        const transaction = {
          async get(target: any) {
            if (target.kind === 'query') {
              const snapshot = claims
                .filter((claim) => claim.data[target.field] === target.value)
                .map((claim) => ({ id: claim.id, data: { ...claim.data } }));
              return {
                docs: snapshot.map((claim) => ({
                  ref: reference('ownershipClaims', claim.id),
                  data: () => claim.data,
                })),
              };
            }

            if (target.collection === 'businesses') {
              return { exists: true, data: () => ({ ownerEmail: 'contacto@example.com' }) };
            }
            if (target.collection === 'applications') {
              return {
                exists: true,
                data: () => ({
                  schemaVersion: 2,
                  status: 'approved',
                  businessId: 'business-v2',
                  ownerEmail: 'contacto@example.com',
                }),
              };
            }
            if (target.collection === 'ownershipClaimGuards') {
              readGuardVersion = guard.version;
              const snapshot = guard.data ? { ...guard.data } : null;
              return { exists: Boolean(snapshot), data: () => snapshot };
            }
            throw new Error('Unexpected transaction read');
          },
          update(target: any, updates: Record<string, unknown>) {
            operations.push(() => {
              const claim = claims.find((item) => item.id === target.id);
              if (!claim) throw new Error('Claim not found');
              Object.assign(claim.data, updates);
            });
          },
          create(target: any, record: Record<string, unknown>) {
            operations.push(() => {
              claims.push({ id: target.id, data: { ...record } });
            });
          },
          set(target: any, record: Record<string, unknown>) {
            operations.push(() => {
              if (target.collection !== 'ownershipClaimGuards') {
                throw new Error('Unexpected transaction set');
              }
              guard.data = { ...record };
              guard.version += 1;
            });
          },
        };

        const result = await callback(transaction);
        const previousCommit = commitTail;
        let releaseCommit!: () => void;
        commitTail = new Promise<void>((resolveCommit) => {
          releaseCommit = resolveCommit;
        });
        await previousCommit;
        try {
          if (readGuardVersion !== guard.version) continue;
          operations.forEach((operation) => operation());
          return result;
        } finally {
          releaseCommit();
        }
      }
      throw new Error('Transaction retry limit exceeded');
    },
  };

  return { db, claims, guard };
}

describe('0.2R.1 application v1/v2 compatibility', () => {
  it('keeps the legacy applications/{uid} owner fallback', () => {
    expect(resolveApplicationOwnerId('legacy-firebase-uid', { status: 'pending' })).toBe(
      'legacy-firebase-uid',
    );
    expect(
      resolveApplicationOwnerId('legacy-doc', { ownerId: 'existing-owner-uid' }),
    ).toBe('existing-owner-uid');
  });

  it('accepts a random v2 application ID without turning it into ownerId', () => {
    const applicationId = generateApplicationV2Id();
    expect(applicationId).toMatch(/^[A-Za-z0-9_-]{20,}$/);
    expect(
      resolveApplicationOwnerId(applicationId, {
        schemaVersion: 2,
        status: 'submitted',
        ownerEmail: 'same@example.com',
      }),
    ).toBeNull();
  });

  it('fails closed for unknown application schema versions', () => {
    const unknown = { schemaVersion: 99, ownerId: 'injected-owner' };
    expect(resolveApplicationOwnerId('random-document-id', unknown)).toBeNull();
    expect(resolveLinkedApplicationId({ applicationSchemaVersion: 99, ownerId: 'owner' })).toBeNull();
    expect(() => assertSupportedApplicationVersion(unknown)).toThrow(
      'APPLICATION_SCHEMA_VERSION_UNSUPPORTED',
    );
  });

  it('builds a strict ownerless application v2 record', () => {
    const now = new Date('2026-09-02T12:00:00.000Z');
    const record = buildApplicationV2Record(v2Input, now);

    expect(record).toMatchObject({
      schemaVersion: 2,
      status: 'submitted',
      businessId: null,
      ownerEmail: 'contacto@example.com',
      createdAt: now,
      updatedAt: now,
    });
    expect(record).not.toHaveProperty('ownerId');
    expect(record).not.toHaveProperty('ownerUid');
    expect(ApplicationV2Schema.safeParse(record).success).toBe(true);
    expect(
      ApplicationV2Schema.safeParse({
        ...record,
        status: 'needs_info',
        adminNotes: 'Falta información verificable',
        missingFields: ['dirección'],
        rejectionReason: 'Datos insuficientes',
      }).success,
    ).toBe(true);
    expect(
      AnonymousApplicationV2InputSchema.safeParse({ ...v2Input, ownerId: 'attacker' }).success,
    ).toBe(false);
  });

  it('preserves exact existing ownership and never derives it from ownerEmail', () => {
    expect(resolveLinkedApplicationId({ ownerId: 'existing-owner-uid' })).toBe(
      'existing-owner-uid',
    );
    expect(resolveLinkedApplicationId({ ownerEmail: 'owner@example.com' })).toBeNull();
    expect(
      resolveApplicationOwnerId('random-v2-id', {
        schemaVersion: 2,
        ownerEmail: 'owner@example.com',
      }),
    ).toBeNull();
  });

  it('keeps submitted v2 records in Nuevas regardless of profile completeness', () => {
    const completeBusiness: any = {
      applicationSchemaVersion: 2,
      applicationStatus: 'submitted',
      businessStatus: 'draft',
      name: 'Perfil completo',
      category: 'Comida',
      colonia: 'Centro',
      phone: '9191234567',
      description: 'Una descripción suficientemente larga para publicar el negocio.',
      horarios: { lunes: { abierto: true, desde: '09:00', hasta: '18:00' } },
    };

    expect(updateBusinessState(completeBusiness).applicationStatus).toBe('submitted');
    expect(getApplicationAdminQueue({ schemaVersion: 2, status: 'submitted' })).toBe('new');

    const v1State = updateBusinessState({ ...completeBusiness, applicationSchemaVersion: 1 });
    expect(v1State.applicationStatus).toBe('ready_for_review');
  });

  it('prepares notification references with exact IDs only', () => {
    expect(
      getApplicationNotificationReference('application-random', {
        businessId: 'business-exact',
        ownerEmail: 'shared@example.com',
      }),
    ).toEqual({ applicationId: 'application-random', businessId: 'business-exact' });
    expect(
      getApplicationNotificationReference('application-random', {
        ownerEmail: 'shared@example.com',
      }),
    ).toEqual({ applicationId: 'application-random', businessId: null });
  });

  it('keeps all rollout flags disabled by default and independent from monetization', () => {
    expect(PUBLIC_APPLICATION_V2_ENABLED).toBe(false);
    expect(OWNERSHIP_CLAIMS_ENABLED).toBe(false);
    expect(EMAIL_LINK_AUTH_ENABLED).toBe(false);
    expect(source('lib/featureFlags.ts')).not.toMatch(
      /PUBLIC_APPLICATION_V2_ENABLED\s*=\s*MONETIZATION_FEATURE_ENABLED/,
    );
  });
});

describe('0.2R.1 server-only ownership claim foundation', () => {
  it('stores only the token hash and never the raw token', async () => {
    const { db, claims } = createClaimsDb();
    const result = await issueOwnershipClaim(
      {
        businessId: 'business-v2',
        applicationId: 'application-v2',
        email: 'Contacto@Example.com',
        expiresAt: new Date('2026-09-10T00:00:00.000Z'),
      },
      {
        db,
        enabled: true,
        now: new Date('2026-09-02T00:00:00.000Z'),
      },
    );

    expect(result.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(claims).toHaveLength(1);
    expect(claims[0].data.tokenHash).toBe(hashOwnershipClaimToken(result.token));
    expect(claims[0].data).not.toHaveProperty('token');
    expect(JSON.stringify(claims[0].data)).not.toContain(result.token);
  });

  it('revokes the previous active claim when reissuing and leaves only one active', async () => {
    const { db, claims } = createClaimsDb();
    const input = {
      businessId: 'business-v2',
      applicationId: 'application-v2',
      email: 'contacto@example.com',
      expiresAt: new Date('2026-09-10T00:00:00.000Z'),
    };
    const options = {
      db,
      enabled: true,
      now: new Date('2026-09-02T00:00:00.000Z'),
    };

    await issueOwnershipClaim(input, options);
    const second = await issueOwnershipClaim(input, options);

    expect(second.version).toBe(2);
    expect(claims.filter((claim) => claim.data.status === 'active')).toHaveLength(1);
    expect(claims[0].data).toMatchObject({
      status: 'revoked',
      revokedReason: 'reissued',
    });
    expect(claims[1].data).toMatchObject({ status: 'active', version: 2 });
  });

  it('serializes concurrent first issuance through the deterministic business guard', async () => {
    const { db, claims, guard } = createClaimsDb();
    const input = {
      businessId: 'business-v2',
      applicationId: 'application-v2',
      email: 'contacto@example.com',
      expiresAt: new Date('2026-09-10T00:00:00.000Z'),
    };
    const options = {
      db,
      enabled: true,
      now: new Date('2026-09-02T00:00:00.000Z'),
    };

    const results = await Promise.all([
      issueOwnershipClaim(input, options),
      issueOwnershipClaim(input, options),
    ]);

    expect(results.map((result) => result.version).sort()).toEqual([1, 2]);
    expect(claims.filter((claim) => claim.data.status === 'active')).toHaveLength(1);
    expect(claims.filter((claim) => claim.data.status === 'revoked')).toHaveLength(1);
    expect(guard.data).toMatchObject({
      businessId: 'business-v2',
      version: 2,
    });
    const activeClaim = claims.find((claim) => claim.data.status === 'active');
    expect(guard.data?.activeClaimId).toBe(activeClaim?.id);
  });

  it('fails closed while claims are disabled', async () => {
    const { db } = createClaimsDb();
    await expect(
      issueOwnershipClaim(
        {
          businessId: 'business-v2',
          applicationId: 'application-v2',
          email: 'contacto@example.com',
          expiresAt: new Date('2026-09-10T00:00:00.000Z'),
        },
        { db, now: new Date('2026-09-02T00:00:00.000Z') },
      ),
    ).rejects.toThrow('OWNERSHIP_CLAIMS_DISABLED');
  });

  it('keeps claims inaccessible to clients and does not relax application rules', () => {
    const rules = source('firestore.rules');
    expect(rules).toMatch(
      /match \/ownershipClaims\/\{claimId\}[\s\S]*?allow read, write: if false;/,
    );
    expect(rules).toMatch(
      /match \/ownershipClaimGuards\/\{businessId\}[\s\S]*?allow read, write: if false;/,
    );
    expect(rules).toMatch(
      /match \/applications\/\{uid\}[\s\S]*?allow create: if isVerifiedEmail\(\)[\s\S]*?uid == request\.auth\.uid/,
    );
    expect(rules).not.toMatch(/match \/applications\/\{uid\}[\s\S]{0,500}allow create: if true/);
  });

  it('removes legacy random-ID-to-owner fallbacks and email business lookup', () => {
    const action = source('app/actions/admin.ts');
    const legacyRoute = source('pages/api/admin/review-business.ts');
    const functions = source('functions/src/emailNotifications.ts');

    expect(action).not.toContain('ownerId || applicationId');
    expect(legacyRoute).not.toMatch(/ownerId\s*\|\|\s*appData.*\|\|\s*businessId/);
    expect(functions).not.toMatch(/where\("ownerEmail",\s*"==",\s*after\.ownerEmail\)/);
  });
});
