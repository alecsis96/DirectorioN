import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import AdminRecordsObservability from '../components/admin/observability/AdminRecordsObservability';
import { buildAdminObservability } from '../lib/adminObservability';

const data = buildAdminObservability([
  { id: 'approved-app', data: { status: 'approved', businessName: 'Aprobada sin negocio', businessId: 'missing' } },
  { id: 'needs-app', data: { status: 'needs_info', businessName: 'Necesita datos' } },
  { id: 'deleted-app', data: { status: 'deleted', businessName: 'Solicitud eliminada' } },
], [
  { id: 'draft-business', data: { name: 'Borrador localizable', businessStatus: 'draft', visibility: 'hidden' } },
  { id: 'published-business', data: { name: 'Publicado', businessStatus: 'published', status: 'published', ownerId: 'private-owner' } },
  { id: 'deleted-business', data: { name: 'Negocio eliminado', businessStatus: 'deleted', adminStatus: 'deleted' } },
]);

describe('admin records observability', () => {
  it('is served only behind the admin guard and performs collection reads only', () => {
    const page = readFileSync(resolve(process.cwd(), 'app/admin/observabilidad/page.tsx'), 'utf8');
    expect(page).toContain('await requireAdminPage()');
    expect(page).toContain("db.collection('applications').get()");
    expect(page).toContain("db.collection('businesses').get()");
    expect(page).not.toMatch(/\.(?:set|update|delete|create)\(/);
  });

  it('keeps owner identifiers out of the admin client projection', () => {
    expect(data.businesses[1]).toMatchObject({ ownerPresent: true });
    expect(data.businesses[1]).not.toHaveProperty('ownerId');
    expect(data.businesses[1]).not.toHaveProperty('ownerUid');
  });

  it('locates approved, needs_info and deleted applications', async () => {
    const user = userEvent.setup();
    render(<AdminRecordsObservability {...data} />);
    await user.click(screen.getByRole('button', { name: 'Aprobadas' }));
    expect(screen.getByText('Aprobada sin negocio')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Necesita información' }));
    expect(screen.getByText('Necesita datos')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Eliminadas' }));
    expect(screen.getByText('Solicitud eliminada')).toBeInTheDocument();
  });

  it('locates a draft, hidden and ownerless business and exposes its attention reason', async () => {
    const user = userEvent.setup();
    render(<AdminRecordsObservability {...data} />);
    const businesses = screen.getByRole('region', { name: 'Businesses' });
    await user.click(within(businesses).getByRole('button', { name: 'Borradores' }));
    expect(screen.getByText('Borrador localizable')).toBeInTheDocument();
    await user.click(within(businesses).getByRole('button', { name: 'Ocultos' }));
    expect(screen.getByText('Borrador localizable')).toBeInTheDocument();
    await user.click(within(businesses).getByRole('button', { name: 'Sin propietario' }));
    expect(screen.getByText('Borrador localizable')).toBeInTheDocument();
    await user.click(within(businesses).getByRole('button', { name: 'Eliminados' }));
    expect(screen.getByText('Negocio eliminado')).toBeInTheDocument();
    await user.click(within(businesses).getByRole('button', { name: 'Requiere atención' }));
    const draftCard = screen.getByText('Borrador localizable').closest('article');
    expect(draftCard).not.toBeNull();
    expect(within(draftCard!).getByText(/Sin propietario y no publicado/)).toBeInTheDocument();
  });

  it('flags incomplete relations without mutating the source records', () => {
    expect(data.applications[0].attention).toContain('APPROVED_BUSINESS_MISSING');
    expect(data.businesses[0].attention).toContain('OWNERLESS_NON_PUBLISHED');
  });

  it('detects invalid inverse links and legacy state contradictions', () => {
    const inconsistent = buildAdminObservability([
      { id: 'application-a', data: { schemaVersion: 2, status: 'approved', businessId: 'business-a' } },
    ], [
      { id: 'business-a', data: { businessStatus: 'published', status: 'draft', sourceApplicationId: 'missing-application', ownerId: 'private' } },
    ]);
    expect(inconsistent.applications[0].attention).toContain('APPLICATION_BUSINESS_SOURCE_MISMATCH');
    expect(inconsistent.businesses[0].attention).toEqual(expect.arrayContaining([
      'INVALID_SOURCE_APPLICATION', 'LEGACY_STATUS_MISMATCH',
    ]));
  });

  it('does not flag an ownerless legacy publication as unpublished', () => {
    const legacy = buildAdminObservability([], [
      { id: 'legacy-public', data: { name: 'Legacy visible', status: 'published' } },
    ]);
    expect(legacy.businesses[0].businessStatus).toBe('unknown');
    expect(legacy.businesses[0].attention).not.toContain('OWNERLESS_NON_PUBLISHED');
  });
});
