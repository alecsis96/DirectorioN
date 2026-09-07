import { SESSION_SYNC_HEADER } from './sessionConfig';

export type ServerSessionState = { authenticated: boolean; isAdmin: boolean };

/** Exchange a current Firebase ID token for an HttpOnly server session, or clear it. */
export async function writeSessionCookie(token?: string): Promise<ServerSessionState> {
  const response = await fetch('/api/auth/session', {
    method: token ? 'POST' : 'DELETE',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: {
      [SESSION_SYNC_HEADER]: '1',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!response.ok) throw new Error('SERVER_SESSION_SYNC_FAILED');
  return response.json();
}
