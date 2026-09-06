'use client';

import { useState } from 'react';
import type { Business } from '../types/business';
import BusinessMapComponent from './BusinessMapComponent';

export default function OnDemandBusinessMap({ business, apiKey, externalHref, disabled = false, onExternalClick }: {
  business: Business; apiKey: string | null; externalHref: string | null; disabled?: boolean; onExternalClick?: () => void;
}) {
  const [showMap, setShowMap] = useState(false);
  const lat = business.location?.lat, lng = business.location?.lng;
  const coordinates = typeof lat === 'number' && Number.isFinite(lat) && typeof lng === 'number' && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  const canLoad = Boolean(apiKey && coordinates && !disabled);
  return <div className="space-y-4">
    {business.address && <p className="text-gray-700">{business.address}</p>}
    {!showMap && canLoad && <button type="button" onClick={() => setShowMap(true)} className="rounded-lg bg-[#38761D] px-6 py-3 font-semibold text-white">Ver mapa</button>}
    {showMap && canLoad && <BusinessMapComponent business={business} apiKey={apiKey!} />}
    {externalHref && <a href={externalHref} target="_blank" rel="noopener noreferrer" onClick={onExternalClick} className="inline-flex rounded-lg border border-gray-300 px-6 py-3 font-semibold text-[#38761D]">Cómo llegar en Google Maps</a>}
    {!apiKey && <p className="text-sm text-gray-500">Consulta la ubicación mediante Google Maps.</p>}
  </div>;
}
