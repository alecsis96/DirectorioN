import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  featureUpsellRender: vi.fn(),
  firestoreGet: vi.fn(),
  scarcityRender: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock('firebase/auth', () => ({ signOut: vi.fn() }));
vi.mock('firebase/firestore', () => ({
  doc: (_db: unknown, collectionName: string, id: string) => ({ collectionName, id }),
  getDoc: mocks.firestoreGet,
}));
vi.mock('../firebaseConfig', () => ({ auth: {}, db: {} }));

vi.mock('../hooks/useAuth', () => ({
  canEditBusiness: () => true,
  useAuth: () => ({
    user: { uid: 'admin-user', getIdToken: vi.fn().mockResolvedValue('admin-token') },
    isAdmin: true,
    loading: false,
  }),
}));

vi.mock('../app/actions/businesses', () => ({ updateBusinessDetails: vi.fn() }));
vi.mock('../app/actions/businessActions', () => ({
  deleteBusiness: vi.fn(),
  requestPublish: vi.fn(),
}));

vi.mock('../components/ImageUploader', () => ({ default: () => <div data-testid="image-uploader" /> }));
vi.mock('../components/LogoUploader', () => ({ default: () => <div data-testid="logo-uploader" /> }));
vi.mock('../components/CoverUploader', () => ({ default: () => <div data-testid="cover-uploader" /> }));
vi.mock('../components/AddressPicker', () => ({ default: () => <div data-testid="address-picker" /> }));
vi.mock('../components/PaymentInfo', () => ({ default: () => <div data-testid="payment-info" /> }));
vi.mock('../components/BusinessStatusBanner', () => ({ default: () => <div data-testid="status-banner" /> }));
vi.mock('../components/MenuManager', () => ({ default: () => <div data-testid="menu-manager" /> }));
vi.mock('../components/FeatureUpsell', () => ({
  default: () => {
    mocks.featureUpsellRender();
    return <div data-testid="feature-upsell" />;
  },
}));
vi.mock('../components/ScarcityBadge', () => ({
  default: () => {
    mocks.scarcityRender();
    return <div data-testid="scarcity-badge" />;
  },
}));

import DashboardEditor from '../components/DashboardEditor';
import { MONETIZATION_FEATURE_ENABLED } from '../lib/featureFlags';
import type { Business } from '../types/business';

const ownerlessBusiness = {
  id: 'ownerless-business',
  name: 'Negocio de alta asistida',
  category: 'Restaurantes',
  plan: 'free',
  businessStatus: 'draft',
  adminStatus: 'active',
  visibility: 'hidden',
  isActive: true,
} as Business;

describe('DashboardEditor regression after commercial neutralization', () => {
  beforeEach(() => {
    mocks.featureUpsellRender.mockClear();
    mocks.firestoreGet.mockReset();
    mocks.scarcityRender.mockClear();
  });

  afterEach(() => cleanup());

  it('uses authorized initialBusiness without a redundant Firestore client read', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    render(
      <DashboardEditor
        businessId={ownerlessBusiness.id}
        initialBusiness={ownerlessBusiness}
      />,
    );

    await waitFor(() => {
      expect(mocks.firestoreGet).not.toHaveBeenCalled();
      expect(mocks.scarcityRender).not.toHaveBeenCalled();
      expect(mocks.featureUpsellRender).not.toHaveBeenCalled();
    });
    expect(MONETIZATION_FEATURE_ENABLED).toBe(false);
    expect(fetchSpy.mock.calls.some(([url]) => String(url).startsWith('/api/scarcity'))).toBe(false);

    fetchSpy.mockRestore();
  });

  it('keeps the client read only as a fallback when initialBusiness is unavailable', async () => {
    mocks.firestoreGet.mockResolvedValueOnce({
      exists: () => true,
      id: ownerlessBusiness.id,
      data: () => ownerlessBusiness,
    });

    render(<DashboardEditor businessId={ownerlessBusiness.id} />);

    await waitFor(() => expect(mocks.firestoreGet).toHaveBeenCalledTimes(1));
    expect(mocks.firestoreGet).toHaveBeenCalledWith({
      collectionName: 'businesses',
      id: ownerlessBusiness.id,
    });
    expect(mocks.scarcityRender).not.toHaveBeenCalled();
    expect(mocks.featureUpsellRender).not.toHaveBeenCalled();
  });
});
