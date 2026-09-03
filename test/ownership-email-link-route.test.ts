import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendOwnershipEmailSignInLink = vi.fn();

vi.mock('../lib/featureFlags', () => ({
  OWNERSHIP_CLAIMS_ENABLED: true,
  EMAIL_LINK_AUTH_ENABLED: true,
}));
vi.mock('../lib/server/ownershipEmailLink', () => ({ sendOwnershipEmailSignInLink }));

describe('0.2R.4 Email Link HTTP boundary', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns an indistinguishable accepted response for valid and invalid invitations', async () => {
    const { POST } = await import('../app/api/ownership-claims/email-link/route');
    const request = () => new Request('https://example.test/api/ownership-claims/email-link', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: 'A'.repeat(43) }),
    });

    sendOwnershipEmailSignInLink.mockResolvedValueOnce(undefined);
    const valid = await POST(request());
    sendOwnershipEmailSignInLink.mockRejectedValueOnce(new Error('CLAIM_INVALID'));
    const invalid = await POST(request());

    expect(valid.status).toBe(202);
    expect(invalid.status).toBe(202);
    expect(await valid.json()).toEqual({ ok: true });
    expect(await invalid.json()).toEqual({ ok: true });
  });

  it('accepts no client-selected email or ownership authority', async () => {
    const { POST } = await import('../app/api/ownership-claims/email-link/route');
    const response = await POST(new Request('https://example.test/api/ownership-claims/email-link', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: 'A'.repeat(43), email: 'attacker@example.com' }),
    }));
    expect(response.status).toBe(400);
    expect(sendOwnershipEmailSignInLink).not.toHaveBeenCalled();
  });
});
