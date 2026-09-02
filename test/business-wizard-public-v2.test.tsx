import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  signInWithGoogle: vi.fn(),
  onAuthStateChanged: vi.fn(() => () => {}),
  submitLegacy: vi.fn(),
  createBusiness: vi.fn(),
}));

vi.mock('../firebaseConfig', () => ({
  auth: { currentUser: null, onAuthStateChanged: mocks.onAuthStateChanged },
  db: {},
  signInWithGoogle: mocks.signInWithGoogle,
}));

vi.mock('../app/actions/businesses', () => ({ submitNewBusiness: mocks.submitLegacy }));
vi.mock('../app/actions/businessActions', () => ({ createBusinessImmediately: mocks.createBusiness }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
}));

import BusinessWizard from '../components/BusinessWizard';

describe('0.2R.2 public wizard branch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      ok: true,
      received: true,
      folio: 'YJG-2026-TEST2345',
    }), { status: 200, headers: { 'content-type': 'application/json' } })));
  });

  it('advances without Google or remote calls, then submits once and shows the safe confirmation', async () => {
    const user = userEvent.setup();
    render(<BusinessWizard publicApplicationV2Enabled />);

    expect(await screen.findByRole('heading', { level: 1, name: /solicitud de registro/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /iniciar sesión/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /guardar borrador/i })).not.toBeInTheDocument();
    expect(screen.getByText('Categoría', { selector: 'label' })).toBeInTheDocument();
    expect(screen.getByText('Tipo de negocio', { selector: 'label' })).toBeInTheDocument();

    await user.type(screen.getByLabelText(/tu nombre completo/i), 'Persona responsable');
    await user.type(screen.getByLabelText(/tu correo electrónico/i), 'contacto@example.com');
    await user.type(screen.getByLabelText(/^tu teléfono/i), '9191234567');
    await user.type(screen.getByLabelText(/nombre del negocio/i), 'Negocio público');

    const selects = screen.getAllByRole('combobox');
    await user.selectOptions(selects[0], 'food');
    let availableOption: HTMLOptionElement | undefined;
    await waitFor(() => {
      availableOption = [...screen.getAllByRole('combobox')[1].querySelectorAll('option')].find((option) => option.value);
      expect(availableOption).toBeTruthy();
    });
    await user.selectOptions(screen.getAllByRole('combobox')[1], availableOption!.value);

    await user.click(screen.getByRole('button', { name: /siguiente/i }));
    expect(await screen.findByText(/resumen de tu solicitud/i)).toBeInTheDocument();
    expect(mocks.signInWithGoogle).not.toHaveBeenCalled();
    expect(mocks.submitLegacy).not.toHaveBeenCalled();
    expect(mocks.createBusiness).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();

    await user.click(screen.getByRole('checkbox', { name: /confirmo que la información/i }));
    await user.click(screen.getByRole('button', { name: /enviar solicitud/i }));

    expect(await screen.findByTestId('public-application-confirmation')).toHaveTextContent('24–48 horas');
    expect(screen.getByTestId('public-application-confirmation')).toHaveTextContent('contacto@example.com');
    expect(screen.getByTestId('public-application-confirmation')).toHaveTextContent('YJG-2026-TEST2345');
    expect(screen.queryByText(/dashboard/i)).not.toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(mocks.onAuthStateChanged).not.toHaveBeenCalled();
    expect(mocks.signInWithGoogle).not.toHaveBeenCalled();

    const [, request] = vi.mocked(fetch).mock.calls[0];
    const body = JSON.parse(String(request?.body));
    expect(body).not.toHaveProperty('ownerId');
    expect(body).not.toHaveProperty('ownerUid');
    expect(body).not.toHaveProperty('status');
    expect(body).not.toHaveProperty('businessId');
  });

  it('reuses phone values without requiring duplicate typing', async () => {
    const user = userEvent.setup();
    render(<BusinessWizard publicApplicationV2Enabled />);
    await screen.findByRole('heading', { level: 1, name: /solicitud de registro/i });
    await user.type(screen.getByLabelText(/^tu teléfono/i), '9191234567');
    await user.click(screen.getByRole('checkbox', { name: /usar este número como teléfono/i }));
    await waitFor(() => expect(screen.getByLabelText(/^teléfono del negocio$/i)).toHaveValue('9191234567'));
    await user.click(screen.getByRole('checkbox', { name: /usar este número también para WhatsApp/i }));
    await waitFor(() => expect(screen.getByLabelText(/^whatsapp del negocio$/i)).toHaveValue('9191234567'));
  });

  it('preserves the legacy Google-gated path when the flag is off', async () => {
    const user = userEvent.setup();
    render(<BusinessWizard />);
    await screen.findByRole('heading', { level: 1, name: /solicitud de registro/i });

    await user.type(screen.getByLabelText(/tu nombre completo/i), 'Usuario legacy');
    await user.type(screen.getByLabelText(/tu correo electrónico/i), 'legacy@example.com');
    await user.type(screen.getByLabelText(/^tu teléfono$/i), '9191234567');
    await user.type(screen.getByLabelText(/nombre del negocio/i), 'Negocio legacy');
    await user.click(screen.getByRole('button', { name: /siguiente/i }));

    await waitFor(() => expect(mocks.signInWithGoogle).toHaveBeenCalledOnce());
    expect(fetch).not.toHaveBeenCalled();
    expect(mocks.createBusiness).not.toHaveBeenCalled();
  });
});
