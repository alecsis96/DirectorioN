import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { assertOwnerOrAdmin } from '../lib/server/authorization';
import { sendOwnershipEmailSignInLink } from '../lib/server/ownershipEmailLink';
import {
  RedeemOwnershipClaimError,
  redeemOwnershipClaim,
  validateOwnershipClaimForEmailLink,
} from '../lib/server/ownershipClaimRedeem';
import { hashOwnershipClaimToken } from '../lib/server/ownershipClaims';

type Data = Record<string, any>;
type DocRef = { kind: 'doc'; collection: string; id: string; get(): Promise<Snapshot> };
type Query = {
  kind: 'query';
  collection: string;
  field: string;
  value: unknown;
  max?: number;
  limit(value: number): Query;
  get(): Promise<{ docs: Snapshot[]; size: number }>;
};
type Snapshot = {
  exists: boolean;
  id: string;
  ref: DocRef;
  data(): Data | undefined;
};

const CLAIM_TOKEN = 'A'.repeat(43);
const NOW = new Date('2026-09-02T18:00:00.000Z');

function clone<T>(value: T): T {
  return structuredClone(value);
}

function createRedeemDb(overrides: {
  claim?: Data;
  guard?: Data;
  business?: Data;
  application?: Data;
} = {}) {
  const docs = new Map<string, Data>();
  let generated = 0;
  let transactionTail = Promise.resolve();
  docs.set('ownershipClaims/claim-1', {
    businessId: 'business-1',
    applicationId: 'application-random-v2',
    emailNormalized: 'owner@example.com',
    tokenHash: hashOwnershipClaimToken(CLAIM_TOKEN),
    status: 'active',
    expiresAt: new Date('2026-09-09T18:00:00.000Z'),
    consumedAt: null,
    consumedByUid: null,
    version: 3,
    ...overrides.claim,
  });
  docs.set('ownershipClaimGuards/business-1', {
    businessId: 'business-1',
    activeClaimId: 'claim-1',
    version: 3,
    ...overrides.guard,
  });
  docs.set('businesses/business-1', {
    name: 'Negocio ownerless',
    sourceApplicationId: 'application-random-v2',
    applicationSchemaVersion: 2,
    ownerEmail: 'untrusted-contact@example.com',
    businessStatus: 'draft',
    visibility: 'hidden',
    ...overrides.business,
  });
  docs.set('applications/application-random-v2', {
    schemaVersion: 2,
    status: 'approved',
    businessId: 'business-1',
    ownerEmail: 'owner@example.com',
    ...overrides.application,
  });

  const makeRef = (collection: string, id: string): DocRef => {
    const ref: DocRef = {
      kind: 'doc', collection, id,
      async get() { return snapshot(ref); },
    };
    return ref;
  };
  const snapshot = (ref: DocRef): Snapshot => {
    const data = docs.get(`${ref.collection}/${ref.id}`);
    return { exists: Boolean(data), id: ref.id, ref, data: () => data ? clone(data) : undefined };
  };
  const runQuery = async (query: Query) => {
    const snapshots: Snapshot[] = [];
    for (const [path, data] of docs) {
      const separator = path.indexOf('/');
      const collection = path.slice(0, separator);
      const id = path.slice(separator + 1);
      if (collection === query.collection && data[query.field] === query.value) {
        snapshots.push(snapshot(makeRef(collection, id)));
      }
    }
    const limited = query.max ? snapshots.slice(0, query.max) : snapshots;
    return { docs: limited, size: limited.length };
  };
  const makeQuery = (collection: string, field: string, value: unknown, max?: number): Query => ({
    kind: 'query', collection, field, value, max,
    limit(nextMax) { return makeQuery(collection, field, value, nextMax); },
    async get() { return runQuery(this); },
  });
  const db: any = {
    collection(name: string) {
      return {
        doc(id?: string) { return makeRef(name, id || `generated-${++generated}`); },
        where(field: string, operator: string, value: unknown) {
          if (operator !== '==') throw new Error('unsupported query');
          return makeQuery(name, field, value);
        },
      };
    },
    async runTransaction<T>(callback: (transaction: any) => Promise<T>): Promise<T> {
      const previous = transactionTail;
      let release!: () => void;
      transactionTail = new Promise<void>((resolve) => { release = resolve; });
      await previous;
      const writes: Array<() => void> = [];
      try {
        const transaction = {
          async get(ref: DocRef) { return snapshot(ref); },
          update(ref: DocRef, update: Data) {
            writes.push(() => {
              const path = `${ref.collection}/${ref.id}`;
              const previousData = docs.get(path);
              if (!previousData) throw new Error(`NOT_FOUND:${path}`);
              docs.set(path, { ...previousData, ...clone(update) });
            });
          },
          create(ref: DocRef, data: Data) {
            writes.push(() => {
              const path = `${ref.collection}/${ref.id}`;
              if (docs.has(path)) throw new Error(`ALREADY_EXISTS:${path}`);
              docs.set(path, clone(data));
            });
          },
          set(ref: DocRef, data: Data) {
            writes.push(() => docs.set(`${ref.collection}/${ref.id}`, clone(data)));
          },
        };
        const result = await callback(transaction);
        writes.forEach((write) => write());
        return result;
      } finally {
        release();
      }
    },
  };

  return {
    db,
    get(path: string) { return clone(docs.get(path)); },
    entries(collection: string) {
      return [...docs.entries()].filter(([path]) => path.startsWith(`${collection}/`));
    },
  };
}

const identity = {
  uid: 'firebase-owner-uid',
  email: 'Owner@Example.com',
  emailVerified: true,
};

async function expectCode(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toMatchObject({
    name: RedeemOwnershipClaimError.name,
    code,
  });
}

describe('0.2R.4 secure ownership claim redeem', () => {
  it('prevalidates token and destination email without consuming the invitation', async () => {
    const state = createRedeemDb();
    await expect(validateOwnershipClaimForEmailLink(CLAIM_TOKEN, 'OWNER@example.com', {
      db: state.db, enabled: true, now: NOW,
    })).resolves.toEqual({ claimId: 'claim-1', emailNormalized: 'owner@example.com' });
    expect(state.get('ownershipClaims/claim-1').status).toBe('active');
    expect(state.get('businesses/business-1').ownerId).toBeUndefined();

    await expectCode(validateOwnershipClaimForEmailLink(CLAIM_TOKEN, 'attacker@example.com', {
      db: state.db, enabled: true, now: NOW,
    }), 'CLAIM_INVALID');
    await expectCode(validateOwnershipClaimForEmailLink('B'.repeat(43), identity.email, {
      db: state.db, enabled: true, now: NOW,
    }), 'CLAIM_INVALID');
  });

  it('server-generates the Email Link only for the claim recipient and rate-limits delivery', async () => {
    const state = createRedeemDb();
    const generateSignInLink = vi.fn(async (_email: string, url: string) => `${url}?mode=signIn&oobCode=test`);
    const sendMail = vi.fn(async () => undefined);
    const options = {
      db: state.db,
      enabled: true,
      now: NOW,
      baseUrl: 'https://yajagon.example',
      generateSignInLink,
      sendMail,
    };
    await sendOwnershipEmailSignInLink(CLAIM_TOKEN, options);
    await sendOwnershipEmailSignInLink(CLAIM_TOKEN, options);

    expect(generateSignInLink).toHaveBeenCalledTimes(1);
    expect(generateSignInLink).toHaveBeenCalledWith(
      'owner@example.com', 'https://yajagon.example/reclamar-negocio',
    );
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail.mock.calls[0][0].to).toBe('owner@example.com');
    expect(JSON.stringify(sendMail.mock.calls[0][0])).not.toContain(CLAIM_TOKEN);
  });

  it.each(['email-link', 'google'])('%s identity plus a valid claim becomes the owner', async () => {
    const state = createRedeemDb();
    const result = await redeemOwnershipClaim(CLAIM_TOKEN, identity, {
      db: state.db, enabled: true, now: NOW,
    });

    expect(result).toEqual({ businessId: 'business-1', idempotent: false });
    expect(state.get('businesses/business-1').ownerId).toBe(identity.uid);
    expect(state.get('ownershipClaims/claim-1')).toMatchObject({
      status: 'consumed', consumedByUid: identity.uid, consumedAt: NOW,
    });
    expect(state.get('ownershipClaimGuards/business-1')).toMatchObject({
      activeClaimId: null, consumedClaimId: 'claim-1', consumedByUid: identity.uid,
    });
    expect(state.entries('ownershipClaimAudits')).toHaveLength(1);
  });

  it('rejects a different verified email', async () => {
    const state = createRedeemDb();
    await expectCode(redeemOwnershipClaim(CLAIM_TOKEN, {
      ...identity, email: 'attacker@example.com',
    }, { db: state.db, enabled: true, now: NOW }), 'CLAIM_EMAIL_MISMATCH');
  });

  it('rejects an unverified email', async () => {
    const state = createRedeemDb();
    await expectCode(redeemOwnershipClaim(CLAIM_TOKEN, {
      ...identity, emailVerified: false,
    }, { db: state.db, enabled: true, now: NOW }), 'CLAIM_EMAIL_NOT_VERIFIED');
  });

  it('rejects an incorrect token', async () => {
    const state = createRedeemDb();
    await expectCode(redeemOwnershipClaim('B'.repeat(43), identity, {
      db: state.db, enabled: true, now: NOW,
    }), 'CLAIM_INVALID');
  });

  it('rejects expired and explicitly revoked claims', async () => {
    const expired = createRedeemDb({ claim: { expiresAt: new Date(NOW.getTime() - 1) } });
    await expectCode(redeemOwnershipClaim(CLAIM_TOKEN, identity, {
      db: expired.db, enabled: true, now: NOW,
    }), 'CLAIM_EXPIRED');

    const revoked = createRedeemDb({ claim: { status: 'revoked' } });
    await expectCode(redeemOwnershipClaim(CLAIM_TOKEN, identity, {
      db: revoked.db, enabled: true, now: NOW,
    }), 'CLAIM_REVOKED');
  });

  it('is idempotent only for the same uid after a successful consume', async () => {
    const state = createRedeemDb();
    await redeemOwnershipClaim(CLAIM_TOKEN, identity, { db: state.db, enabled: true, now: NOW });
    await expect(redeemOwnershipClaim(CLAIM_TOKEN, identity, {
      db: state.db, enabled: true, now: NOW,
    })).resolves.toEqual({ businessId: 'business-1', idempotent: true });
    await expectCode(redeemOwnershipClaim(CLAIM_TOKEN, {
      ...identity, uid: 'second-uid',
    }, { db: state.db, enabled: true, now: NOW }), 'CLAIM_ALREADY_USED');
    expect(state.entries('ownershipClaimAudits')).toHaveLength(1);
  });

  it('serializes concurrent redeems and assigns exactly one owner', async () => {
    const state = createRedeemDb();
    const attempts = await Promise.allSettled([
      redeemOwnershipClaim(CLAIM_TOKEN, identity, { db: state.db, enabled: true, now: NOW }),
      redeemOwnershipClaim(CLAIM_TOKEN, { ...identity, uid: 'second-uid' }, {
        db: state.db, enabled: true, now: NOW,
      }),
    ]);
    expect(attempts.filter((attempt) => attempt.status === 'fulfilled')).toHaveLength(1);
    expect(state.get('businesses/business-1').ownerId).toBe(identity.uid);
  });

  it('never overwrites an existing owner', async () => {
    const state = createRedeemDb({ business: { ownerId: 'existing-owner' } });
    await expectCode(redeemOwnershipClaim(CLAIM_TOKEN, identity, {
      db: state.db, enabled: true, now: NOW,
    }), 'BUSINESS_ALREADY_CLAIMED');
    expect(state.get('businesses/business-1').ownerId).toBe('existing-owner');

    const malformedOwner = createRedeemDb({ business: { ownerId: '' } });
    await expectCode(redeemOwnershipClaim(CLAIM_TOKEN, identity, {
      db: malformedOwner.db, enabled: true, now: NOW,
    }), 'BUSINESS_ALREADY_CLAIMED');
  });

  it('rejects guard, application, and business linkage/version mismatches', async () => {
    for (const state of [
      createRedeemDb({ guard: { version: 4 } }),
      createRedeemDb({ application: { businessId: 'other-business' } }),
      createRedeemDb({ business: { sourceApplicationId: 'other-application' } }),
    ]) {
      await expectCode(redeemOwnershipClaim(CLAIM_TOKEN, identity, {
        db: state.db, enabled: true, now: NOW,
      }), 'CLAIM_INTEGRITY_ERROR');
    }
  });

  it('does not treat ownerEmail as authority and dashboard ownership remains uid-only', async () => {
    const state = createRedeemDb({ business: { ownerEmail: identity.email } });
    expect(() => assertOwnerOrAdmin(identity as any, state.get('businesses/business-1').ownerId))
      .toThrow('No tienes permisos');
    await expectCode(redeemOwnershipClaim('B'.repeat(43), identity, {
      db: state.db, enabled: true, now: NOW,
    }), 'CLAIM_INVALID');

    await redeemOwnershipClaim(CLAIM_TOKEN, identity, { db: state.db, enabled: true, now: NOW });
    expect(() => assertOwnerOrAdmin(identity as any, state.get('businesses/business-1').ownerId))
      .not.toThrow();
  });

  it('fails closed when claims are disabled', async () => {
    const state = createRedeemDb();
    await expectCode(redeemOwnershipClaim(CLAIM_TOKEN, identity, {
      db: state.db, enabled: false, now: NOW,
    }), 'OWNERSHIP_CLAIMS_DISABLED');
  });

  it('keeps the endpoint POST-only, authenticated, and rejects body authority', () => {
    const route = source('app/api/ownership-claims/redeem/route.ts');
    expect(route).toMatch(/export async function POST/);
    expect(route).not.toMatch(/export async function GET/);
    expect(route).toMatch(/verifyRevocationCheckedIdTokenOrThrow\(extractBearerToken\(request\.headers\)\)/);
    expect(route).toMatch(/\.object\(\{ token:/);
    expect(route).toMatch(/\.strict\(\)/);
    expect(route).not.toMatch(/parsed\.data\.(?:uid|ownerId|businessId|email)/);
  });

  it('does not leak or persist the plaintext token and removes it from navigation', () => {
    const client = source('components/OwnershipClaimClient.tsx');
    const server = source('lib/server/ownershipClaimRedeem.ts');
    expect(client).not.toMatch(/localStorage/);
    expect(client).not.toMatch(/console\.(?:log|warn|error)/);
    expect(client).toMatch(/history\.replaceState/);
    expect(client).toMatch(/sessionStorage\.removeItem/);
    const emailLinkServer = source('lib/server/ownershipEmailLink.ts');
    expect(emailLinkServer).toMatch(/`\$\{parsed\.origin\}\/reclamar-negocio`/);
    expect(emailLinkServer).not.toMatch(/reclamar-negocio#token/);
    expect(server).not.toMatch(/console\.(?:log|warn|error)/);
    expect(server).toMatch(/hashOwnershipClaimToken\(token\)/);
    expect(server).not.toMatch(/transaction\.(?:create|set|update)\([^\n]+token[,:]/);
  });

  it('implements email link as primary authentication and Google as an optional popup', () => {
    const client = source('components/OwnershipClaimClient.tsx');
    expect(client).toMatch(/fetch\('\/api\/ownership-claims\/email-link'/);
    expect(client).toMatch(/signInWithEmailLink\(/);
    expect(client).toMatch(/signInWithPopup\(auth, googleProvider\)/);
    expect(client).toMatch(/if \(!user\.emailVerified\)/);
    expect(client).not.toMatch(/signInWithRedirect/);
    const emailLinkRoute = source('app/api/ownership-claims/email-link/route.ts');
    expect(emailLinkRoute).toMatch(/export async function POST/);
    expect(emailLinkRoute).not.toMatch(/export async function GET/);
    expect(emailLinkRoute).toMatch(/sendOwnershipEmailSignInLink\(parsed\.data\.token\)/);
    expect(emailLinkRoute).not.toMatch(/parsed\.data\.email/);
    expect(source('lib/server/ownershipEmailLink.ts')).toMatch(/generateSignInWithEmailLink/);
  });

  it('keeps v1 intake intact and Firestore rules deny all claim internals', () => {
    const rules = source('firestore.rules');
    expect(rules).toMatch(/match \/ownershipClaims\/\{claimId\}[\s\S]*?allow read, write: if false;/);
    expect(rules).toMatch(/match \/ownershipClaimGuards\/\{businessId\}[\s\S]*?allow read, write: if false;/);
    expect(rules).toMatch(/match \/ownershipClaimAudits\/\{auditId\}[\s\S]*?allow read, write: if false;/);
    expect(rules).toMatch(/match \/ownershipEmailLinkRateLimits\/\{claimId\}[\s\S]*?allow read, write: if false;/);
    const legacyIntake = source('app/actions/businesses.ts');
    expect(legacyIntake).toMatch(/db\.doc\(`applications\/\$\{decoded\.uid\}`\)/);
    expect(legacyIntake).toMatch(/ownerId:\s*owner\.uid/);
  });
});

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}
