import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ getUserByEmail: vi.fn(), createUser: vi.fn(), createCustomToken: vi.fn(), send: vi.fn(), db: null as any }));
vi.mock('../lib/featureFlags', () => ({ EMAIL_LINK_AUTH_ENABLED: true, OWNERSHIP_CLAIMS_ENABLED: true }));
vi.mock('../lib/server/claimIdentityPolicy', () => ({ assertUnambiguousAuthProject: async () => {} }));
vi.mock('../lib/server/firebaseAdmin', () => ({ getAdminAuth: () => mocks, getAdminFirestore: () => mocks.db }));
vi.mock('../lib/server/ownershipEmailLink', () => ({ sendAttemptEmailSignInLink: mocks.send }));
import { POST } from '../app/api/login/email/route';

let records: Map<string, any>;
beforeEach(() => {
  vi.clearAllMocks(); delete process.env.NEXT_PUBLIC_BASE_URL; records = new Map();
  mocks.getUserByEmail.mockResolvedValue({ uid: 'existing', email: 'owner@example.com', emailVerified: true, providerData: [] });
  const ref = (path: string) => ({ path,
    set: async (data: any) => records.set(path, data),
    get: async () => ({ data: () => {
      const data = records.get(path); if (!data) return undefined;
      return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, value instanceof Date ? { toMillis: () => value.getTime() } : value]));
    } }),
  });
  mocks.db = { collection: vi.fn((name: string) => ({ doc: (id: string) => ref(`${name}/${id}`) })),
    runTransaction: async (fn: any) => fn({ get: (r: any) => r.get(), set: (r: any, data: any) => r.set(data) }),
  };
});
function request(body: object, cookie = '') {
  return new Request('https://example.test/api/login/email', { method: 'POST',
    headers: { origin: 'https://example.test', 'content-type': 'application/json', 'x-yajagon-claim': '1', cookie }, body: JSON.stringify(body) });
}
it('normal email login remembers email across tabs, sends Firebase auth, and never assigns ownership or bootstraps', async () => {
  const response = await POST(request({ action: 'request', email: 'owner@example.com' }));
  expect(response.status).toBe(202);
  expect(mocks.send).toHaveBeenCalledWith('owner@example.com', 'https://example.test', true);
  const cookie = response.headers.get('set-cookie')!.split(';')[0];
  expect(await (await POST(request({ action: 'context' }, cookie))).json()).toEqual({ ok: true, email: 'owner@example.com' });
  await POST(request({ action: 'request', email: 'owner@example.com' }));
  expect(mocks.send).toHaveBeenCalledTimes(1);
  expect(mocks.createUser).not.toHaveBeenCalled(); expect(mocks.createCustomToken).not.toHaveBeenCalled();
  expect([...records.keys()].every(path => path.startsWith('emailLogin'))).toBe(true);
});
it.each([{ disabled: true }, { customClaims: { admin: true } }, { multiFactor: { enrolledFactors: [{}] } }])('normal email login does not bypass account restrictions %j', async extra => {
  mocks.getUserByEmail.mockResolvedValue({ email: 'owner@example.com', emailVerified: true, providerData: [], ...extra });
  const result = await POST(request({ action: 'request', email: 'owner@example.com' }));
  expect(result.status).toBe(202); expect(await result.json()).toEqual({ ok: true });
  expect(result.headers.get('set-cookie')).toContain('HttpOnly');
  expect(mocks.send).not.toHaveBeenCalled();
});
it('unknown accounts have the same accepted body and cookie without creating a user', async () => {
  mocks.getUserByEmail.mockRejectedValue({ code: 'auth/user-not-found' });
  const result = await POST(request({ action: 'request', email: 'nobody@example.com' }));
  expect(result.status).toBe(202); expect(await result.json()).toEqual({ ok: true });
  expect(result.headers.get('set-cookie')).toContain('HttpOnly');
  expect(mocks.send).not.toHaveBeenCalled(); expect(mocks.createUser).not.toHaveBeenCalled();
});
