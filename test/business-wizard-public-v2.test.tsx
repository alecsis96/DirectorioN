import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  signInWithGoogle: vi.fn(), onAuthStateChanged: vi.fn(() => () => {}), submitLegacy: vi.fn(), createBusiness: vi.fn(),
}));

vi.mock('../firebaseConfig', () => ({
  auth: { currentUser: null, onAuthStateChanged: mocks.onAuthStateChanged }, db: {}, signInWithGoogle: mocks.signInWithGoogle,
}));
vi.mock('../app/actions/businesses', () => ({ submitNewBusiness: mocks.submitLegacy }));
vi.mock('../app/actions/businessActions', () => ({ createBusinessImmediately: mocks.createBusiness }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }), useSearchParams: () => ({ get: () => null }) }));

import BusinessWizard from '../components/BusinessWizard';
import { getCategoriesByGroup } from '../lib/categoriesCatalog';

const input = (name: string) => document.querySelector<HTMLInputElement>(`input[name="${name}"]`)!;

async function fillIdentityAndBusiness(user: ReturnType<typeof userEvent.setup>) {
  await user.type(input('ownerName'), 'Oscar González');
  await user.type(input('ownerEmail'), 'oscar@example.com');
  await user.type(input('ownerPhone'), '9611234567');
  await user.type(input('businessName'), 'Pollería Magón');
}

async function chooseCategory(user: ReturnType<typeof userEvent.setup>, group = 'food', type = 'polleria_rosticeria') {
  await user.selectOptions(screen.getByLabelText('Categoría'), group);
  await user.selectOptions(screen.getByLabelText('Tipo de negocio'), type);
}

function submittedPayload() {
  const [, request] = vi.mocked(fetch).mock.calls[0];
  return JSON.parse(String(request?.body));
}

describe('0.2R.5A simplified public business wizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ ok: true, received: true, folio: 'YJG-2026-TEST2345' }), {
      status: 200, headers: { 'content-type': 'application/json' },
    })));
  });

  it('reuses the personal phone as business contact by default', async () => {
    const user = userEvent.setup(); render(<BusinessWizard publicApplicationV2Enabled />);
    expect(await screen.findByRole('heading', { level: 1, name: 'Registra tu negocio' })).toBeInTheDocument();
    await user.type(input('ownerPhone'), '9611234567');
    expect(screen.getByRole('checkbox', { name: 'Usar este número para mi negocio' })).toBeChecked();
    expect(screen.queryByLabelText('Contacto del negocio')).not.toBeInTheDocument();
  });

  it('allows a different business contact without a separate WhatsApp input', async () => {
    const user = userEvent.setup(); render(<BusinessWizard publicApplicationV2Enabled />);
    await screen.findByRole('heading', { name: 'Registra tu negocio' });
    await user.click(screen.getByRole('checkbox', { name: 'Usar este número para mi negocio' }));
    await user.type(screen.getByLabelText('Contacto del negocio'), '9197654321');
    expect(screen.getByLabelText('Contacto del negocio')).toHaveValue('9197654321');
    expect(screen.queryByLabelText(/WhatsApp del negocio/i)).not.toBeInTheDocument();
  });

  it('maps the selected business contact to WhatsApp without duplicate typing', async () => {
    const user = userEvent.setup(); render(<BusinessWizard publicApplicationV2Enabled />);
    await fillIdentityAndBusiness(user); await chooseCategory(user);
    expect(screen.getByRole('checkbox', { name: 'Este número tiene WhatsApp' })).toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(await screen.findByTestId('application-summary')).toHaveTextContent('WhatsApp: 9611234567');
  });

  it('requires category before advancing', async () => {
    const user = userEvent.setup(); render(<BusinessWizard publicApplicationV2Enabled />);
    await fillIdentityAndBusiness(user); await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(await screen.findByText('Selecciona una categoría', { selector: 'span' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Revisar información' })).not.toBeInTheDocument();
  });

  it('requires business type before advancing', async () => {
    const user = userEvent.setup(); render(<BusinessWizard publicApplicationV2Enabled />);
    await fillIdentityAndBusiness(user); await user.selectOptions(screen.getByLabelText('Categoría'), 'food');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(await screen.findByText('Selecciona un tipo de negocio')).toBeInTheDocument();
  });

  it('updates and clears business type when category changes', async () => {
    const user = userEvent.setup(); render(<BusinessWizard publicApplicationV2Enabled />);
    const category = await screen.findByLabelText('Categoría'); const type = screen.getByLabelText('Tipo de negocio');
    await user.selectOptions(category, 'food'); await user.selectOptions(type, 'polleria_rosticeria'); await user.selectOptions(category, 'services');
    expect(type).toHaveValue('');
    const values = within(type).getAllByRole('option').map(option => (option as HTMLOptionElement).value).filter(Boolean);
    expect(values).toEqual(getCategoriesByGroup('services').map(item => item.id));
    expect(values).not.toContain('polleria_rosticeria');
  });

  it('shows the concise owner and business summary on step two', async () => {
    const user = userEvent.setup(); render(<BusinessWizard publicApplicationV2Enabled />);
    await fillIdentityAndBusiness(user); await chooseCategory(user); await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    const summary = await screen.findByTestId('application-summary');
    expect(summary).toHaveTextContent('Oscar González'); expect(summary).toHaveTextContent('oscar@example.com');
    expect(summary).toHaveTextContent('Pollería Magón'); expect(summary).toHaveTextContent('Comida y Bebida · Pollería / Rosticería');
    expect(summary).toHaveTextContent('Contacto: 9611234567'); expect(screen.getByRole('button', { name: 'Volver' })).toBeEnabled();
    expect(screen.queryByText('¿Qué sigue?')).not.toBeInTheDocument();
  });

  it('keeps the Public Application v2 payload and creates no Firebase user', async () => {
    const user = userEvent.setup(); render(<BusinessWizard publicApplicationV2Enabled />);
    await fillIdentityAndBusiness(user); await chooseCategory(user); await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('button', { name: 'Enviar solicitud' })); await screen.findByTestId('public-application-confirmation');
    expect(submittedPayload()).toEqual({
      ownerName: 'Oscar González', ownerEmail: 'oscar@example.com', ownerPhone: '9611234567',
      business: { businessName: 'Pollería Magón', category: 'Pollería / Rosticería', categoryId: 'polleria_rosticeria', categoryGroupId: 'food', phone: '9611234567', whatsapp: '9611234567' },
      contactWebsite: '',
    });
    expect(mocks.onAuthStateChanged).not.toHaveBeenCalled(); expect(mocks.signInWithGoogle).not.toHaveBeenCalled(); expect(mocks.createBusiness).not.toHaveBeenCalled();
  });

  it('keeps submission blocked when Turnstile enforce has no token', async () => {
    const user = userEvent.setup(); render(<BusinessWizard publicApplicationV2Enabled turnstileMode="enforce" turnstileSiteKey="" />);
    await fillIdentityAndBusiness(user); await chooseCategory(user); await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(await screen.findByText(/verificación de seguridad no está disponible/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar solicitud' })).toBeDisabled(); expect(fetch).not.toHaveBeenCalled();
  });

  it('preserves the legacy Google-gated path when Public Application v2 is off', async () => {
    const user = userEvent.setup(); render(<BusinessWizard />); await screen.findByRole('heading', { name: 'Registra tu negocio' });
    await fillIdentityAndBusiness(user); await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await waitFor(() => expect(mocks.signInWithGoogle).toHaveBeenCalledOnce()); expect(fetch).not.toHaveBeenCalled();
  });
});
