import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
vi.mock('firebase/auth', () => ({ isSignInWithEmailLink: () => false, signInWithEmailLink: vi.fn(), signInWithEmailAndPassword: vi.fn() }));
vi.mock('../firebaseConfig', () => ({ auth: {} }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }) }));
import EmailLinkLogin from '../components/EmailLinkLogin';

it('allows changing a remembered email and does not let a late context overwrite that choice', async () => {
  let resolve!: (value: Response) => void;
  vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(done => { resolve = done; })));
  render(<EmailLinkLogin initialEmail="old@example.com" />);
  await userEvent.click(screen.getByRole('button', { name: 'Usar otro correo' }));
  await userEvent.type(screen.getByLabelText('Correo electrónico'), 'new@example.com');
  resolve(new Response(JSON.stringify({ ok: true, email: 'old@example.com' })));
  await waitFor(() => expect(screen.getByLabelText('Correo electrónico')).toHaveValue('new@example.com'));
  expect(screen.queryByText('old@example.com')).not.toBeInTheDocument();
});
