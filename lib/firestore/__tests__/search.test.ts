import { beforeEach, describe, expect, it, vi } from 'vitest';

const get = vi.fn();

vi.mock('../../server/firebaseAdmin', () => ({
  getAdminFirestore: () => ({
    collection: () => ({
      where: () => ({ get }),
    }),
  }),
}));

import {
  clampPublicSearchRadius,
  findBusinessesNear,
  MAX_PUBLIC_SEARCH_RADIUS_KM,
} from '../search';

describe('public geographic business search', () => {
  beforeEach(() => {
    get.mockReset();
  });

  it('returns only visible businesses with valid nearby locations', async () => {
    const records = [
      {
        id: 'visible',
        data: () => ({
          name: 'Visible',
          businessStatus: 'published',
          adminStatus: 'active',
          visibility: 'published',
          isActive: true,
          location: { lat: 16.898, lng: -92.779 },
        }),
      },
      {
        id: 'draft',
        data: () => ({
          name: 'Draft',
          businessStatus: 'draft',
          location: { lat: 16.898, lng: -92.779 },
        }),
      },
      {
        id: 'archived',
        data: () => ({
          name: 'Archived',
          businessStatus: 'published',
          adminStatus: 'archived',
          visibility: 'published',
          isActive: true,
          location: { lat: 16.898, lng: -92.779 },
        }),
      },
      {
        id: 'hidden',
        data: () => ({
          name: 'Hidden',
          businessStatus: 'published',
          visibility: 'hidden',
          location: { lat: 16.898, lng: -92.779 },
        }),
      },
      {
        id: 'inactive',
        data: () => ({
          name: 'Inactive',
          businessStatus: 'published',
          isActive: false,
          location: { lat: 16.898, lng: -92.779 },
        }),
      },
    ];
    get.mockResolvedValue({ forEach: (callback: (doc: (typeof records)[number]) => void) => records.forEach(callback) });

    const result = await findBusinessesNear(16.898, -92.779, 5);
    expect(result.map((business) => business.id)).toEqual(['visible']);
  });

  it('clamps arbitrary public radii without changing the normal default', () => {
    expect(clampPublicSearchRadius(5)).toBe(5);
    expect(clampPublicSearchRadius(Number.POSITIVE_INFINITY)).toBe(5);
    expect(clampPublicSearchRadius(5000)).toBe(MAX_PUBLIC_SEARCH_RADIUS_KM);
  });
});
