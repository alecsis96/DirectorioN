import { beforeEach, describe, expect, it, vi } from 'vitest';

const verifyRevocationCheckedIdTokenOrThrow = vi.fn();
const redeemOwnershipClaim = vi.fn();

vi.mock('../lib/featureFlags', () => ({
  OWNERSHIP_CLAIMS_ENABLED: true,
  EMAIL_LINK_AUTH_ENABLED: true,
}));
vi.mock('../lib/server/authorization', () => ({
  extractBearerToken: (headers: Headers) => (headers.get('authorization') || '').replace(/^Bearer\s+/i, ''),
  verifyRevocationCheckedIdTokenOrThrow,
}));
vi.mock('../lib/server/ownershipClaimRedeem', async () => {
  const actual = await vi.importActual<typeof import('../lib/server/ownershipClaimRedeem')>(
    '../lib/server/ownershipClaimRedeem',
  );
  return { ...actual, redeemOwnershipClaim };
});

describe('0.2R.4 redeem HTTP boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyRevocationCheckedIdTokenOrThrow.mockResolvedValue({
      uid: 'firebase-uid', email: 'owner@example.com', email_verified: true,
    });
    redeemOwnershipClaim.mockResolvedValue({ businessId: 'business-1', idempotent: false });
  });

  it('requires Firebase authentication even when the claim token is known', async () => {
    verifyRevocationCheckedIdTokenOrThrow.mockRejectedValueOnce({ status: 401 });
    const { POST } = await import('../app/api/ownership-claims/redeem/route');
    const response = await POST(new Request('https://example.test/api/ownership-claims/redeem', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: 'A'.repeat(43) }),
    }));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ ok: false, code: 'AUTHENTICATION_REQUIRED' });
    expect(redeemOwnershipClaim).not.toHaveBeenCalled();
  }, 15_000);

  it('derives uid and verified email only from the decoded Firebase token', async () => {
    const { POST } = await import('../app/api/ownership-claims/redeem/route');
    const response = await POST(new Request('https://example.test/api/ownership-claims/redeem', {
      method: 'POST',
      headers: { authorization: 'Bearer valid-id-token', 'content-type': 'application/json' },
      body: JSON.stringify({ token: 'A'.repeat(43) }),
    }));
    expect(response.status).toBe(200);
    expect(redeemOwnershipClaim).toHaveBeenCalledWith('A'.repeat(43), {
      uid: 'firebase-uid', email: 'owner@example.com', emailVerified: true,
    });
  });

  it.each(['uid', 'ownerId', 'businessId', 'email'])('rejects manipulable %s body authority', async (field) => {
    const { POST } = await import('../app/api/ownership-claims/redeem/route');
    const response = await POST(new Request('https://example.test/api/ownership-claims/redeem', {
      method: 'POST',
      headers: { authorization: 'Bearer valid-id-token', 'content-type': 'application/json' },
      body: JSON.stringify({ token: 'A'.repeat(43), [field]: 'attacker-controlled' }),
    }));
    expect(response.status).toBe(400);
    expect(redeemOwnershipClaim).not.toHaveBeenCalled();
  });
});
