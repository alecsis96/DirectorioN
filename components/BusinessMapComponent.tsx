'use client';

import { useEffect, useRef, useState } from 'react';
import type { Business } from '../types/business';
import { loadGoogleMapsSdk } from '../lib/googleMapsLoader';

export default function BusinessMapComponent({ business, apiKey, height = '400px', zoom = 16 }: {
  business: Business; apiKey: string; height?: string; zoom?: number;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  useEffect(() => {
    let active = true;
    const lat = business.location?.lat, lng = business.location?.lng;
    if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      setStatus('error'); return;
    }
    void loadGoogleMapsSdk(apiKey).then(() => {
      if (!active || !container.current) return;
      new google.maps.Map(container.current, {
        center: { lat, lng }, zoom, mapTypeControl: false, streetViewControl: false, fullscreenControl: false,
      });
      setStatus('ready');
    }).catch(() => { if (active) setStatus('error'); });
    return () => { active = false; };
  }, [apiKey, business.location?.lat, business.location?.lng, zoom]);

  return <div className="relative" style={{ height }} data-testid="interactive-business-map">
    <div ref={container} className="h-full w-full rounded-xl" />
    {status === 'loading' && <div role="status" className="absolute inset-0 flex items-center justify-center bg-gray-100">Cargando mapa…</div>}
    {status === 'error' && <div role="alert" className="absolute inset-0 flex items-center justify-center bg-gray-50 text-gray-600">No fue posible cargar el mapa.</div>}
  </div>;
}
