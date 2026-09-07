import { NextRequest, NextResponse } from 'next/server';

import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS, SESSION_SYNC_HEADER } from '../../../../lib/sessionConfig';
import { isAdminIdentity } from '../../../../lib/server/authorization';
import { getAdminAuth } from '../../../../lib/server/firebaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const noStore = { 'Cache-Control': 'private, no-store' };
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

function json(body: object, status = 200) {
  return NextResponse.json(body, { status, headers: noStore });
}

function clearSession(body: object, status: number) {
  const response = json(body, status);
  response.cookies.set(SESSION_COOKIE_NAME, '', { ...cookieOptions, maxAge: 0 });
  return response;
}

function isSameOriginMutation(request: NextRequest): boolean {
  if (request.headers.get(SESSION_SYNC_HEADER) !== '1') return false;
  const origin = request.headers.get('origin');
  if (origin && origin !== request.nextUrl.origin) return false;
  const fetchSite = request.headers.get('sec-fetch-site');
  return !fetchSite || fetchSite === 'same-origin' || fetchSite === 'same-site';
}

export async function GET(request: NextRequest) {
  const value = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!value) return json({ authenticated: false, isAdmin: false });
  try {
    const decoded = await getAdminAuth().verifySessionCookie(value, true);
    return json({ authenticated: true, isAdmin: isAdminIdentity(decoded) });
  } catch {
    return clearSession({ authenticated: false, isAdmin: false }, 200);
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) return json({ ok: false }, 403);
  const match = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i);
  if (!match?.[1]) return clearSession({ ok: false }, 401);

  try {
    const auth = getAdminAuth();
    const decoded = await auth.verifyIdToken(match[1], true);
    const authenticatedAt = Number(decoded.auth_time || 0) * 1000;
    if (!authenticatedAt || Date.now() - authenticatedAt > SESSION_MAX_AGE_SECONDS * 1000) {
      return clearSession({ ok: false, code: 'RECENT_LOGIN_REQUIRED' }, 401);
    }
    const sessionCookie = await auth.createSessionCookie(match[1], {
      expiresIn: SESSION_MAX_AGE_SECONDS * 1000,
    });
    const response = json({ authenticated: true, isAdmin: isAdminIdentity(decoded) });
    response.cookies.set(SESSION_COOKIE_NAME, sessionCookie, {
      ...cookieOptions,
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    return response;
  } catch {
    return clearSession({ ok: false }, 401);
  }
}

export async function DELETE(request: NextRequest) {
  if (!isSameOriginMutation(request)) return json({ ok: false }, 403);
  return clearSession({ authenticated: false, isAdmin: false }, 200);
}
