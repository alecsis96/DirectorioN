import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../lib/featureFlags', () => ({ OWNERSHIP_CLAIMS_ENABLED: true }));
vi.mock('../lib/server/claimIdentityPolicy', () => ({ assertUnambiguousAuthProject: vi.fn(async () => {}) }));
import {
  beginClaimAttempt,
  prepareClaimAttempt,
  completeClaimAttempt,
  claimAttemptContext,
  wasAccountCreatedByClaimForBusiness,
  ATTEMPT_TTL_MS,
} from '../lib/server/ownershipClaimAttempts';
import { createRedeemDb, CLAIM_TOKEN, NOW } from './helpers/claimDb';

function firebaseUser(uid = 'existing-uid', extra = {}) {
  return { uid, email: 'owner@example.com', emailVerified: true, disabled: false, providerData: [],
    metadata: { creationTime: NOW.toISOString() }, ...extra };
}
function fakeAuth(initial?: any) {
  const users = new Map<string, any>();
  if (initial) users.set(initial.uid, initial);
  const auth = {
    getUserByEmail: vi.fn(async (email: string) => {
      const found = [...users.values()].find(u => u.email === email);
      if (!found) throw { code: 'auth/user-not-found' };
      return found;
    }),
    getUser: vi.fn(async (uid: string) => {
      if (!users.has(uid)) throw { code: 'auth/user-not-found' };
      return users.get(uid);
    }),
    createUser: vi.fn(async (input: any) => {
      if ([...users.values()].some(u => u.email === input.email)) throw { code: 'auth/email-already-exists' };
      const user = firebaseUser(input.uid, input); users.set(user.uid, user); return user;
    }),
    createCustomToken: vi.fn(async (uid: string) => `custom-for-${uid}`),
  };
  return { auth: auth as any, users };
}
const decoded = (uid: string) => ({ uid, email: 'owner@example.com', email_verified: true, firebase: {} }) as any;

describe('simplified claims: identity and ownership boundaries', () => {
  it('creates a stable new UID, then consumes only through complete', async () => {
    const state = createRedeemDb(), { auth, users } = fakeAuth();
    const options = { db: state.db, auth, now: NOW };
    const begin = await beginClaimAttempt(CLAIM_TOKEN, '', options);
    expect(auth.createUser).not.toHaveBeenCalled();
    const prepared = await prepareClaimAttempt(begin.continuation, options);
    expect(prepared.status).toBe('bootstrap');
    expect(users.size).toBe(1);
    expect(state.get('businesses/business-1').ownerId).toBeUndefined();
    const uid = [...users.keys()][0];
    const result = await completeClaimAttempt(begin.continuation, decoded(uid), options);
    expect(result.idempotent).toBe(false);
    expect(state.get('businesses/business-1').ownerId).toBe(uid);
    expect(await wasAccountCreatedByClaimForBusiness(uid, 'business-1', options)).toBe(true);
    expect((await completeClaimAttempt(begin.continuation, decoded(uid), options)).idempotent).toBe(true);
    expect(state.entries('ownershipClaimAudits')).toHaveLength(1);
    await prepareClaimAttempt(begin.continuation, options);
    expect(auth.createCustomToken).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(state.entries('ownershipClaimAttempts'))).not.toContain(CLAIM_TOKEN);
    expect(JSON.stringify(state.entries('ownershipClaimAttempts'))).not.toContain(begin.continuation.split('.')[1]);
  });

  it('never mints a token for an existing UID, even on repeated preparation', async () => {
    const state = createRedeemDb(), { auth } = fakeAuth(firebaseUser());
    const options = { db: state.db, auth, now: NOW };
    const { continuation } = await beginClaimAttempt(CLAIM_TOKEN, '', options);
    expect(await prepareClaimAttempt(continuation, options)).toEqual({ status: 'login' });
    expect(await prepareClaimAttempt(continuation, options)).toEqual({ status: 'login' });
    expect(auth.createUser).not.toHaveBeenCalled();
    expect(auth.createCustomToken).not.toHaveBeenCalled();
    await expect(completeClaimAttempt(continuation, decoded('wrong-session'), options)).rejects.toMatchObject({ code: 'CLAIM_IDENTITY_UNAVAILABLE' });
    expect(state.get('businesses/business-1').ownerId).toBeUndefined();
    await completeClaimAttempt(continuation, decoded('existing-uid'), options);
    expect(state.get('businesses/business-1').ownerId).toBe('existing-uid');
    expect(await wasAccountCreatedByClaimForBusiness('existing-uid', 'business-1', options)).toBe(false);
  });

  it('an email creation collision takes the normal-login path, never bootstraps the winner', async () => {
    const state = createRedeemDb(), { auth, users } = fakeAuth();
    auth.createUser.mockImplementationOnce(async () => {
      users.set('race-winner', firebaseUser('race-winner'));
      throw { code: 'auth/email-already-exists' };
    });
    const options = { db: state.db, auth, now: NOW };
    const { continuation } = await beginClaimAttempt(CLAIM_TOKEN, '', options);
    expect(await prepareClaimAttempt(continuation, options)).toEqual({ status: 'login' });
    expect(auth.createCustomToken).not.toHaveBeenCalled();
    expect((await claimAttemptContext(continuation, options)).targetUid).toBe('race-winner');
  });

  it('a timeout after Firebase creates the reserved UID is not positive creation proof', async () => {
    const state = createRedeemDb(), { auth, users } = fakeAuth();
    auth.createUser.mockImplementationOnce(async (input: any) => {
      users.set(input.uid, firebaseUser(input.uid)); throw new Error('response lost');
    });
    const options = { db: state.db, auth, now: NOW };
    const { continuation } = await beginClaimAttempt(CLAIM_TOKEN, '', options);
    expect(await prepareClaimAttempt(continuation, options)).toEqual({ status: 'login' });
    await prepareClaimAttempt(continuation, options);
    expect(auth.createUser).toHaveBeenCalledTimes(1);
    expect(auth.createCustomToken).not.toHaveBeenCalled();
  });

  it.each([
    { disabled: true }, { emailVerified: false }, { customClaims: { admin: true } },
    { customClaims: { role: 'manager' } }, { tenantId: 'another-tenant' },
    { multiFactor: { enrolledFactors: [{ uid: 'factor' }] } },
    { providerData: [{ providerId: 'google.com', email: 'different@example.com' }] },
  ])('fails closed for unsupported identities: %j', async extra => {
    const state = createRedeemDb(), { auth } = fakeAuth(firebaseUser('existing-uid', extra));
    const options = { db: state.db, auth, now: NOW };
    const { continuation } = await beginClaimAttempt(CLAIM_TOKEN, '', options);
    await expect(prepareClaimAttempt(continuation, options)).rejects.toMatchObject({ code: 'CLAIM_IDENTITY_UNAVAILABLE' });
    expect(auth.createCustomToken).not.toHaveBeenCalled();
  });

  it('blocks new-account bootstrap for admin override emails before touching Auth', async () => {
    const state = createRedeemDb({ claim: { emailNormalized: 'al36xiz@gmail.com' }, application: { ownerEmail: 'al36xiz@gmail.com' } });
    await expect(beginClaimAttempt(CLAIM_TOKEN, '', { db: state.db, now: NOW })).rejects.toMatchObject({ code: 'CLAIM_IDENTITY_UNAVAILABLE' });
    expect(state.entries('ownershipClaimAttempts')).toHaveLength(0);
  });

  it('serializes confirmation and provisioning; same claim cannot create two UIDs', async () => {
    const state = createRedeemDb(), { auth, users } = fakeAuth();
    const options = { db: state.db, auth, now: NOW };
    const attempts = await Promise.allSettled([beginClaimAttempt(CLAIM_TOKEN, '', options), beginClaimAttempt(CLAIM_TOKEN, '', options)]);
    expect(attempts.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    const { continuation } = (attempts.find(r => r.status === 'fulfilled') as PromiseFulfilledResult<any>).value;
    await Promise.allSettled([prepareClaimAttempt(continuation, options), prepareClaimAttempt(continuation, options)]);
    expect(users.size).toBe(1);
    expect(auth.createUser).toHaveBeenCalledTimes(1);
    expect((await beginClaimAttempt(CLAIM_TOKEN, continuation, options)).continuation).toBe(continuation);
  });

  it.each(['revoked', 'expired', 'owned', 'attempt-expired'])('revalidates %s between sign-in and complete', async reason => {
    const state = createRedeemDb(), { auth } = fakeAuth(firebaseUser());
    const options = { db: state.db, auth, now: NOW };
    const { continuation } = await beginClaimAttempt(CLAIM_TOKEN, '', options);
    await prepareClaimAttempt(continuation, options);
    if (reason === 'revoked') state.seed('ownershipClaims/claim-1', { ...state.get('ownershipClaims/claim-1'), status: 'revoked' });
    if (reason === 'expired') state.seed('ownershipClaims/claim-1', { ...state.get('ownershipClaims/claim-1'), expiresAt: NOW });
    if (reason === 'owned') state.seed('businesses/business-1', { ...state.get('businesses/business-1'), ownerId: 'another-owner' });
    if (reason === 'attempt-expired') options.now = new Date(NOW.getTime() + ATTEMPT_TTL_MS);
    await expect(completeClaimAttempt(continuation, decoded('existing-uid'), options)).rejects.toBeDefined();
    expect(state.get('ownershipClaims/claim-1').status).not.toBe('consumed');
  });

  it('rejects a forged continuation and derives context without client email or storage', async () => {
    const state = createRedeemDb();
    const options = { db: state.db, now: NOW };
    const { continuation } = await beginClaimAttempt(CLAIM_TOKEN, '', options);
    const context = await claimAttemptContext(continuation, options);
    expect(context.email).toBe('owner@example.com');
    expect(context).not.toHaveProperty('methods');
    await expect(claimAttemptContext(`${continuation.split('.')[0]}.${'B'.repeat(43)}`, options)).rejects.toMatchObject({ code: 'ATTEMPT_MISSING' });
  });
  it('recovers an unused reservation after its original attempt expires, keeping the same candidate UID', async () => {
    const state = createRedeemDb(), { auth } = fakeAuth();
    const options = { db: state.db, auth, now: NOW };
    auth.getUserByEmail.mockRejectedValueOnce(new Error('temporary outage before creation'));
    const first = await beginClaimAttempt(CLAIM_TOKEN, '', options);
    await expect(prepareClaimAttempt(first.continuation, options)).rejects.toThrow();
    const candidate = state.entries('ownershipClaimIdentities')[0][1].candidateUid;
    options.now = new Date(NOW.getTime() + ATTEMPT_TTL_MS + 1);
    const second = await beginClaimAttempt(CLAIM_TOKEN, '', options);
    expect((await prepareClaimAttempt(second.continuation, options)).status).toBe('bootstrap');
    expect(auth.createUser).toHaveBeenCalledWith(expect.objectContaining({ uid: candidate }));
    expect(auth.createUser).toHaveBeenCalledTimes(1);
  });
  it('recovers a lost bootstrap response only for the same positively created account', async () => {
    const state = createRedeemDb(), { auth, users } = fakeAuth();
    const options = { db: state.db, auth, now: NOW };
    const { continuation } = await beginClaimAttempt(CLAIM_TOKEN, '', options);
    expect((await prepareClaimAttempt(continuation, options)).status).toBe('bootstrap');
    expect((await prepareClaimAttempt(continuation, options)).status).toBe('bootstrap');
    expect(auth.createUser).toHaveBeenCalledTimes(1);
    const user = [...users.values()][0];
    user.metadata.lastSignInTime = NOW.toISOString();
    expect((await prepareClaimAttempt(continuation, options)).status).toBe('login');
  });
  it('accepts creation metadata populated by Auth, but rejects a subsequent refresh even within the same second', async () => {
    const state = createRedeemDb(), { auth, users } = fakeAuth();
    auth.createUser.mockImplementation(async (input: any) => {
      const user = firebaseUser(input.uid, { metadata: { creationTime: NOW.toISOString(), lastSignInTime: NOW.toISOString(), lastRefreshTime: null } });
      users.set(user.uid, user); return user;
    });
    const options = { db: state.db, auth, now: NOW };
    const { continuation } = await beginClaimAttempt(CLAIM_TOKEN, '', options);
    expect((await prepareClaimAttempt(continuation, options)).status).toBe('bootstrap');
    [...users.values()][0].metadata.lastRefreshTime = NOW.toISOString();
    expect((await prepareClaimAttempt(continuation, options)).status).toBe('login');
    expect(auth.createCustomToken).toHaveBeenCalledTimes(1);
  });
  it.each([
    { disabled: true }, { email: 'changed@example.com' }, { customClaims: { admin: true } },
    { multiFactor: { enrolledFactors: [{ uid: 'new-factor' }] } },
    { metadata: { creationTime: 'recreated-account' } },
  ])('rejects an identity changed after preparation: %j', async extra => {
    const state = createRedeemDb(), { auth, users } = fakeAuth(firebaseUser());
    const options = { db: state.db, auth, now: NOW };
    const { continuation } = await beginClaimAttempt(CLAIM_TOKEN, '', options);
    await prepareClaimAttempt(continuation, options);
    users.set('existing-uid', firebaseUser('existing-uid', extra));
    await expect(prepareClaimAttempt(continuation, options)).rejects.toBeDefined();
    await expect(completeClaimAttempt(continuation, decoded('existing-uid'), options)).rejects.toBeDefined();
    expect(state.get('businesses/business-1').ownerId).toBeUndefined();
  });
});
