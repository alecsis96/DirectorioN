import fs from 'node:fs';
import path from 'node:path';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requestPublish: vi.fn(),
  updateBusinessDetails: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
}));
vi.mock('../firebaseConfig', () => ({ db: {} }));
vi.mock('../hooks/useAuth', () => ({
  canEditBusiness: () => true,
  useAuth: () => ({
    user: { uid: 'owner-1', getIdToken: vi.fn().mockResolvedValue('token') },
    isAdmin: false,
    loading: false,
  }),
}));
vi.mock('../app/actions/businesses', () => ({
  updateBusinessDetails: mocks.updateBusinessDetails,
}));
vi.mock('../app/actions/businessActions', () => ({
  deleteBusiness: vi.fn(),
  requestPublish: mocks.requestPublish,
}));
vi.mock('../components/ImageUploader', () => ({ default: () => <div /> }));
vi.mock('../components/LogoUploader', () => ({ default: () => <div /> }));
vi.mock('../components/CoverUploader', () => ({ default: () => <div /> }));
vi.mock('../components/AddressPicker', () => ({ default: () => <div /> }));
vi.mock('../components/PaymentInfo', () => ({ default: () => <div data-testid="payment-info" /> }));
vi.mock('../components/MenuManager', () => ({ default: () => <div data-testid="menu-manager" /> }));
vi.mock('../components/FeatureUpsell', () => ({ default: () => <div data-testid="feature-upsell" /> }));
vi.mock('../components/ScarcityBadge', () => ({ default: () => <div data-testid="scarcity" /> }));

import BusinessStatusBanner from '../components/BusinessStatusBanner';
import DashboardEditor from '../components/DashboardEditor';
import type { Business } from '../types/business';

const business = {
  id: 'business-1',
  ownerId: 'owner-1',
  name: 'Pollería Magón',
  category: 'Restaurantes',
  categoryId: 'pollerias',
  plan: 'free',
  businessStatus: 'draft',
  applicationStatus: 'submitted',
  completionPercent: 40,
  missingFields: ['ubicación', 'horarios'],
  visibility: 'hidden',
} as Business;

describe('R5D status and review CTA', () => {
  afterEach(cleanup);

  it('keeps the review CTA visible for an incomplete draft', () => {
    render(<BusinessStatusBanner business={{ ...business, isPublishReady: false }} onPublish={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Enviar a revisión' })).toBeTruthy();
  });

  it('keeps the review CTA visible for a complete draft', () => {
    render(<BusinessStatusBanner business={{ ...business, completionPercent: 100, missingFields: [], isPublishReady: true }} onPublish={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Enviar a revisión' })).toBeTruthy();
    expect(screen.getByText('100%')).toBeTruthy();
  });

  it('delegates validation to the publish action when the CTA is pressed', async () => {
    const publish = vi.fn();
    render(<BusinessStatusBanner business={business} onPublish={publish} />);
    fireEvent.click(screen.getByRole('button', { name: 'Enviar a revisión' }));
    await waitFor(() => expect(publish).toHaveBeenCalledTimes(1));
  });

  it('does not offer review submission while in review', () => {
    render(<BusinessStatusBanner business={{ ...business, businessStatus: 'in_review' }} onPublish={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Enviar a revisión' })).toBeNull();
    expect(screen.getByText('En revisión')).toBeTruthy();
  });

  it('does not offer review submission when published', () => {
    render(<BusinessStatusBanner business={{ ...business, businessStatus: 'published' }} onPublish={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Enviar a revisión' })).toBeNull();
    expect(screen.getByText('Publicado')).toBeTruthy();
  });

  it('shows concise completion and missing-field guidance', () => {
    render(<BusinessStatusBanner business={business} onPublish={vi.fn()} />);
    expect(screen.getByText('Perfil completado')).toBeTruthy();
    expect(screen.getByText('Falta completar:')).toBeTruthy();
    expect(screen.getByText('• ubicación')).toBeTruthy();
  });
});

describe('R5D mobile editor workspace', () => {
  beforeEach(() => {
    mocks.requestPublish.mockReset();
    mocks.updateBusinessDetails.mockReset();
  });
  afterEach(cleanup);

  it('renders its own compact header and four non-scrolling sections', () => {
    render(<DashboardEditor businessId={business.id} initialBusiness={business} />);
    expect(screen.getByRole('button', { name: 'Volver a Mis negocios' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Vista previa' })).toBeTruthy();
    expect(screen.getByRole('navigation', { name: 'Secciones del editor' }).className).not.toContain('overflow-x');
    expect(screen.getAllByRole('button', { name: /Info|Operación|Catálogo|Gestión/ })).toHaveLength(4);
  });

  it('does not show a save bar while the form is clean', () => {
    render(<DashboardEditor businessId={business.id} initialBusiness={business} />);
    expect(screen.queryByText('Cambios sin guardar')).toBeNull();
  });

  it('shows the compact save bar only after an edit', async () => {
    render(<DashboardEditor businessId={business.id} initialBusiness={business} />);
    await new Promise(resolve => setTimeout(resolve, 50));
    fireEvent.change(screen.getByPlaceholderText('Nombre del negocio'), { target: { value: 'Nuevo nombre' } });
    await waitFor(() => expect(screen.getByText('Cambios sin guardar')).toBeTruthy());
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeTruthy();
  });

  it('does not submit a stale version when there are unsaved changes', async () => {
    render(<DashboardEditor businessId={business.id} initialBusiness={business} />);
    await new Promise(resolve => setTimeout(resolve, 50));
    fireEvent.change(screen.getByPlaceholderText('Nombre del negocio'), { target: { value: 'Nuevo nombre' } });
    await waitFor(() => expect(screen.getByText('Cambios sin guardar')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Enviar a revisión' }));
    await waitFor(() => expect(screen.getByText('Guarda tus cambios antes de enviar el negocio a revisión.')).toBeTruthy());
    expect(mocks.requestPublish).not.toHaveBeenCalled();
  });

  it('shows server-reported missing fields after an incomplete submission attempt', async () => {
    mocks.requestPublish.mockResolvedValueOnce({
      success: false,
      error: 'Completa los campos indicados.',
      missingFields: ['descripción', 'horarios'],
    });
    render(<DashboardEditor
      businessId={business.id}
      initialBusiness={{ ...business, missingFields: [] } as Business}
    />);
    fireEvent.click(screen.getByRole('button', { name: 'Enviar a revisión' }));
    await waitFor(() => expect(mocks.requestPublish).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('• descripción')).toBeTruthy();
    expect(screen.getByText('• horarios')).toBeTruthy();
  });

  it('hides commercial controls while monetization is disabled', () => {
    render(<DashboardEditor businessId={business.id} initialBusiness={business} />);
    expect(screen.queryByText('Planes y precios')).toBeNull();
    expect(screen.queryByTestId('payment-info')).toBeNull();
    expect(screen.queryByText('Datos para transferencia:')).toBeNull();
  });

  it('does not expose owner, internal id or technical category copy', () => {
    render(<DashboardEditor businessId={business.id} initialBusiness={business} />);
    expect(screen.queryByText(/Propietario:/)).toBeNull();
    expect(screen.queryByText(/ID: business-1/)).toBeNull();
    expect(screen.queryByText(/slug estable/)).toBeNull();
  });

  it('hides public navigation specifically inside a business dashboard', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'components/Navigation.tsx'), 'utf8');
    expect(source).toContain("pathname?.startsWith('/dashboard/')");
    expect(source.indexOf("pathname?.startsWith('/dashboard/')")).toBeLessThan(source.indexOf("pathname?.startsWith('/admin')"));
  });

  it('returns before either public appbar or bottom navigation can render', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'components/Navigation.tsx'), 'utf8');
    const dashboardGuard = source.indexOf("pathname?.startsWith('/dashboard/')");
    expect(dashboardGuard).toBeGreaterThan(-1);
    expect(dashboardGuard).toBeLessThan(source.lastIndexOf('Inicio'));
    expect(dashboardGuard).toBeLessThan(source.lastIndexOf('Favoritos'));
  });
});
