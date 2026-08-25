import { NextRequest } from 'next/server';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  assertAdminToken: vi.fn(),
  getAdminFirestore: vi.fn(),
  update: vi.fn(),
  get: vi.fn(),
}));

vi.mock('../lib/server/authorization', () => {
  class AuthorizationError extends Error {
    constructor(message: string, readonly status: 401 | 403) {
      super(message);
      this.name = 'AuthorizationError';
    }
  }
  return {
    AuthorizationError,
    assertAdminToken: mocks.assertAdminToken,
    extractBearerToken: (headers: Headers) =>
      headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || '',
  };
});

vi.mock('../lib/server/firebaseAdmin', () => ({
  getAdminFirestore: mocks.getAdminFirestore,
}));

import { AuthorizationError } from '../lib/server/authorization';
import { POST } from '../app/api/admin/inbox-action/route';

function request(type: string, action: string, token?: string) {
  return new NextRequest('http://localhost/api/admin/inbox-action', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      itemId: 'item-1',
      businessId: 'business-1',
      type,
      action,
    }),
  });
}

describe('admin inbox monetization guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAdminFirestore.mockReturnValue({
      collection: vi.fn(() => ({
        doc: vi.fn(() => ({ update: mocks.update, get: mocks.get })),
      })),
    });
    mocks.get.mockResolvedValue({ data: () => ({}) });
  });

  it('preserves 401 for anonymous requests', async () => {
    mocks.assertAdminToken.mockRejectedValueOnce(new AuthorizationError('Autenticacion requerida.', 401));
    const response = await POST(request('payment', 'suspend'));
    expect(response.status).toBe(401);
  });

  it('preserves 403 for authenticated non-admin users', async () => {
    mocks.assertAdminToken.mockRejectedValueOnce(new AuthorizationError('Permisos de administrador requeridos.', 403));
    const response = await POST(request('payment', 'suspend', 'user-token'));
    expect(response.status).toBe(403);
  });

  it.each([
    ['payment', 'suspend'],
    ['expiration', 'extend'],
  ])('makes %s/%s inert after admin authorization', async (type, action) => {
    mocks.assertAdminToken.mockResolvedValueOnce({ uid: 'admin-1', admin: true });
    const response = await POST(request(type, action, 'admin-token'));

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ code: 'MONETIZATION_DISABLED' });
    expect(mocks.getAdminFirestore).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it.each([
    ['application', 'approve'],
    ['review', 'publish'],
  ])('keeps %s/%s operational for admins', async (type, action) => {
    mocks.assertAdminToken.mockResolvedValueOnce({ uid: 'admin-1', admin: true });
    const response = await POST(request(type, action, 'admin-token'));

    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledOnce();
  });

  it('does not build or query commercial inbox items while monetization is disabled', () => {
    const page = readFileSync(resolve(process.cwd(), 'app/admin/(operations)/page.tsx'), 'utf8');
    const commercialQuery = page.indexOf("where('plan', 'in', ['featured', 'sponsor'])");
    const guard = page.lastIndexOf('if (MONETIZATION_FEATURE_ENABLED)', commercialQuery);

    expect(commercialQuery).toBeGreaterThan(-1);
    expect(guard).toBeGreaterThan(-1);
  });
});
