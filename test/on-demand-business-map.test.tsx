import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ load: vi.fn(async () => undefined), map: vi.fn() }));
vi.mock('../lib/googleMapsLoader', () => ({ loadGoogleMapsSdk: mocks.load }));
import OnDemandBusinessMap from '../components/OnDemandBusinessMap';

const business = { id: 'business-1', name: 'Prueba', address: 'Centro', location: { lat: 16.9, lng: -92.3 } } as any;

beforeEach(() => {
  vi.clearAllMocks();
  (window as any).google = { maps: { Map: mocks.map } };
});

describe('OnDemandBusinessMap', () => {
  it('does not include the Google SDK in the global provider or mount a map directly from the detail view', () => {
    const providers = readFileSync(resolve(process.cwd(), 'components/Providers.tsx'), 'utf8');
    const detail = readFileSync(resolve(process.cwd(), 'components/BusinessDetailView.tsx'), 'utf8');
    expect(providers).not.toContain('maps.googleapis.com/maps/api/js');
    expect(providers).not.toContain('next/script');
    expect(detail).toContain('<OnDemandBusinessMap');
    expect(detail).not.toContain('<BusinessMapComponent');
  });

  it('does not load or mount Maps when the modal opens or closes without a click', () => {
    const view = render(<OnDemandBusinessMap business={business} apiKey="key" externalHref="https://maps.google.com/test" />);
    expect(mocks.load).not.toHaveBeenCalled();
    expect(screen.queryByTestId('interactive-business-map')).not.toBeInTheDocument();
    view.unmount();
    expect(mocks.load).not.toHaveBeenCalled();
  });

  it('starts loading and mounts the map only after Ver mapa', async () => {
    render(<OnDemandBusinessMap business={business} apiKey="key" externalHref="https://maps.google.com/test" />);
    fireEvent.click(screen.getByRole('button', { name: 'Ver mapa' }));
    expect(await screen.findByTestId('interactive-business-map')).toBeInTheDocument();
    await waitFor(() => expect(mocks.load).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mocks.map).toHaveBeenCalledTimes(1));
  });

  it('never attempts the SDK without an API key and preserves the external option', () => {
    render(<OnDemandBusinessMap business={business} apiKey={null} externalHref="https://maps.google.com/test" />);
    expect(screen.queryByRole('button', { name: 'Ver mapa' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Cómo llegar en Google Maps' })).toHaveAttribute('href', 'https://maps.google.com/test');
    expect(mocks.load).not.toHaveBeenCalled();
  });
});
