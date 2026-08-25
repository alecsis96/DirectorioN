import { describe, expect, it } from 'vitest';

import { pickOwnerEditableBusinessUpdates } from '../ownerBusinessUpdates';

describe('owner business update allowlist', () => {
  it('keeps legitimate profile fields', () => {
    expect(
      pickOwnerEditableBusinessUpdates({
        businessName: 'Nombre actualizado',
        description: 'Descripcion actualizada',
        phone: '555-0101',
        location: { lat: 17, lng: -92 },
      })
    ).toEqual({
      businessName: 'Nombre actualizado',
      description: 'Descripcion actualizada',
      phone: '555-0101',
      location: { lat: 17, lng: -92 },
    });
  });

  it('drops ownership, state, moderation, and plan fields', () => {
    expect(
      pickOwnerEditableBusinessUpdates({
        name: 'Permitido',
        ownerId: 'attacker',
        ownerEmail: 'attacker@example.com',
        businessStatus: 'published',
        applicationStatus: 'approved',
        adminStatus: 'active',
        visibility: 'published',
        isActive: true,
        plan: 'sponsor',
        adminNotes: 'bypass',
      })
    ).toEqual({ name: 'Permitido' });
  });
});
