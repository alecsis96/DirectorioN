import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  assertAdminToken: vi.fn(),
  set: vi.fn(),
  manageSet: vi.fn(),
  manageGet: vi.fn(),
  verifySessionCookie: vi.fn(),
  verifyIdToken: vi.fn(),
}));

vi.mock('../lib/server/authorization', () => ({
  assertAdminToken: mocks.assertAdminToken,
}));

vi.mock('../lib/server/firebaseAdmin', () => ({
  getAdminAuth: () => ({
    verifySessionCookie: mocks.verifySessionCookie,
    verifyIdToken: mocks.verifyIdToken,
  }),
  getAdminFirestore: () => ({
    collection: () => ({
      doc: () => ({ id: 'assisted-business-1', set: mocks.set }),
    }),
    doc: () => ({ get: mocks.manageGet, set: mocks.manageSet }),
  }),
}));

import { createAssistedBusiness } from '../app/actions/adminBusinessActions';
import { manageBusiness } from '../app/actions/admin';

describe('assisted business creation with monetization disabled', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.assertAdminToken.mockResolvedValue({
      uid: 'admin-1',
      email: 'admin@example.com',
      admin: true,
    });
    mocks.set.mockResolvedValue(undefined);
    mocks.manageGet.mockResolvedValue({ exists: true });
    mocks.manageSet.mockResolvedValue(undefined);
    mocks.verifySessionCookie.mockRejectedValue(new Error('not a session'));
    mocks.verifyIdToken.mockResolvedValue({ uid: 'admin-1', email: 'admin@example.com', admin: true });
  });

  it('creates an ownerless free business even when sponsor is requested', async () => {
    const result = await createAssistedBusiness(
      {
        name: 'Alta asistida',
        phone: '9191234567',
        WhatsApp: '9191234567',
        categoryId: 'restaurante',
        sourceChannel: 'whatsapp',
        plan: 'sponsor',
      },
      'admin-token'
    );

    expect(result).toEqual({ success: true, businessId: 'assisted-business-1' });
    expect(mocks.set).toHaveBeenCalledOnce();
    const payload = mocks.set.mock.calls[0][0];
    expect(payload).toMatchObject({
      plan: 'free',
      featured: false,
      businessStatus: 'draft',
      visibility: 'hidden',
    });
    expect(payload).not.toHaveProperty('ownerId');
    expect(payload).not.toHaveProperty('planExpiresAt');
    expect(payload).not.toHaveProperty('nextPaymentDate');
    expect(payload).not.toHaveProperty('paymentStatus');
  });

  it('ignores plan fields when editing an existing historical business', async () => {
    await manageBusiness('admin-token', 'historical-business', {
      name: 'Nombre actualizado',
      plan: 'sponsor',
      featured: 'si',
      paymentStatus: 'active',
      stripeSubscriptionId: 'sub_should_not_be_written',
    });

    expect(mocks.manageSet).toHaveBeenCalledOnce();
    const payload = mocks.manageSet.mock.calls[0][0];
    expect(payload.name).toBe('Nombre actualizado');
    expect(payload).not.toHaveProperty('plan');
    expect(payload).not.toHaveProperty('featured');
    expect(payload).not.toHaveProperty('paymentStatus');
    expect(payload).not.toHaveProperty('stripeSubscriptionId');
  });
});
