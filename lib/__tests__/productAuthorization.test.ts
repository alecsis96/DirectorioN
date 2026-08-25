import { describe, expect, it } from 'vitest';

import { preservesProductBusinessId } from '../productAuthorization';

describe('product business assignment', () => {
  it('allows updates that omit business_id or preserve the current value', () => {
    expect(preservesProductBusinessId('business-a', undefined)).toBe(true);
    expect(preservesProductBusinessId('business-a', 'business-a')).toBe(true);
    expect(preservesProductBusinessId('business-a', ' business-a ')).toBe(true);
  });

  it('rejects reassignment, empty values, and null', () => {
    expect(preservesProductBusinessId('business-a', 'business-b')).toBe(false);
    expect(preservesProductBusinessId('business-a', '')).toBe(false);
    expect(preservesProductBusinessId('business-a', null)).toBe(false);
  });
});
