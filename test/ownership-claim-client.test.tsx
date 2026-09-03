import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  isSignInWithEmailLink: vi.fn(),
  signInWithEmailLink: vi.fn(),
  signInWithPopup: vi.fn(),
  writeSessionCookie: vi.fn(),
  auth: { currentUser: null as any },
  googleProvider: {},
}));

vi.mock('firebase/auth', () => ({
  isSignInWithEmailLink: mocks.isSignInWithEmailLink,
  signInWithEmailLink: mocks.signInWithEmailLink,
  signInWithPopup: mocks.signInWithPopup,
}));
vi.mock('../firebaseConfig', () => ({ auth: mocks.auth, googleProvider: mocks.googleProvider }));
vi.mock('../lib/sessionCookie', () => ({ writeSessionCookie: mocks.writeSessionCookie }));

import OwnershipClaimClient from '../components/OwnershipClaimClient';

const CLAIM_TOKEN = 'A'.repeat(43);

function verifiedUser(uid: string) {
  return {
    uid,
    email: 'owner@example.com',
    emailVerified: true,
    getIdToken: vi.fn(async () => 'firebase-id-token'),
  };
}

describe('0.2R.4 ownership claim client flows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.currentUser = null;
    window.sessionStorage.clear();
    window.history.replaceState(null, '', `/reclamar-negocio#token=${CLAIM_TOKEN}`);
  });

  it('completes Firebase Email Link auth and redeems by authenticated POST', async () => {
    const user = userEvent.setup();
    const firebaseUser = verifiedUser('email-link-uid');
    mocks.isSignInWithEmailLink.mockReturnValue(true);
    window.history.replaceState(
      null,
      '',
      `/reclamar-negocio?mode=signIn&oobCode=test-code#token=${CLAIM_TOKEN}`,
    );
    mocks.signInWithEmailLink.mockResolvedValue({ user: firebaseUser });
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      ok: true, businessId: 'business-1', idempotent: false,
    }), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    render(<OwnershipClaimClient enabled />);
    expect(window.location.hash).toBe('');
    await user.type(screen.getByLabelText('Correo que recibió la invitación'), 'owner@example.com');
    await user.click(screen.getByRole('button', { name: 'Completar acceso por correo' }));

    await screen.findByText('Negocio reclamado');
    expect(mocks.signInWithEmailLink).toHaveBeenCalledWith(
      mocks.auth, 'owner@example.com', expect.stringContaining('oobCode'),
    );
    expect(fetchMock).toHaveBeenCalledWith('/api/ownership-claims/redeem', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ token: CLAIM_TOKEN }),
    }));
    expect(mocks.writeSessionCookie).toHaveBeenCalledWith('firebase-id-token');
    expect(screen.getByRole('link', { name: 'Ir a mi dashboard' })).toHaveAttribute(
      'href', '/dashboard/business-1',
    );
  });

  it('uses Google only when selected and redeems with the verified Firebase user', async () => {
    const user = userEvent.setup();
    const firebaseUser = verifiedUser('google-uid');
    mocks.isSignInWithEmailLink.mockReturnValue(false);
    mocks.signInWithPopup.mockResolvedValue({ user: firebaseUser });
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      ok: true, businessId: 'business-google', idempotent: false,
    }), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    render(<OwnershipClaimClient enabled />);
    await user.click(screen.getByRole('button', { name: 'Continuar con Google' }));

    await screen.findByText('Negocio reclamado');
    expect(mocks.signInWithPopup).toHaveBeenCalledWith(mocks.auth, mocks.googleProvider);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('cleans and discards the fragment while flags are disabled', async () => {
    render(<OwnershipClaimClient enabled={false} />);
    await waitFor(() => expect(window.location.hash).toBe(''));
    expect(screen.getByText('Reclamación no disponible')).toBeInTheDocument();
  });
});
