import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
  signIn: vi.fn(),
  writeSession: vi.fn(),
}));

vi.mock('firebase/auth', () => ({
  isSignInWithEmailLink: () => false,
  signInWithEmailLink: vi.fn(),
  signInWithEmailAndPassword: mocks.signIn,
}));
vi.mock('../firebaseConfig', () => ({
  auth: { currentUser: null, authStateReady: () => Promise.resolve() },
  authPersistenceReady: Promise.resolve(),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }) }));
vi.mock('../lib/sessionCookie', () => ({ writeSessionCookie: mocks.writeSession }));

import EmailLinkLogin from '../components/EmailLinkLogin';

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 404 })));
  mocks.signIn.mockResolvedValue({ user: { getIdToken: () => Promise.resolve('fresh-token') } });
  mocks.writeSession.mockResolvedValue({ authenticated: true, isAdmin: true });
});

it('returns to next=/admin after normal login and first creates the server session', async () => {
  render(<EmailLinkLogin nextPath="/admin" />);
  await userEvent.type(await screen.findByLabelText('Correo electrónico'), 'admin@example.test');
  await userEvent.type(screen.getByLabelText('Contraseña'), 'secret-password');
  await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
  await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/admin'));
  expect(mocks.writeSession).toHaveBeenCalledWith('fresh-token');
  expect(mocks.writeSession.mock.invocationCallOrder[0]).toBeLessThan(mocks.replace.mock.invocationCallOrder[0]);
});

