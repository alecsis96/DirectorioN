import { describe, expect, it } from 'vitest';

import { isVisible } from '../businessHelpers';

describe('isVisible', () => {
  it('allows a published assisted business without ownerId', () => {
    expect(
      isVisible({
        businessStatus: 'published',
        adminStatus: 'active',
        visibility: 'published',
        isActive: true,
      })
    ).toBe(true);
  });

  it('preserves legacy defaults for optional visibility fields', () => {
    expect(isVisible({ businessStatus: 'published' })).toBe(true);
  });

  it.each([
    [{ businessStatus: 'published', adminStatus: null }, 'adminStatus null'],
    [{ businessStatus: 'published', adminStatus: '' }, 'adminStatus empty'],
    [{ businessStatus: 'published', adminStatus: false }, 'adminStatus false'],
    [{ businessStatus: 'published', visibility: null }, 'visibility null'],
    [{ businessStatus: 'published', visibility: '' }, 'visibility empty'],
    [{ businessStatus: 'published', visibility: false }, 'visibility false'],
    [{ businessStatus: 'published', isActive: null }, 'isActive null'],
    [{ businessStatus: 'published', isActive: '' }, 'isActive empty'],
  ] as const)('does not treat malformed present fields as legacy defaults (%s)', (business, _label) => {
    expect(isVisible(business as any)).toBe(false);
  });

  it.each([
    [{ businessStatus: 'draft' }, 'draft'],
    [{ businessStatus: 'published', adminStatus: 'archived' }, 'archived'],
    [{ businessStatus: 'published', visibility: 'hidden' }, 'hidden'],
    [{ businessStatus: 'published', isActive: false }, 'inactive'],
  ] as const)('denies a %s business (%s)', (business, _label) => {
    expect(isVisible(business)).toBe(false);
  });
});
