import fs from 'node:fs';
import path from 'node:path';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock('../firebaseConfig', () => ({ auth: { currentUser: { getIdToken: vi.fn().mockResolvedValue('admin-token') } } }));
vi.mock('../app/actions/adminBusinessActions', () => ({ approveApplicationV2: vi.fn() }));

import AdminApplicationsOperations from '../components/admin/applications/AdminApplicationsOperations';
import AdminBusinessesOperations, { type AdminBusinessRecord } from '../components/admin/businesses/AdminBusinessesOperations';

const businesses: AdminBusinessRecord[] = [
  { id: 'review', name: 'Por revisar', category: 'Comida', businessStatus: 'in_review', isActive: false, adminStatus: 'active', submittedAt: '2026-09-09T10:00:00.000Z' },
  { id: 'published', name: 'Ya publicado', category: 'Servicios', businessStatus: 'published', isActive: true, adminStatus: 'active', submittedAt: null },
  { id: 'draft', name: 'En borrador', category: null, businessStatus: 'draft', isActive: true, adminStatus: 'active', submittedAt: null },
];

afterEach(cleanup);

describe('R5E-A admin operational boundaries', () => {
  it('shows a new application only in Solicitudes', () => {
    render(<AdminApplicationsOperations applications={[{ id: 'a1', name: 'Solicitud nueva', category: null, status: 'submitted', schemaVersion: 2, createdAt: null }]} />);
    expect(screen.getByText('Solicitud nueva')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Aprobar solicitud' })).toBeTruthy();
  });

  it('shows in_review in Negocios by default', () => {
    render(<AdminBusinessesOperations businesses={businesses} />);
    expect(screen.getByText('Por revisar')).toBeTruthy();
    expect(screen.getAllByText('En revisión')).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'Activar' })).toBeNull();
    expect(screen.queryByText('Ya publicado')).toBeNull();
  });

  it('does not model in_review as a Solicitudes filter or action', () => {
    render(<AdminApplicationsOperations applications={[]} />);
    expect(screen.queryByRole('tab', { name: 'En revisión' })).toBeNull();
  });

  it('keeps the legacy pending route as an exact redirect', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'app/admin/pending-businesses/page.tsx'), 'utf8');
    expect(source).toContain("redirect('/admin/businesses?status=in_review')");
  });

  it('labels the final review action Publicar and never Aprobar', () => {
    render(<AdminBusinessesOperations businesses={businesses} />);
    expect(screen.getByRole('button', { name: 'Publicar' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Aprobar/ })).toBeNull();
  });

  it('removes Inbox and pending businesses from operational navigation', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'components/admin/shared/AdminSidebar.tsx'), 'utf8');
    expect(source).not.toContain("label: 'Inbox'");
    expect(source).not.toContain("href: '/admin/pending-businesses'");
    expect(source).toContain("label: 'Panel'");
  });

  it('does not render plan filters or controls', () => {
    render(<AdminBusinessesOperations businesses={businesses} />);
    expect(screen.queryByText('Todos los planes')).toBeNull();
    expect(screen.queryByText('Perfil base')).toBeNull();
    expect(screen.queryByText('Premium')).toBeNull();
  });

  it('keeps published businesses administrable', () => {
    render(<AdminBusinessesOperations businesses={businesses} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Publicados' }));
    expect(screen.getByText('Ya publicado')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Ver' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Pausar' })).toBeTruthy();
  });

  it('keeps drafts visible through their canonical filter', () => {
    render(<AdminBusinessesOperations businesses={businesses} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Borradores' }));
    expect(screen.getByText('En borrador')).toBeTruthy();
    expect(screen.getByText('Borrador')).toBeTruthy();
  });

  it('retains server-side admin authorization on every entry page', () => {
    for (const file of ['app/admin/(operations)/page.tsx', 'app/admin/(operations)/solicitudes/page.tsx', 'app/admin/businesses/page.tsx', 'app/admin/pending-businesses/page.tsx']) {
      expect(fs.readFileSync(path.join(process.cwd(), file), 'utf8')).toContain('requireAdminPage(');
    }
  });
});
