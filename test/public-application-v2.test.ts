import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { NextRequest } from 'next/server';
import { describe, expect, it, vi } from 'vitest';

import { createPublicApplicationPostHandler } from '../app/api/public-applications/route';
import {
  beginApplicationV2NotificationDelivery,
  isAnonymousApplicationV2NotificationSource,
} from '../functions/src/notificationDelivery';
import { PublicApplicationSubmissionSchema } from '../lib/server/publicApplicationIntake';
import {
  generatePublicApplicationReference,
  PublicApplicationIntakeError,
  submitPublicApplicationV2,
} from '../lib/server/publicApplicationIntake';

const validInput = {
  ownerEmail: ' Contacto@Example.com ',
  ownerName: ' Persona responsable ',
  ownerPhone: '+52 (919) 123-4567',
  business: {
    businessName: ' Negocio anónimo ',
    category: 'Comida',
    categoryId: 'restaurant',
    categoryGroupId: 'food',
    phone: '919 123 4567',
    whatsapp: '+52 919 123 4567',
  },
  contactWebsite: '',
};

type Ref = { collection: string; id: string };

function createIntakeDb() {
  const documents = new Map<string, Record<string, any>>();
  let tail = Promise.resolve();
  const key = (reference: Ref) => `${reference.collection}/${reference.id}`;
  const db: any = {
    collection(collection: string) {
      return { doc: (id: string) => ({ collection, id }) };
    },
    runTransaction<T>(callback: (transaction: any) => Promise<T>): Promise<T> {
      const execute = async () => {
        const writes: Array<() => void> = [];
        const transaction = {
          async get(reference: Ref) {
            const data = documents.get(key(reference));
            return { exists: Boolean(data), data: () => data && { ...data } };
          },
          create(reference: Ref, data: Record<string, any>) {
            writes.push(() => {
              if (documents.has(key(reference))) throw new Error('ALREADY_EXISTS');
              documents.set(key(reference), { ...data });
            });
          },
          set(reference: Ref, data: Record<string, any>) {
            writes.push(() => documents.set(key(reference), { ...data }));
          },
        };
        const result = await callback(transaction);
        writes.forEach((write) => write());
        return result;
      };
      const result = tail.then(execute, execute);
      tail = result.then(() => undefined, () => undefined);
      return result;
    },
  };
  return { db, documents };
}

function applicationDocuments(documents: Map<string, Record<string, any>>) {
  return [...documents.entries()].filter(([path]) => path.startsWith('applications/'));
}

describe('0.2R.2 public application intake service', () => {
  it('generates a high-entropy human-safe public folio', () => {
    expect(generatePublicApplicationReference(new Date('2026-09-02T00:00:00.000Z')))
      .toMatch(/^YJG-2026-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{10}$/);
  });

  it('fails closed while the v2 flag is disabled', async () => {
    const { db, documents } = createIntakeDb();
    await expect(
      submitPublicApplicationV2(
        validInput,
        { idempotencyKey: 'disabled-request-0001', clientIdentifier: '127.0.0.1' },
        { db, enabled: false },
      ),
    ).rejects.toMatchObject({ code: 'PUBLIC_APPLICATION_V2_DISABLED' });
    expect(documents.size).toBe(0);
  });

  it('creates one normalized ownerless application and no user or business', async () => {
    const { db, documents } = createIntakeDb();
    const result = await submitPublicApplicationV2(
      validInput,
      { idempotencyKey: 'anonymous-request-0001', clientIdentifier: '203.0.113.10' },
      {
        db,
        enabled: true,
        now: new Date('2026-09-02T12:00:00.000Z'),
        applicationId: 'random-application-id',
        publicReference: 'YJG-2026-ABC23456',
      },
    );

    expect(result).toMatchObject({ accepted: true, duplicate: false, publicReference: 'YJG-2026-ABC23456' });
    expect(applicationDocuments(documents)).toHaveLength(1);
    const application = documents.get('applications/random-application-id');
    expect(application).toMatchObject({
      schemaVersion: 2,
      status: 'submitted',
      businessId: null,
      ownerEmail: 'contacto@example.com',
      ownerPhone: '+529191234567',
      publicReference: 'YJG-2026-ABC23456',
      business: {
        businessName: 'Negocio anónimo',
        phone: '9191234567',
        whatsapp: '+529191234567',
      },
    });
    expect(application).not.toHaveProperty('ownerId');
    expect(application).not.toHaveProperty('ownerUid');
    expect([...documents.keys()].some((path) => path.startsWith('businesses/'))).toBe(false);
    expect([...documents.keys()].some((path) => path.startsWith('users/'))).toBe(false);
  });

  it.each(['ownerId', 'ownerUid', 'status', 'businessId', 'approvedBy'])(
    'rejects the forbidden or unknown field %s',
    (field) => {
      expect(PublicApplicationSubmissionSchema.safeParse({ ...validInput, [field]: 'attacker' }).success).toBe(false);
    },
  );

  it('rejects business fields that are not part of the minimal public wizard', () => {
    expect(PublicApplicationSubmissionSchema.safeParse({
      ...validInput,
      business: { ...validInput.business, description: 'Campo fuera del intake mínimo' },
    }).success).toBe(false);
  });

  it('is concurrency-safe and returns the original folio for the same idempotency key', async () => {
    const { db, documents } = createIntakeDb();
    const context = { idempotencyKey: 'concurrent-request-0001', clientIdentifier: '203.0.113.11' };
    const [first, second] = await Promise.all([
      submitPublicApplicationV2(validInput, context, { db, enabled: true }),
      submitPublicApplicationV2(validInput, context, { db, enabled: true }),
    ]);

    expect(applicationDocuments(documents)).toHaveLength(1);
    expect(first.accepted && second.accepted && first.publicReference).toBe(second.accepted && second.publicReference);
    expect([first, second].filter((result) => result.accepted && result.duplicate)).toHaveLength(1);
  });

  it('rejects reuse of an idempotency key for a different payload', async () => {
    const { db } = createIntakeDb();
    const context = { idempotencyKey: 'reused-request-key-01', clientIdentifier: '203.0.113.12' };
    await submitPublicApplicationV2(validInput, context, { db, enabled: true });
    await expect(
      submitPublicApplicationV2(
        { ...validInput, business: { ...validInput.business, businessName: 'Otro negocio' } },
        context,
        { db, enabled: true },
      ),
    ).rejects.toMatchObject({ code: 'IDEMPOTENCY_KEY_REUSED' });
  });

  it('enforces a persistent rate limit across different idempotency keys', async () => {
    const { db, documents } = createIntakeDb();
    const clientIdentifier = '203.0.113.13';
    await submitPublicApplicationV2(validInput, { idempotencyKey: 'rate-request-key-001', clientIdentifier }, { db, enabled: true, rateLimit: 2 });
    await submitPublicApplicationV2(validInput, { idempotencyKey: 'rate-request-key-002', clientIdentifier }, { db, enabled: true, rateLimit: 2 });
    await expect(
      submitPublicApplicationV2(validInput, { idempotencyKey: 'rate-request-key-003', clientIdentifier }, { db, enabled: true, rateLimit: 2 }),
    ).rejects.toMatchObject({ code: 'RATE_LIMITED' });
    expect(applicationDocuments(documents)).toHaveLength(2);
  });

  it('drops honeypot submissions without persisting them', async () => {
    const { db, documents } = createIntakeDb();
    const result = await submitPublicApplicationV2(
      { ...validInput, contactWebsite: 'https://spam.example' },
      { idempotencyKey: 'honeypot-request-001', clientIdentifier: '203.0.113.14' },
      { db, enabled: true },
    );
    expect(result).toEqual({ accepted: false, honeypot: true });
    expect(documents.size).toBe(0);
  });

  it('supports a server challenge verifier without trusting a body boolean', async () => {
    const { db, documents } = createIntakeDb();
    await expect(
      submitPublicApplicationV2(
        validInput,
        { idempotencyKey: 'challenge-request-01', clientIdentifier: '203.0.113.15' },
        { db, enabled: true, challengeVerifier: { verify: vi.fn(async () => ({ ok: false })) } },
      ),
    ).rejects.toBeInstanceOf(PublicApplicationIntakeError);
    expect(documents.size).toBe(0);
  });
});

describe('0.2R.2 POST /api/public-applications', () => {
  it('is unavailable with the flag off', async () => {
    const submit = vi.fn();
    const handler = createPublicApplicationPostHandler({ enabled: false, submit });
    const response = await handler(new NextRequest('http://localhost/api/public-applications', { method: 'POST' }));
    expect(response.status).toBe(404);
    expect(submit).not.toHaveBeenCalled();
  });

  it('rejects oversized and unknown-field bodies before persistence', async () => {
    const submit = vi.fn();
    const handler = createPublicApplicationPostHandler({ enabled: true, submit });
    const oversized = await handler(new NextRequest('http://localhost/api/public-applications', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'content-length': '20001' },
      body: '{}',
    }));
    expect(oversized.status).toBe(413);

    const invalid = await handler(new NextRequest('http://localhost/api/public-applications', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'idempotency-key': 'route-request-key-001' },
      body: JSON.stringify({ ...validInput, ownerId: 'attacker' }),
    }));
    expect(invalid.status).toBe(400);
    expect(submit).not.toHaveBeenCalled();
  });

  it('returns only the safe folio and does not require auth credentials', async () => {
    const submit = vi.fn(async () => ({
      accepted: true as const,
      duplicate: false as const,
      applicationId: 'internal-random-id',
      publicReference: 'YJG-2026-SAFE2345',
    }));
    const handler = createPublicApplicationPostHandler({ enabled: true, submit });
    const response = await handler(new NextRequest('http://localhost/api/public-applications', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'idempotency-key': 'route-request-key-002' },
      body: JSON.stringify(validInput),
    }));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true, received: true, folio: 'YJG-2026-SAFE2345' });
    expect(JSON.stringify(body)).not.toContain('internal-random-id');
    expect(submit).toHaveBeenCalledOnce();
  });
});

describe('0.2R.2 integration boundaries', () => {
  const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

  it('keeps notification delivery in the application trigger and out of the endpoint', () => {
    const endpoint = source('app/api/public-applications/route.ts');
    const notifications = source('functions/src/emailNotifications.ts');
    const deliveryGuard = source('functions/src/notificationDelivery.ts');
    expect(endpoint).not.toMatch(/sendEmail|CallMeBot|wizard-complete|sendSlackNotification/);
    expect(notifications).toContain('getApplicationV2ReceivedTemplate');
    expect(notifications).toContain('reference.applicationId');
    expect(notifications).toContain('beginApplicationV2NotificationDelivery');
    expect(deliveryGuard).toContain('application-v2-created-${applicationId}');
    expect(notifications).not.toMatch(/where\("ownerEmail"/);
  });

  it('claims a v2 notification delivery only once under concurrent duplicate events', async () => {
    const { db, documents } = createIntakeDb();
    const args = [db, () => new Date('2026-09-02T12:00:00.000Z'), 'application-once', 'event-once'] as const;
    const deliveries = await Promise.all([
      beginApplicationV2NotificationDelivery(...args),
      beginApplicationV2NotificationDelivery(...args),
    ]);
    expect(deliveries.filter((delivery) => delivery.acquired)).toHaveLength(1);
    expect(documents.get('notificationDeliveries/application-v2-created-application-once')).toMatchObject({
      applicationId: 'application-once',
      eventId: 'event-once',
      status: 'processing',
    });
  });

  it('fails closed for non-canonical v2 documents before sending notifications', () => {
    const canonical = {
      schemaVersion: 2,
      status: 'submitted',
      businessId: null,
      publicReference: 'YJG-2026-ABC2345678',
      ownerName: 'Persona',
      ownerEmail: 'persona@example.com',
      ownerPhone: '9191234567',
      business: { businessName: 'Negocio' },
    };
    expect(isAnonymousApplicationV2NotificationSource(canonical)).toBe(true);
    expect(isAnonymousApplicationV2NotificationSource({ ...canonical, status: 'pending' })).toBe(false);
    expect(isAnonymousApplicationV2NotificationSource({ ...canonical, businessId: 'business-1' })).toBe(false);
    expect(isAnonymousApplicationV2NotificationSource({ ...canonical, ownerId: 'attacker' })).toBe(false);
    expect(isAnonymousApplicationV2NotificationSource({ ...canonical, publicReference: 'fake' })).toBe(false);
  });

  it('keeps v2 admin actions disabled and the submission status-driven in Nuevas', () => {
    const panel = source('components/AdminBusinessPanel.tsx');
    const actions = source('app/actions/adminBusinessActions.ts');
    expect(panel).toContain('Aprobación y reclamo disponibles en 0.2R.3');
    expect(actions).toMatch(/where\('status', '==', 'submitted'\)/);
    expect(actions).toContain("queue === 'new'");
    const indexes = JSON.parse(source('firestore.indexes.json')) as { indexes: Array<{ collectionGroup: string; fields: Array<{ fieldPath: string }> }> };
    expect(indexes.indexes).toContainEqual(expect.objectContaining({
      collectionGroup: 'applications',
      fields: [
        expect.objectContaining({ fieldPath: 'schemaVersion' }),
        expect.objectContaining({ fieldPath: 'status' }),
        expect.objectContaining({ fieldPath: 'createdAt' }),
      ],
    }));
  });

  it('does not change Firestore rules or introduce claims/redeem code in the endpoint', () => {
    const endpoint = source('app/api/public-applications/route.ts');
    expect(endpoint).not.toMatch(/ownershipClaims|issueOwnershipClaim|redeem|ownerId|ownerUid/);
    expect(source('lib/featureFlags.ts')).toContain("process.env.PUBLIC_APPLICATION_V2_ENABLED === 'true'");
  });
});
