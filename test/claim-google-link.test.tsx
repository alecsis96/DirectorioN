import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  linkGoogle: vi.fn(), updatePassword: vi.fn(), reload: vi.fn(), writeSession: vi.fn(),
  user: { uid: 'owner', email: 'owner@example.com', providerData: [] as Array<{ providerId: string }>, getIdToken: vi.fn(async () => 'fresh-token') },
  auth: { currentUser: null as any, authStateReady: vi.fn(async () => {}) }, provider: {},
}));
vi.mock('firebase/auth', () => ({
  linkWithPopup: mocks.linkGoogle, updatePassword: mocks.updatePassword, reload: mocks.reload,
}));
vi.mock('../firebaseConfig', () => ({ auth: mocks.auth, googleProvider: mocks.provider }));
vi.mock('../lib/sessionCookie', () => ({ writeSessionCookie: mocks.writeSession }));
import ClaimGoogleLink from '../components/ClaimGoogleLink';

beforeEach(() => {
  vi.clearAllMocks(); mocks.auth.currentUser = mocks.user;
  mocks.user.providerData = [];
  mocks.updatePassword.mockResolvedValue(undefined);
  mocks.linkGoogle.mockResolvedValue({ user: mocks.user });
  mocks.writeSession.mockResolvedValue({ authenticated: true, isAdmin: false });
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 202 })));
});

describe('merchant account protection', () => {
  it('lets a new claimed account create a password without changing UID', async () => {
    render(<ClaimGoogleLink ownerId="owner" businessId="business-1" accountCreatedByClaim />);
    await userEvent.click(await screen.findByRole('button', { name: 'Crear contraseña' }));
    await userEvent.type(screen.getByLabelText('Nueva contraseña'), 'SeguraClave9');
    await userEvent.type(screen.getByLabelText('Confirmar contraseña'), 'SeguraClave9');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar contraseña' }));
    await waitFor(() => expect(mocks.updatePassword).toHaveBeenCalledWith(mocks.user, 'SeguraClave9'));
    expect(mocks.auth.currentUser.uid).toBe('owner');
    expect(mocks.writeSession).toHaveBeenCalledWith('fresh-token');
    expect(fetch).not.toHaveBeenCalled();
    expect(await screen.findByRole('status')).toHaveTextContent('Contraseña creada');
  });

  it('turns requires-recent-login into an email-link recovery', async () => {
    mocks.updatePassword.mockRejectedValueOnce({ code: 'auth/requires-recent-login' });
    render(<ClaimGoogleLink ownerId="owner" businessId="business-1" accountCreatedByClaim />);
    await userEvent.click(await screen.findByRole('button', { name: 'Crear contraseña' }));
    await userEvent.type(screen.getByLabelText('Nueva contraseña'), 'SeguraClave9');
    await userEvent.type(screen.getByLabelText('Confirmar contraseña'), 'SeguraClave9');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar contraseña' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Te enviamos un enlace a tu correo');
    expect(fetch).toHaveBeenCalledWith('/api/login/email', expect.objectContaining({
      body: JSON.stringify({ action: 'request', email: 'owner@example.com', next: '/dashboard/business-1' }),
    }));
  });

  it('links Google on the current UID', async () => {
    render(<ClaimGoogleLink ownerId="owner" businessId="business-1" accountCreatedByClaim />);
    await userEvent.click(await screen.findByRole('button', { name: 'Vincular Google' }));
    await waitFor(() => expect(mocks.linkGoogle).toHaveBeenCalledWith(mocks.user, mocks.provider));
    expect(mocks.auth.currentUser.uid).toBe('owner');
  });

  it('does not merge a Google credential owned by another UID', async () => {
    mocks.linkGoogle.mockRejectedValueOnce({ code: 'auth/credential-already-in-use' });
    render(<ClaimGoogleLink ownerId="owner" businessId="business-1" accountCreatedByClaim />);
    await userEvent.click(await screen.findByRole('button', { name: 'Vincular Google' }));
    expect(await screen.findByRole('status')).toHaveTextContent('No fusionamos cuentas ni cambiamos la propiedad');
    expect(mocks.auth.currentUser.uid).toBe('owner');
  });

  it('does nothing after the Firebase session switches UID', async () => {
    render(<ClaimGoogleLink ownerId="owner" businessId="business-1" accountCreatedByClaim />);
    const button = await screen.findByRole('button', { name: 'Vincular Google' });
    mocks.auth.currentUser = { ...mocks.user, uid: 'other' };
    await userEvent.click(button);
    expect(mocks.linkGoogle).not.toHaveBeenCalled();
  });

  it('does not offer password creation to a preexisting UID or call a provider-detection endpoint', async () => {
    render(<ClaimGoogleLink ownerId="owner" businessId="business-1" accountCreatedByClaim={false} />);
    expect(await screen.findByRole('button', { name: 'Vincular Google' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Crear contraseña' })).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });
});
