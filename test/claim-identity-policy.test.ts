import { afterEach, expect, it, vi } from 'vitest';
import { assertUnambiguousAuthProject } from '../lib/server/claimIdentityPolicy';

const auth = { app: { options: { projectId: 'unit-test', credential: {
  getAccessToken: async () => ({ access_token: 'test-only' }),
} } } } as any;
afterEach(() => { vi.unstubAllGlobals(); });
it.each([
  {}, { signIn: { allowDuplicateEmails: true } },
  { signIn: {}, multiTenant: { allowTenants: true } }, { signIn: {}, mfa: { state: 'MANDATORY' } },
])('rejects ambiguous project policy: %j', async config => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(config))));
  await expect(assertUnambiguousAuthProject(auth)).rejects.toThrow();
});
it('accepts single-email policy using only a read-only request', async () => {
  const fetch = vi.fn(async () => new Response(JSON.stringify({ signIn: { allowDuplicateEmails: false } })));
  vi.stubGlobal('fetch', fetch);
  await assertUnambiguousAuthProject(auth);
  expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/config'), expect.not.objectContaining({ method: 'PATCH' }));
});
