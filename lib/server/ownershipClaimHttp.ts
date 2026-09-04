import { NextResponse } from 'next/server';
import { z } from 'zod';
import { OWNERSHIP_CLAIMS_ENABLED, EMAIL_LINK_AUTH_ENABLED } from '../featureFlags';
import { extractBearerToken, verifyRevocationCheckedIdTokenOrThrow } from './authorization';
import {
  ATTEMPT_COOKIE, ClaimAttemptError, beginClaimAttempt, prepareClaimAttempt,
  claimAttemptContext, completeClaimAttempt, reserveAttemptEmail,
} from './ownershipClaimAttempts';
import { RedeemOwnershipClaimError } from './ownershipClaimRedeem';
import { sendAttemptEmailSignInLink } from './ownershipEmailLink';

const headers = { 'Cache-Control': 'no-store, private', 'Referrer-Policy': 'no-referrer' };
function continuation(request: Request) {
  const values = (request.headers.get('cookie') || '').split(';').map(c => c.trim())
    .filter(c => c.startsWith(`${ATTEMPT_COOKIE}=`));
  return values.length === 1 ? values[0].slice(ATTEMPT_COOKIE.length + 1) : '';
}

export async function ownershipClaimPost(request: Request, operation: string) {
  const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers });
  if (!OWNERSHIP_CLAIMS_ENABLED) return json({ ok: false, code: 'OWNERSHIP_CLAIMS_DISABLED' }, 404);
  try {
    const origin = new URL(process.env.NEXT_PUBLIC_BASE_URL || request.url).origin;
    if (request.headers.get('origin') !== origin || request.headers.get('x-yajagon-claim') !== '1' ||
        !request.headers.get('content-type')?.startsWith('application/json') ||
        ['cross-site', 'same-site'].includes(request.headers.get('sec-fetch-site') || '')) {
      throw new ClaimAttemptError('INVALID_ORIGIN', 403);
    }
    if (Number(request.headers.get('content-length') || 0) > 2048) throw new ClaimAttemptError('INVALID_REQUEST', 413);
    const raw = await request.text();
    if (Buffer.byteLength(raw) > 2048) throw new ClaimAttemptError('INVALID_REQUEST', 413);
    const schema = operation === 'begin'
      ? z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/), confirmed: z.literal(true) }).strict()
      : z.object({}).strict();
    let body: any;
    try { body = schema.parse(JSON.parse(raw)); } catch { throw new ClaimAttemptError('INVALID_REQUEST', 400); }
    const cookie = continuation(request);
    if (operation === 'begin') {
      const result = await beginClaimAttempt(body.token, cookie);
      const response = json({ ok: true });
      response.cookies.set(ATTEMPT_COOKIE, result.continuation, {
        httpOnly: true, secure: true, sameSite: 'lax', path: '/',
        maxAge: Math.max(0, Math.floor((result.expiresAt - Date.now()) / 1000)),
      });
      return response;
    }
    if (operation === 'prepare') return json({ ok: true, ...await prepareClaimAttempt(cookie) });
    if (operation === 'status') return json({ ok: true, ...await claimAttemptContext(cookie) });
    if (operation === 'complete') {
      const decoded = await verifyRevocationCheckedIdTokenOrThrow(extractBearerToken(request.headers));
      return json({ ok: true, ...await completeClaimAttempt(cookie, decoded) });
    }
    if (operation === 'login-email') {
      if (!EMAIL_LINK_AUTH_ENABLED) throw new ClaimAttemptError('EMAIL_LINK_AUTH_DISABLED', 404);
      const email = await reserveAttemptEmail(cookie);
      await sendAttemptEmailSignInLink(email, origin);
      return json({ ok: true }, 202);
    }
    return json({ ok: false, code: 'INVALID_REQUEST' }, 404);
  } catch (error: any) {
    if (error instanceof ClaimAttemptError) return json({ ok: false, code: error.code }, error.status);
    if (error instanceof RedeemOwnershipClaimError) return json({ ok: false, code: error.code }, 409);
    if (error?.status === 401 || error?.status === 403) return json({ ok: false, code: 'AUTHENTICATION_REQUIRED' }, error.status);
    return json({ ok: false, code: 'CLAIM_OPERATION_FAILED' }, 500);
  }
}
