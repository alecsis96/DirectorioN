import { render, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  replace: vi.fn(), refresh: vi.fn(), writeSession: vi.fn(),
  persistedUser: { getIdToken: vi.fn().mockResolvedValue('persisted-id-token') },
}));

vi.mock('firebase/auth', () => ({
  isSignInWithEmailLink: () => false,
  signInWithEmailLink: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
}));
vi.mock('../firebaseConfig', () => ({
  auth: { currentUser: mocks.persistedUser, authStateReady: () => Promise.resolve() },
  authPersistenceReady: Promise.resolve(),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }) }));
vi.mock('../lib/sessionCookie', () => ({ writeSessionCookie: mocks.writeSession }));

import EmailLinkLogin from '../components/EmailLinkLogin';

it('reuses a persisted Firebase user to restore the server cookie before continuing to /admin', async () => {
  mocks.writeSession.mockResolvedValue({ authenticated: true, isAdmin: true });
  render(<EmailLinkLogin nextPath="/admin" />);
  await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/admin'));
  expect(mocks.persistedUser.getIdToken).toHaveBeenCalled();
  expect(mocks.writeSession).toHaveBeenCalledWith('persisted-id-token');
  expect(mocks.writeSession.mock.invocationCallOrder[0]).toBeLessThan(mocks.replace.mock.invocationCallOrder[0]);
});
