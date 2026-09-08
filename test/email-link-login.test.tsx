import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  isEmailLink: vi.fn(() => false), signInEmailLink: vi.fn(), signInPassword: vi.fn(),
  replace: vi.fn(), refresh: vi.fn(), writeSession: vi.fn(),
  auth: { currentUser: null as any, authStateReady: vi.fn(async () => {}) },
}));
vi.mock('firebase/auth', () => ({
  isSignInWithEmailLink: mocks.isEmailLink,
  signInWithEmailLink: mocks.signInEmailLink,
  signInWithEmailAndPassword: mocks.signInPassword,
}));
vi.mock('../firebaseConfig', () => ({ auth: mocks.auth, authPersistenceReady: Promise.resolve() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }) }));
vi.mock('../lib/sessionCookie', () => ({ writeSessionCookie: mocks.writeSession }));
import EmailLinkLogin from '../components/EmailLinkLogin';

beforeEach(() => {
  vi.clearAllMocks(); mocks.auth.currentUser = null; mocks.isEmailLink.mockReturnValue(false);
  window.history.replaceState(null, '', '/entrar?flow=login');
});

it('allows changing a remembered email and does not let a late context overwrite that choice', async () => {
  let resolve!: (value: Response) => void;
  vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(done => { resolve = done; })));
  render(<EmailLinkLogin initialEmail="old@example.com" />);
  await waitFor(() => expect(fetch).toHaveBeenCalled());
  await userEvent.click(screen.getByRole('button', { name: 'Usar otro correo' }));
  await userEvent.type(screen.getByLabelText('Correo electrónico'), 'new@example.com');
  resolve(new Response(JSON.stringify({ ok: true, email: 'old@example.com' })));
  await waitFor(() => expect(screen.getByLabelText('Correo electrónico')).toHaveValue('new@example.com'));
  expect(screen.queryByText('old@example.com')).not.toBeInTheDocument();
});

it('starts with a generic email step and does not expose a password field from a public email lookup', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 202 })));
  render(<EmailLinkLogin />);
  await userEvent.type(await screen.findByLabelText('Correo electrónico'), 'owner@outlook.com');
  expect(screen.queryByLabelText('Contraseña')).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Recibir enlace para entrar' }));
  expect(await screen.findByRole('status')).toHaveTextContent('recibirás un enlace en tu correo');
  expect(screen.queryByLabelText('Contraseña')).not.toBeInTheDocument();
});

it.each(['owner@gmail.com', 'owner@outlook.com', 'owner@hotmail.com'])('uses the same universal login choices for %s', async email => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 202 })));
  render(<EmailLinkLogin initialEmail={email} />);
  expect(await screen.findByRole('button', { name: 'Recibir enlace para entrar' })).toBeInTheDocument();
  expect(screen.getByText('¿Ya configuraste una contraseña?')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Entrar con contraseña' })).toBeInTheDocument();
  expect(screen.queryByLabelText('Contraseña')).not.toBeInTheDocument();
});

it('consumes an Email Link return before restoring any persisted Firebase user', async () => {
  const persisted = { uid: 'wrong', getIdToken: vi.fn(async () => 'wrong-token') };
  const expected = { uid: 'owner', getIdToken: vi.fn(async () => 'fresh-link-token') };
  mocks.auth.currentUser = persisted;
  mocks.isEmailLink.mockReturnValue(true);
  mocks.signInEmailLink.mockResolvedValue({ user: expected });
  mocks.writeSession.mockResolvedValue({ authenticated: true, isAdmin: false });
  window.history.replaceState(null, '', '/entrar?mode=signIn&oobCode=real-code');
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ ok: true, email: 'owner@example.com' }), { status: 200 })));

  render(<EmailLinkLogin nextPath="/dashboard/business-1" />);
  await screen.findByRole('button', { name: 'Completar acceso' });
  expect(persisted.getIdToken).not.toHaveBeenCalled();
  expect(mocks.replace).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole('button', { name: 'Completar acceso' }));
  await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/dashboard/business-1'));
  expect(mocks.signInEmailLink).toHaveBeenCalledWith(mocks.auth, 'owner@example.com', expect.stringContaining('oobCode=real-code'));
  expect(mocks.writeSession).toHaveBeenCalledWith('fresh-link-token');
});
