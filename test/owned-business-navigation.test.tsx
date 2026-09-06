import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveOwnedBusinessStatus } from '../lib/ownedBusinessPresentation';

const mocks = vi.hoisted(() => ({
  user: { uid: 'owner-uid' },
  getIdToken: vi.fn(async () => 'owner-token'),
  push: vi.fn(),
}));
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: mocks.user, loading: false }) }));
vi.mock('firebase/auth', () => ({ getIdToken: mocks.getIdToken }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('next/link', () => ({ default: ({ href, children, ...props }: any) => <a href={href} {...props}>{children}</a> }));
import MisNegociosPage from '../app/mis-negocios/page';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
    businesses: [{
      id: 'claimed-business', name: 'Negocio reclamado', category: 'Servicios', plan: 'free',
      canManage: true, status: 'draft', businessStatus: 'published',
      visibility: 'published', completionPercent: 20, views: 0, rating: 0,
    }],
    applications: [],
  }), { status: 200 })));
});

describe('owned business navigation', () => {
  it('uses v2 publication state ahead of the legacy draft field', () => {
    expect(resolveOwnedBusinessStatus({ status: 'draft', businessStatus: 'published', visibility: 'published' })).toBe('published');
    expect(resolveOwnedBusinessStatus({ status: 'draft', businessStatus: 'in_review' })).toBe('review');
    expect(resolveOwnedBusinessStatus({ status: 'approved' })).toBe('approved');
  });

  it('shows Gestionar for the server-confirmed owner even when legacy status is draft and the profile is incomplete', async () => {
    render(<MisNegociosPage />);
    const manage = await screen.findByRole('link', { name: /Gestionar negocio/i });
    expect(manage).toHaveAttribute('href', '/dashboard/claimed-business');
    expect(screen.getByText('✓ Publicado')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Ver Estado/i })).not.toBeInTheDocument();
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/my-businesses', expect.objectContaining({
      headers: { Authorization: 'Bearer owner-token' },
    })));
  });

  it('derives management only from the UID-scoped private endpoint', () => {
    const route = source('app/api/my-businesses/route.ts');
    const page = source('app/mis-negocios/page.tsx');
    const detail = source('components/BusinessDetailView.tsx');
    const publicTypes = source('types/business.ts');
    const publicData = source('lib/server/businessData.ts');
    expect(route).toContain("where('ownerId', '==', uid)");
    expect(route).toContain('canManage: business.ownerId === uid');
    expect(route).toContain('ownerId: _ownerId');
    expect(page).toContain('canManage: biz.canManage === true');
    expect(page).toContain('{business.canManage ? (');
    expect(page).not.toMatch(/ownerEmail[\s\S]{0,100}canManage/);
    expect(detail).not.toContain('business.ownerId');
    expect(detail).toContain('const canManage = isOwnedBySession &&');
    expect(publicTypes).not.toContain('ownerId: biz.ownerId');
    expect(publicData).not.toContain('business.ownerId =');
  });
});
