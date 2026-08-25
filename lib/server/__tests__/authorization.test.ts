import { beforeEach, describe, expect, it, vi } from 'vitest';

const verifyIdToken = vi.fn();
const verifySessionCookie = vi.fn();
const hasAdminOverride = vi.fn();

vi.mock('../firebaseAdmin', () => ({
  getAdminAuth: () => ({ verifyIdToken, verifySessionCookie }),
}));

vi.mock('../../adminOverrides', () => ({
  hasAdminOverride: (email?: string | null) => hasAdminOverride(email),
}));

import {
  assertAdminToken,
  assertAdminSessionOrIdToken,
  assertOwnerOrAdmin,
  AuthorizationError,
  isOwnerIdentity,
  verifyIdTokenOrThrow,
  verifySessionOrIdTokenOrThrow,
} from '../authorization';

const identity = (overrides: Record<string, unknown> = {}) => ({
  uid: 'user-1',
  email: 'user@example.com',
  aud: 'project',
  auth_time: 0,
  exp: 0,
  firebase: { identities: {}, sign_in_provider: 'password' },
  iat: 0,
  iss: 'issuer',
  sub: 'user-1',
  ...overrides,
}) as any;

describe('server authorization', () => {
  beforeEach(() => {
    verifyIdToken.mockReset();
    verifySessionCookie.mockReset();
    hasAdminOverride.mockReset();
    hasAdminOverride.mockReturnValue(false);
  });

  it('denies anonymous and normal users but accepts an admin for protected Server Components', async () => {
    await expect(assertAdminSessionOrIdToken('')).rejects.toMatchObject({ status: 401 });

    verifySessionCookie.mockRejectedValueOnce(new Error('not a session cookie'));
    verifyIdToken.mockResolvedValueOnce(identity());
    await expect(assertAdminSessionOrIdToken('normal-id-token')).rejects.toMatchObject({ status: 403 });

    verifySessionCookie.mockResolvedValueOnce(identity({ admin: true }));
    await expect(assertAdminSessionOrIdToken('admin-session')).resolves.toMatchObject({ admin: true });
  });

  it('accepts an admin ID token when the value is not a Firebase session cookie', async () => {
    verifySessionCookie.mockRejectedValueOnce(new Error('not a session cookie'));
    verifyIdToken.mockResolvedValueOnce(identity({ admin: true }));

    await expect(verifySessionOrIdTokenOrThrow('admin-id-token')).resolves.toMatchObject({ admin: true });
  });

  it('returns 401 when the token is missing or invalid', async () => {
    await expect(verifyIdTokenOrThrow('')).rejects.toMatchObject({ status: 401 });

    verifyIdToken.mockRejectedValueOnce(new Error('invalid token'));
    await expect(verifyIdTokenOrThrow('invalid')).rejects.toMatchObject({ status: 401 });
  });

  it('returns 403 for an authenticated non-admin', async () => {
    verifyIdToken.mockResolvedValueOnce(identity());
    await expect(assertAdminToken('valid-user-token')).rejects.toMatchObject({ status: 403 });
  });

  it('accepts custom-claim admins and deliberate email overrides', async () => {
    verifyIdToken.mockResolvedValueOnce(identity({ admin: true }));
    await expect(assertAdminToken('admin-token')).resolves.toMatchObject({ uid: 'user-1' });

    hasAdminOverride.mockReturnValueOnce(true);
    verifyIdToken.mockResolvedValueOnce(identity({ email: 'override@example.com' }));
    await expect(assertAdminToken('override-token')).resolves.toMatchObject({ email: 'override@example.com' });
  });

  it('recognizes ownership only when a non-empty ownerId matches the uid', () => {
    const decoded = identity();
    expect(isOwnerIdentity(decoded, 'user-1')).toBe(true);
    expect(isOwnerIdentity(decoded, 'user-2')).toBe(false);
    expect(isOwnerIdentity(decoded, '')).toBe(false);
    expect(isOwnerIdentity(decoded, undefined)).toBe(false);
  });

  it('denies ownerless resources to normal users but permits admins', () => {
    expect(() => assertOwnerOrAdmin(identity(), undefined)).toThrowError(AuthorizationError);
    expect(() => assertOwnerOrAdmin(identity({ admin: true }), undefined)).not.toThrow();
  });

  it('enforces dashboard access by uid or admin, never by matching email', () => {
    expect(() => assertOwnerOrAdmin(identity(), 'user-1')).not.toThrow();
    expect(() => assertOwnerOrAdmin(identity(), 'another-owner')).toThrowError(AuthorizationError);
    expect(() => assertOwnerOrAdmin(identity({ email: 'owner@example.com' }), undefined)).toThrowError(
      AuthorizationError
    );
    expect(() => assertOwnerOrAdmin(identity({ admin: true }), undefined)).not.toThrow();
  });
});
