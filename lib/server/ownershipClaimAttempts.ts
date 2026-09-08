import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import type { Auth, DecodedIdToken, UserRecord } from 'firebase-admin/auth';
import type { Firestore, Transaction } from 'firebase-admin/firestore';
import { OWNERSHIP_CLAIMS_ENABLED } from '../featureFlags';
import { hasAdminOverride } from '../adminOverrides';
import { getAdminAuth, getAdminFirestore } from './firebaseAdmin';
import { hashOwnershipClaimToken, normalizeClaimEmail } from './ownershipClaims';
import { redeemOwnershipClaimHash } from './ownershipClaimRedeem';
import { assertUnambiguousAuthProject } from './claimIdentityPolicy';

export const ATTEMPTS = 'ownershipClaimAttempts';
export const IDENTITIES = 'ownershipClaimIdentities';
export const ATTEMPT_TTL_MS = 10 * 60 * 1000;
export const ATTEMPT_COOKIE = '__Host-ownershipClaimAttempt';

export class ClaimAttemptError extends Error {
  constructor(readonly code: string, readonly status = 409) { super(code); }
}
type Options = { db?: Firestore; auth?: Auth; now?: Date };
type Attempt = {
  claimId: string; claimVersion: number; tokenHash: string; emailNormalized: string;
  secretHash: string; confirmedAt: unknown; expiresAt: unknown; targetUid?: string;
  targetCreationTime?: string;
  status: 'pending' | 'ready' | 'completed';
};
function fail(code = 'CLAIM_IDENTITY_UNAVAILABLE', status = 409): never {
  throw new ClaimAttemptError(code, status);
}
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const secret = () => randomBytes(32).toString('base64url');
const millis = (value: any) => value instanceof Date ? value.getTime() : value?.toDate?.().getTime() || 0;
const clock = (options: Options) => options.now ?? new Date();
function equal(a: string, b: string) {
  return typeof a === 'string' && a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
function enabled() {
  if (!OWNERSHIP_CLAIMS_ENABLED) fail('OWNERSHIP_CLAIMS_DISABLED', 404);
}
function parseContinuation(value: string) {
  if (!/^[A-Za-z0-9_-]{43}\.[A-Za-z0-9_-]{43}$/.test(value)) fail('ATTEMPT_MISSING', 401);
  const [id, continuation] = value.split('.');
  return { id, secretHash: hash(continuation) };
}

/** Reads the same ownership graph as the final transaction, without consuming it. */
async function activeClaim(db: Firestore, tx: Transaction, claimId: string, tokenHash: string, now: Date) {
  const ref = db.collection('ownershipClaims').doc(claimId);
  const claim = (await tx.get(ref)).data();
  if (!claim || !equal(claim.tokenHash, tokenHash)) fail('CLAIM_INVALID', 400);
  if (claim.status === 'revoked') fail('CLAIM_REVOKED', 410);
  if (millis(claim.expiresAt) <= now.getTime()) fail('CLAIM_EXPIRED', 410);
  if (claim.status !== 'active') fail('CLAIM_ALREADY_USED');
  if (typeof claim.businessId !== 'string' || typeof claim.applicationId !== 'string' ||
      !Number.isSafeInteger(claim.version) || claim.version < 1) fail('CLAIM_INVALID', 400);
  const [guard, business, application] = await Promise.all([
    tx.get(db.collection('ownershipClaimGuards').doc(claim.businessId)),
    tx.get(db.collection('businesses').doc(claim.businessId)),
    tx.get(db.collection('applications').doc(claim.applicationId)),
  ]);
  const g = guard.data(), b = business.data(), a = application.data();
  if (!g || !b || !a || g.activeClaimId !== claimId || g.version !== claim.version ||
      g.businessId !== claim.businessId || a.schemaVersion !== 2 || a.status !== 'approved' ||
      a.businessId !== claim.businessId || b.sourceApplicationId !== claim.applicationId ||
      b.applicationSchemaVersion !== 2 || normalizeClaimEmail(a.ownerEmail || '') !== claim.emailNormalized) {
    fail('CLAIM_INVALID', 400);
  }
  if (Object.hasOwn(b, 'ownerId') || Object.hasOwn(b, 'ownerUid')) fail('BUSINESS_ALREADY_CLAIMED');
  return { ref, claim, business: b };
}

/** Only an explicit confirmation POST calls this. No Firebase Auth side effects. */
export async function beginClaimAttempt(token: string, currentContinuation = '', options: Options = {}) {
  enabled();
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) fail('CLAIM_INVALID', 400);
  const db = options.db ?? getAdminFirestore();
  const tokenHash = hashOwnershipClaimToken(token);
  const query = await db.collection('ownershipClaims').where('tokenHash', '==', tokenHash).limit(2).get();
  if (query.size !== 1) fail('CLAIM_INVALID', 400);
  const claimId = query.docs[0].id;
  const id = secret(), continuation = secret();
  let previous: ReturnType<typeof parseContinuation> | undefined;
  try { previous = parseContinuation(currentContinuation); } catch {}
  return db.runTransaction(async tx => {
    const now = clock(options);
    const { ref, claim } = await activeClaim(db, tx, claimId, tokenHash, now);
    if (hasAdminOverride(claim.emailNormalized)) fail();
    if (claim.attemptId) {
      const existing = (await tx.get(db.collection(ATTEMPTS).doc(claim.attemptId))).data();
      if (existing && millis(existing.expiresAt) > now.getTime()) {
        if (previous && previous.id === claim.attemptId && equal(existing.secretHash, previous.secretHash)) {
          return { continuation: currentContinuation, expiresAt: millis(existing.expiresAt) };
        }
        fail('ATTEMPT_IN_PROGRESS');
      }
    }
    const expiresAt = new Date(Math.min(now.getTime() + ATTEMPT_TTL_MS, millis(claim.expiresAt)));
    tx.create(db.collection(ATTEMPTS).doc(id), {
      claimId, claimVersion: claim.version, tokenHash, emailNormalized: claim.emailNormalized,
      secretHash: hash(continuation), confirmedAt: now, expiresAt, status: 'pending',
    });
    tx.update(ref, { attemptId: id });
    return { continuation: `${id}.${continuation}`, expiresAt: expiresAt.getTime() };
  });
}

export async function readClaimAttempt(continuation: string, options: Options = {}) {
  enabled();
  const binding = parseContinuation(continuation);
  const db = options.db ?? getAdminFirestore();
  const attempt = (await db.collection(ATTEMPTS).doc(binding.id).get()).data() as Attempt | undefined;
  if (!attempt || !equal(attempt.secretHash, binding.secretHash) || !attempt.confirmedAt) fail('ATTEMPT_MISSING', 401);
  if (millis(attempt.expiresAt) <= clock(options).getTime()) fail('ATTEMPT_EXPIRED', 410);
  return { ...binding, attempt: attempt! };
}

export function assertClaimUser(user: UserRecord, email: string) {
  if (user.disabled || !user.emailVerified || normalizeClaimEmail(user.email || '') !== email ||
      hasAdminOverride(email) || user.customClaims?.admin === true ||
      // Unknown roles/privileges cannot safely be classified by the claim service.
      Object.keys(user.customClaims || {}).length > 0 || user.tenantId ||
      (user.multiFactor?.enrolledFactors?.length ?? 0) > 0 ||
      user.providerData.some(p => p.email && normalizeClaimEmail(p.email) !== email)) fail();
}
async function userByEmail(auth: Auth, email: string) {
  try { return await auth.getUserByEmail(email); }
  catch (error: any) { if (error.code === 'auth/user-not-found') return null; throw error; }
}

/** One durable reservation per canonical email; no generated UID on a retry. */
export async function prepareClaimAttempt(continuation: string, options: Options = {}) {
  const db = options.db ?? getAdminFirestore(), auth = options.auth ?? getAdminAuth();
  const { id, attempt } = await readClaimAttempt(continuation, options);
  if (attempt.status === 'completed') return { status: 'ready' as const };
  try { await assertUnambiguousAuthProject(auth); } catch { fail(); }
  const identityRef = db.collection(IDENTITIES).doc(hash(attempt.emailNormalized));
  const attemptRef = db.collection(ATTEMPTS).doc(id);
  const candidateUid = `claim_${secret()}`;
  const reservation = await db.runTransaction(async tx => {
    const { claim } = await activeClaim(db, tx, attempt.claimId, attempt.tokenHash, clock(options));
    if (claim.version !== attempt.claimVersion || claim.attemptId !== id) fail('ATTEMPT_EXPIRED', 410);
    const existing = (await tx.get(identityRef)).data();
    if (existing) {
      if (existing.state === 'reserved' && existing.creatorAttemptId !== id) {
        const previous = (await tx.get(db.collection(ATTEMPTS).doc(existing.creatorAttemptId))).data();
        if (previous && millis(previous.expiresAt) <= clock(options).getTime()) {
          // No Auth call has begun. Transfer the unused reservation, retaining its stable UID.
          tx.update(identityRef, { creatorAttemptId: id });
          return { ...existing, creatorAttemptId: id };
        }
      }
      return existing;
    }
    const data = { candidateUid, creatorAttemptId: id, state: 'reserved' };
    tx.create(identityRef, data);
    return data;
  });
  let user = await userByEmail(auth, attempt.emailNormalized);
  let createdNow = false;
  if (!user) {
    // Only the reservation's original attempt may create; unknown outcomes are never retried blindly.
    const mayCreate = await db.runTransaction(async tx => {
      const { claim } = await activeClaim(db, tx, attempt.claimId, attempt.tokenHash, clock(options));
      const storedAttempt = (await tx.get(attemptRef)).data();
      const r = (await tx.get(identityRef)).data()!;
      if (claim.attemptId !== id || millis(storedAttempt?.expiresAt) <= clock(options).getTime()) fail('ATTEMPT_EXPIRED', 410);
      if (r.creatorAttemptId !== id || r.state !== 'reserved') return false;
      tx.update(identityRef, { state: 'creating' });
      return true;
    });
    if (!mayCreate) fail('IDENTITY_PENDING');
    try {
      user = await auth.createUser({ uid: reservation.candidateUid, email: attempt.emailNormalized, emailVerified: true });
      createdNow = true;
    } catch (error: any) {
      // An existing UID/email collision or timeout is NOT proof we created that account.
      user = await userByEmail(auth, attempt.emailNormalized);
      if (!user) fail('IDENTITY_PENDING');
    }
  }
  assertClaimUser(user!, attempt.emailNormalized);
  const target = user!;
  await db.runTransaction(async tx => {
    const { claim } = await activeClaim(db, tx, attempt.claimId, attempt.tokenHash, clock(options));
    const stored = (await tx.get(attemptRef)).data()!;
    const identity = (await tx.get(identityRef)).data()!;
    if (claim.attemptId !== id || millis(stored.expiresAt) <= clock(options).getTime()) fail('ATTEMPT_EXPIRED', 410);
    if (stored.targetUid && stored.targetUid !== target.uid) fail();
    if (stored.targetCreationTime && stored.targetCreationTime !== target.metadata.creationTime) fail();
    if (createdNow) {
      if (identity.creatorAttemptId !== id || identity.candidateUid !== target.uid || !target.metadata.creationTime) fail();
      tx.update(identityRef, {
        state: 'created', createdByAttemptId: id, createdUid: target.uid, creationTime: target.metadata.creationTime,
        initialLastSignInTime: target.metadata.lastSignInTime || null,
      });
    } else if (identity.state === 'reserved') {
      tx.update(identityRef, { state: 'existing' });
    }
    tx.update(attemptRef, { targetUid: target.uid, targetCreationTime: target.metadata.creationTime, status: 'ready' });
  });
  const provenance = (await identityRef.get()).data()!;
  const freshUser = await auth.getUser(target.uid);
  assertClaimUser(freshUser, attempt.emailNormalized);
  if (provenance.createdByAttemptId === id && provenance.createdUid === freshUser.uid &&
      provenance.creationTime === freshUser.metadata.creationTime && freshUser.providerData.length === 0 &&
      provenance.initialLastSignInTime === (freshUser.metadata.lastSignInTime || null) && !freshUser.metadata.lastRefreshTime) {
    // Only this attempt's positively acknowledged new account can receive a bootstrap token.
    await readClaimAttempt(continuation, options);
    await db.runTransaction(tx => activeClaim(db, tx, attempt.claimId, attempt.tokenHash, clock(options)));
    return { status: 'bootstrap' as const, customToken: await auth.createCustomToken(target.uid) };
  }
  return { status: 'login' as const };
}

export async function claimAttemptContext(continuation: string, options: Options = {}) {
  const db = options.db ?? getAdminFirestore();
  const { id, attempt } = await readClaimAttempt(continuation, options);
  if (attempt.status !== 'completed') {
    await db.runTransaction(async tx => {
      const { claim } = await activeClaim(db, tx, attempt.claimId, attempt.tokenHash, clock(options));
      if (claim.attemptId !== id || claim.version !== attempt.claimVersion) fail('ATTEMPT_EXPIRED', 410);
    });
  }
  return { status: attempt.status, email: attempt.emailNormalized, targetUid: attempt.targetUid ?? null };
}

/** Read-only proof that this business was claimed by the UID created by that exact attempt. */
export async function wasAccountCreatedByClaimForBusiness(
  uid: string,
  businessId: string,
  options: Pick<Options, 'db'> = {},
) {
  if (!uid || !businessId) return false;
  const db = options.db ?? getAdminFirestore();
  const guardSnapshot = await db.collection('ownershipClaimGuards').doc(businessId).get();
  const guard = guardSnapshot.data();
  if (!guard || guard.businessId !== businessId || guard.consumedByUid !== uid ||
      typeof guard.consumedClaimId !== 'string') return false;

  const claimSnapshot = await db.collection('ownershipClaims').doc(guard.consumedClaimId).get();
  const claim = claimSnapshot.data();
  if (!claim || claim.status !== 'consumed' || claim.businessId !== businessId ||
      claim.consumedByUid !== uid || typeof claim.attemptId !== 'string' ||
      typeof claim.emailNormalized !== 'string') return false;

  const [attemptSnapshot, identitySnapshot] = await Promise.all([
    db.collection(ATTEMPTS).doc(claim.attemptId).get(),
    db.collection(IDENTITIES).doc(hash(claim.emailNormalized)).get(),
  ]);
  const attempt = attemptSnapshot.data();
  const identity = identitySnapshot.data();
  return Boolean(
    attempt && identity && attempt.status === 'completed' && attempt.claimId === claimSnapshot.id &&
    attempt.targetUid === uid && identity.state === 'created' && identity.createdUid === uid &&
    identity.createdByAttemptId === claim.attemptId &&
    identity.creationTime === attempt.targetCreationTime,
  );
}

export async function completeClaimAttempt(continuation: string, decoded: DecodedIdToken, options: Options = {}) {
  const auth = options.auth ?? getAdminAuth();
  const { id, secretHash, attempt } = await readClaimAttempt(continuation, options);
  if (decoded.uid !== attempt.targetUid || decoded.email_verified !== true ||
      normalizeClaimEmail(decoded.email || '') !== attempt.emailNormalized || decoded.firebase?.tenant || decoded.admin === true) fail();
  const user = await auth.getUser(decoded.uid);
  assertClaimUser(user, attempt.emailNormalized);
  if (user.metadata.creationTime !== attempt.targetCreationTime) fail();
  try { await assertUnambiguousAuthProject(auth); } catch { fail(); }
  return redeemOwnershipClaimHash(attempt.tokenHash, {
    uid: decoded.uid, email: user.email!, emailVerified: user.emailVerified,
  }, { db: options.db, now: options.now, attempt: { id, secretHash } });
}

export async function reserveAttemptEmail(continuation: string, options: Options = {}) {
  const db = options.db ?? getAdminFirestore(), auth = options.auth ?? getAdminAuth();
  const context = await claimAttemptContext(continuation, options);
  if (!context.targetUid || context.status !== 'ready') fail('IDENTITY_PENDING');
  assertClaimUser(await auth.getUser(context.targetUid), context.email);
  const { id } = parseContinuation(continuation);
  await db.runTransaction(async tx => {
    const ref = db.collection(ATTEMPTS).doc(id);
    const attempt = (await tx.get(ref)).data()!;
    const now = clock(options);
    if (millis(attempt.lastEmailAt) + 60_000 > now.getTime()) fail('EMAIL_COOLDOWN', 429);
    tx.update(ref, { lastEmailAt: now });
  });
  return context.email;
}
