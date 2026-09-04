import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  link: vi.fn(),
  auth: { currentUser: { uid: 'owner', providerData: [] as { providerId: string }[] }, authStateReady: vi.fn(async () => {}) },
  provider: {},
}));
vi.mock('firebase/auth', () => ({ linkWithPopup: mocks.link }));
vi.mock('../firebaseConfig', () => ({ auth: mocks.auth, googleProvider: mocks.provider }));
import ClaimGoogleLink from '../components/ClaimGoogleLink';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.currentUser = { uid: 'owner', providerData: [] };
});

it('a Google credential collision keeps the current UID and allows continuing', async () => {
  mocks.link.mockRejectedValueOnce({ code: 'auth/credential-already-in-use' });
  render(<ClaimGoogleLink ownerId="owner" />);
  await userEvent.click(await screen.findByRole('button', { name: 'Vincular Google' }));
  expect(mocks.link).toHaveBeenCalledWith(mocks.auth.currentUser, mocks.provider);
  expect(await screen.findByRole('status')).toHaveTextContent('Tu negocio sigue en tu cuenta');
  expect(mocks.auth.currentUser.uid).toBe('owner');
  await userEvent.click(screen.getByRole('button', { name: 'Ahora no' }));
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});

it('does not link after the browser session switches to another UID', async () => {
  render(<ClaimGoogleLink ownerId="owner" />);
  const button = await screen.findByRole('button', { name: 'Vincular Google' });
  mocks.auth.currentUser = { uid: 'other', providerData: [] };
  await userEvent.click(button);
  expect(mocks.link).not.toHaveBeenCalled();
});

it('keeps Google optional for an account that is already linked', async () => {
  mocks.auth.currentUser.providerData = [{ providerId: 'google.com' }];
  const { container } = render(<ClaimGoogleLink ownerId="owner" />);
  await waitFor(() => expect(mocks.auth.authStateReady).toHaveBeenCalled());
  expect(container).toBeEmptyDOMElement();
  expect(mocks.link).not.toHaveBeenCalled();
});
