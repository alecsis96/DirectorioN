import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ begin: vi.fn(), prepare: vi.fn(), complete: vi.fn(), verify: vi.fn() }));
vi.mock('../lib/featureFlags', () => ({ OWNERSHIP_CLAIMS_ENABLED: true, EMAIL_LINK_AUTH_ENABLED: true }));
vi.mock('../lib/server/ownershipClaimAttempts', async () => ({
  ...await vi.importActual('../lib/server/ownershipClaimAttempts'),
  beginClaimAttempt: mocks.begin, prepareClaimAttempt: mocks.prepare, completeClaimAttempt: mocks.complete,
}));
vi.mock('../lib/server/authorization', () => ({
  extractBearerToken: (h: Headers) => h.get('authorization')?.replace('Bearer ', ''),
  verifyRevocationCheckedIdTokenOrThrow: mocks.verify,
}));
import { ownershipClaimPost } from '../lib/server/ownershipClaimHttp';
const token = 'A'.repeat(43);
function request(body: object = {}, headers: Record<string, string> = {}) {
  return new Request('https://example.test/api/ownership-claims/begin', { method: 'POST',
    headers: { origin: 'https://example.test', 'content-type': 'application/json', 'x-yajagon-claim': '1', ...headers }, body: JSON.stringify(body) });
}
beforeEach(() => {
  vi.clearAllMocks(); delete process.env.NEXT_PUBLIC_BASE_URL;
  mocks.begin.mockResolvedValue({ continuation: `${token}.${token}`, expiresAt: Date.now() + 600_000 });
});
describe('claim HTTP boundary', () => {
  it('requires explicit confirmation and stores only an HttpOnly secure continuation cookie', async () => {
    const response = await ownershipClaimPost(request({ token, confirmed: true }), 'begin');
    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toMatch(/__Host-ownershipClaimAttempt=/);
    expect(response.headers.get('set-cookie')).toMatch(/HttpOnly/);
    expect(response.headers.get('set-cookie')).toMatch(/Secure/);
    expect(response.headers.get('set-cookie')).toMatch(/SameSite=lax/i);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(await response.json()).toEqual({ ok: true });
    expect((await ownershipClaimPost(request({ token }), 'begin')).status).toBe(400);
  });
  it.each(['uid', 'ownerId', 'email', 'businessId'])('rejects client authority %s', async field => {
    expect((await ownershipClaimPost(request({ token, confirmed: true, [field]: 'attacker' }), 'begin')).status).toBe(400);
    expect(mocks.begin).not.toHaveBeenCalled();
  });
  it('blocks cross-origin POSTs and completes only after revocation-checked verification', async () => {
    expect((await ownershipClaimPost(request({}, { origin: 'https://evil.test' }), 'prepare')).status).toBe(403);
    expect(mocks.prepare).not.toHaveBeenCalled();
    mocks.verify.mockRejectedValueOnce({ status: 401 });
    expect((await ownershipClaimPost(request({}, { authorization: 'Bearer revoked' }), 'complete')).status).toBe(401);
    expect(mocks.complete).not.toHaveBeenCalled();
    mocks.verify.mockResolvedValue({ uid: 'target' }); mocks.complete.mockResolvedValue({ businessId: 'business' });
    await ownershipClaimPost(request({}, { authorization: 'Bearer valid' }), 'complete');
    expect(mocks.verify).toHaveBeenCalledWith('valid');
    expect(mocks.complete).toHaveBeenCalledWith('', { uid: 'target' });
  });
});
