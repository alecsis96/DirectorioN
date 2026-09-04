import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  businessGet: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
  verifyIdToken: vi.fn(),
  verifySessionCookie: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => ({ value: 'server-session' }) }),
  headers: async () => ({ get: () => null }),
}));

vi.mock('next/navigation', () => ({
  notFound: mocks.notFound,
  redirect: vi.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
}));

vi.mock('../lib/server/firebaseAdmin', () => ({
  getAdminAuth: () => ({
    verifyIdToken: mocks.verifyIdToken,
    verifySessionCookie: mocks.verifySessionCookie,
  }),
  getAdminFirestore: () => ({
    doc: () => ({ get: mocks.businessGet }),
  }),
}));

vi.mock('../lib/adminOverrides', () => ({
  hasAdminOverride: (email?: string | null) => email === 'override-admin@example.test',
}));

vi.mock('../components/DashboardEditor', () => ({
  default: () => null,
}));

import DashboardBusinessPage from '../app/dashboard/[id]/page';

const ownerlessPrivateBusiness = {
  name: 'Negocio ownerless privado',
  businessStatus: 'draft',
  adminStatus: 'active',
  visibility: 'hidden',
  isActive: true,
};

describe('/dashboard/[id] server authorization', () => {
  beforeEach(() => {
    mocks.businessGet.mockReset();
    mocks.notFound.mockClear();
    mocks.verifyIdToken.mockReset();
    mocks.verifySessionCookie.mockReset();
    mocks.businessGet.mockResolvedValue({
      exists: true,
      id: 'ownerless-private',
      data: () => ownerlessPrivateBusiness,
    });
  });

  it('delivers an ownerless non-public business to an authorized administrator', async () => {
    mocks.verifySessionCookie.mockResolvedValue({
      uid: 'override-admin',
      email: 'override-admin@example.test',
    });

    const result = await DashboardBusinessPage({ params: Promise.resolve({ id: 'ownerless-private' }) });

    expect(result.props.initialBusiness).toMatchObject({
      id: 'ownerless-private',
      businessStatus: 'draft',
      visibility: 'hidden',
    });
    expect(result.props.initialBusiness.ownerId).toBeUndefined();
    expect(mocks.notFound).not.toHaveBeenCalled();
  });

  it('does not deliver an ownerless business to an unauthorized user', async () => {
    mocks.verifySessionCookie.mockResolvedValue({ uid: 'normal-user' });

    await expect(
      DashboardBusinessPage({ params: Promise.resolve({ id: 'ownerless-private' }) }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mocks.notFound).toHaveBeenCalledTimes(1);
  });
});
