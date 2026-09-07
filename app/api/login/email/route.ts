import { randomBytes, createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { EMAIL_LINK_AUTH_ENABLED } from '../../../../lib/featureFlags';
import { getAdminAuth, getAdminFirestore } from '../../../../lib/server/firebaseAdmin';
import { assertClaimUser } from '../../../../lib/server/ownershipClaimAttempts';
import { assertUnambiguousAuthProject } from '../../../../lib/server/claimIdentityPolicy';
import { sendOrdinaryEmailSignInLink } from '../../../../lib/server/ordinaryEmailLink';
import { safeInternalNext } from '../../../../lib/authRedirect';

export const runtime = 'nodejs';
const COOKIE = '__Host-yajagonEmailLogin';
const hash = (text: string) => createHash('sha256').update(text).digest('hex');
const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('request'), email: z.string().trim().email().max(200), next: z.string().max(500).optional() }).strict(),
  z.object({ action: z.literal('context') }).strict(),
]);
const response = (body: object, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });

/** Ordinary email authentication only. This endpoint never creates users or reads/writes ownership. */
export async function POST(request: Request) {
  if (!EMAIL_LINK_AUTH_ENABLED) return response({ ok: false }, 404);
  const origin = new URL(process.env.NEXT_PUBLIC_BASE_URL || request.url).origin;
  if (request.headers.get('origin') !== origin || request.headers.get('x-yajagon-claim') !== '1' ||
      !request.headers.get('content-type')?.startsWith('application/json')) return response({ ok: false }, 403);
  if (Number(request.headers.get('content-length') || 0) > 2048) return response({ ok: false }, 413);
  let body: z.infer<typeof schema>;
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw) > 2048) return response({ ok: false }, 413);
    body = schema.parse(JSON.parse(raw));
  } catch { return response({ ok: false }, 400); }
  const db = getAdminFirestore();
  if (body.action === 'context') {
    const cookies = (request.headers.get('cookie') || '').split(';').map(c => c.trim()).filter(c => c.startsWith(`${COOKIE}=`));
    const token = cookies.length === 1 ? cookies[0].slice(COOKIE.length + 1) : '';
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return response({ ok: false }, 404);
    const context = (await db.collection('emailLoginContexts').doc(hash(token)).get()).data();
    if (!context || context.expiresAt.toMillis() <= Date.now()) return response({ ok: false }, 404);
    return response({ ok: true, email: context.email });
  }
  // Identical response for unknown, disabled, privileged, throttled or undeliverable accounts.
  const accepted = response({ ok: true }, 202);
  const email = body.email.toLowerCase();
  const token = randomBytes(32).toString('base64url');
  // Remember the supplied address uniformly; this is not evidence of identity or account existence.
  await db.collection('emailLoginContexts').doc(hash(token)).set({ email, expiresAt: new Date(Date.now() + 10 * 60_000) });
  accepted.cookies.set(COOKIE, token, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 600 });
  try {
    const auth = getAdminAuth();
    await assertUnambiguousAuthProject(auth);
    assertClaimUser(await auth.getUserByEmail(email), email);
    const allowed = await db.runTransaction(async tx => {
      const ref = db.collection('emailLoginRateLimits').doc(hash(email));
      const previous = (await tx.get(ref)).data();
      const now = Date.now();
      if (previous && previous.lastSentAt.toMillis() + 60_000 > now) return false;
      tx.set(ref, { lastSentAt: new Date(now) });
      return true;
    });
    if (!allowed) return accepted;
    await sendOrdinaryEmailSignInLink(email, origin, safeInternalNext(body.next));
  } catch { /* Do not reveal user existence or authentication policy. */ }
  return accepted;
}
