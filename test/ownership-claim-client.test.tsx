import { StrictMode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  signInWithCustomToken: vi.fn(), signInWithEmailLink: vi.fn(), signInWithEmailAndPassword: vi.fn(),
  isSignInWithEmailLink: vi.fn(), replace: vi.fn(), writeSessionCookie: vi.fn(),
  auth: { currentUser: null as any, authStateReady: vi.fn(async () => {}) },
}));
vi.mock('firebase/auth', () => mocks);
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: mocks.replace }) }));
vi.mock('../firebaseConfig', () => ({ auth: mocks.auth }));
vi.mock('../lib/sessionCookie', () => ({ writeSessionCookie: mocks.writeSessionCookie }));
import OwnershipClaimClient from '../components/OwnershipClaimClient';

const token = 'A'.repeat(43);
const firebaseUser = { uid: 'target', email: 'owner@example.com', emailVerified: true, getIdToken: vi.fn(async () => 'id-token') };
function api(handlers: Record<string, any>) {
  const fetch = vi.fn(async (url: string) => {
    const operation = url.split('/').pop()!;
    if (!(operation in handlers)) throw new Error(`Unexpected operation ${operation}`);
    return new Response(JSON.stringify({ ok: true, ...handlers[operation] }), { status: 200 });
  });
  vi.stubGlobal('fetch', fetch);
  return fetch;
}
beforeEach(() => {
  vi.clearAllMocks(); mocks.auth.currentUser = null;
  window.localStorage.clear(); window.sessionStorage.clear();
  window.history.replaceState(null, '', `/reclamar-negocio#token=${token}`);
});

describe('claim UI continuity', () => {
  it('GET/render including StrictMode never creates an account or consumes, then explicit confirmation bootstraps', async () => {
    const fetch = api({ begin: {}, prepare: { status: 'bootstrap', customToken: 'new-only' }, complete: { businessId: 'business-1' } });
    mocks.signInWithCustomToken.mockResolvedValue({ user: firebaseUser });
    render(<StrictMode><OwnershipClaimClient enabled /></StrictMode>);
    await screen.findByRole('button', { name: 'Confirmar y entrar' });
    expect(window.location.hash).toBe('');
    expect(fetch).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar y entrar' }));
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/dashboard/business-1'));
    expect(fetch).toHaveBeenCalledWith('/api/ownership-claims/begin', expect.objectContaining({ body: JSON.stringify({ token, confirmed: true }) }));
    expect(mocks.signInWithCustomToken).toHaveBeenCalledWith(mocks.auth, 'new-only');
    expect(window.sessionStorage.length).toBe(0);
  });

  it('reuses the authenticated target session with no custom-token sign-in', async () => {
    mocks.auth.currentUser = firebaseUser;
    api({ begin: {}, prepare: { status: 'login' }, status: { status: 'ready', email: firebaseUser.email, targetUid: 'target' }, complete: { businessId: 'business-1' } });
    render(<OwnershipClaimClient enabled />);
    await userEvent.click(await screen.findByRole('button', { name: 'Confirmar y entrar' }));
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/dashboard/business-1'));
    expect(mocks.signInWithCustomToken).not.toHaveBeenCalled();
  });

  it('offers Email Link first and password only as a voluntary option for an existing UID', async () => {
    window.history.replaceState(null, '', '/entrar');
    api({ prepare: { status: 'login' }, status: { status: 'ready', email: firebaseUser.email, targetUid: 'target' } });
    render(<OwnershipClaimClient enabled login />);
    expect(await screen.findByRole('button', { name: 'Recibir enlace por correo' })).toBeInTheDocument();
    expect(screen.getByText('¿Ya configuraste una contraseña?')).toBeInTheDocument();
    expect(screen.queryByLabelText('Contraseña')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Entrar con contraseña' }));
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();
  });

  it('requests Email Link for an existing UID without inspecting its providers', async () => {
    window.history.replaceState(null, '', '/entrar');
    const fetch = api({ prepare: { status: 'login' }, status: { status: 'ready', email: firebaseUser.email, targetUid: 'target' }, 'login-email': {} });
    render(<OwnershipClaimClient enabled login />);
    await userEvent.click(await screen.findByRole('button', { name: 'Recibir enlace por correo' }));
    expect(fetch).toHaveBeenCalledWith('/api/ownership-claims/login-email', expect.anything());
    expect(screen.queryByLabelText('Contraseña')).not.toBeInTheDocument();
    expect(mocks.signInWithEmailAndPassword).not.toHaveBeenCalled();
  });

  it('recovers an email-link return with NO fragment and empty storage via the server attempt', async () => {
    window.history.replaceState(null, '', '/entrar?mode=signIn&oobCode=real-shaped-return');
    mocks.isSignInWithEmailLink.mockReturnValue(true);
    mocks.signInWithEmailLink.mockResolvedValue({ user: firebaseUser });
    api({ prepare: { status: 'login' }, status: { status: 'ready', email: firebaseUser.email, targetUid: 'target' }, complete: { businessId: 'business-1' } });
    render(<OwnershipClaimClient enabled login />);
    await userEvent.click(await screen.findByRole('button', { name: 'Completar acceso' }));
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/dashboard/business-1'));
    expect(mocks.signInWithEmailLink).toHaveBeenCalledWith(mocks.auth, 'owner@example.com', expect.stringContaining('oobCode'));
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(mocks.signInWithCustomToken).not.toHaveBeenCalled();
  });

  it('does not manufacture a claim when a legacy Firebase return has no continuation', async () => {
    window.history.replaceState(null, '', '/reclamar-negocio?mode=signIn&oobCode=legacy');
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ ok: false, code: 'ATTEMPT_MISSING' }), { status: 401 })));
    render(<OwnershipClaimClient enabled />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Abre la invitación original');
    expect(mocks.signInWithCustomToken).not.toHaveBeenCalled();
    expect(mocks.signInWithEmailLink).not.toHaveBeenCalled();
  });
});
