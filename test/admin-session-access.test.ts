import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  verifyIdToken: vi.fn(),
  verifySessionCookie: vi.fn(),
  createSessionCookie: vi.fn(),
  signOut: vi.fn(),
  writeSessionCookie: vi.fn(),
}));

vi.mock('../lib/server/authorization', async importOriginal => {
  const actual = await importOriginal<typeof import('../lib/server/authorization')>();
  return {
    ...actual,
    isAdminIdentity: (decoded: { admin?: boolean }) => decoded.admin === true,
  };
});
vi.mock('../lib/server/firebaseAdmin', () => ({
  getAdminAuth: () => ({
    verifyIdToken: mocks.verifyIdToken,
    verifySessionCookie: mocks.verifySessionCookie,
    createSessionCookie: mocks.createSessionCookie,
  }),
}));
vi.mock('firebase/auth', () => ({ signOut: mocks.signOut }));
vi.mock('../firebaseConfig', () => ({ auth: { name: 'client-auth' } }));
vi.mock('../lib/sessionCookie', () => ({ writeSessionCookie: mocks.writeSessionCookie }));

import { NextRequest } from 'next/server';
import { DELETE, POST } from '../app/api/auth/session/route';
import { adminFailureDestination, loginPathFor, safeInternalNext } from '../lib/authRedirect';
import { logoutEverywhereInThisBrowser } from '../lib/logout';
import { SESSION_MAX_AGE_SECONDS } from '../lib/sessionConfig';

function mutationRequest(method: 'POST' | 'DELETE', token?: string) {
  return new NextRequest('https://yajagon.com/api/auth/session', {
    method,
    headers: {
      Origin: 'https://yajagon.com',
      'X-YajaGon-Session': '1',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

describe('admin access and server session', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createSessionCookie.mockResolvedValue('signed-http-only-session');
  });

  it('/admin without a valid session redirects to login with a safe return path', async () => {
    expect(adminFailureDestination(401, '/admin')).toBe('/entrar?next=/admin');
  });

  it('allows an authenticated admin to remain in /admin', async () => {
    const source = await import('node:fs/promises').then(fs => fs.readFile('app/admin/layout.tsx', 'utf8'));
    expect(source).toContain('await requireAdminPage()');
  });

  it('sends an authenticated non-admin to an explicit access denied page', async () => {
    expect(adminFailureDestination(403, '/admin')).toBe('/acceso-no-autorizado');
  });

  it('restores a missing server cookie from a recent revocation-checked Firebase ID token', async () => {
    mocks.verifyIdToken.mockResolvedValue({ uid: 'admin-1', admin: true, auth_time: Math.floor(Date.now() / 1000) });
    const response = await POST(mutationRequest('POST', 'firebase-id-token'));
    expect(response.status).toBe(200);
    expect(mocks.verifyIdToken).toHaveBeenCalledWith('firebase-id-token', true);
    expect(mocks.createSessionCookie).toHaveBeenCalledWith('firebase-id-token', {
      expiresIn: SESSION_MAX_AGE_SECONDS * 1000,
    });
    expect(response.headers.get('set-cookie')).toContain('__session=signed-http-only-session');
    expect(response.headers.get('set-cookie')).toContain('HttpOnly');
    await expect(response.json()).resolves.toEqual({ authenticated: true, isAdmin: true });
  });

  it('does not restore a Firebase session whose original authentication is older than seven days', async () => {
    mocks.verifyIdToken.mockResolvedValue({ uid: 'admin-1', admin: true,
      auth_time: Math.floor(Date.now() / 1000) - SESSION_MAX_AGE_SECONDS - 1 });
    const response = await POST(mutationRequest('POST', 'stale-token'));
    expect(response.status).toBe(401);
    expect(mocks.createSessionCookie).not.toHaveBeenCalled();
  });

  it('accepts /admin as next and rejects absolute, protocol-relative and backslash redirects', () => {
    expect(safeInternalNext('/admin')).toBe('/admin');
    expect(loginPathFor('/admin')).toBe('/entrar?next=/admin');
    expect(safeInternalNext('https://evil.example', '/dashboard')).toBe('/dashboard');
    expect(safeInternalNext('//evil.example', '/dashboard')).toBe('/dashboard');
    expect(safeInternalNext('/\\evil.example', '/dashboard')).toBe('/dashboard');
  });

  it('logout closes Firebase Auth and clears the server session even if Firebase logout fails', async () => {
    mocks.signOut.mockRejectedValueOnce(new Error('client logout failed'));
    mocks.writeSessionCookie.mockResolvedValue({ authenticated: false, isAdmin: false });
    await expect(logoutEverywhereInThisBrowser()).rejects.toThrow('client logout failed');
    expect(mocks.writeSessionCookie).toHaveBeenCalledWith();

    const response = await DELETE(mutationRequest('DELETE'));
    expect(response.headers.get('set-cookie')).toContain('__session=;');
    expect(response.headers.get('set-cookie')).toContain('Max-Age=0');
  });
});
