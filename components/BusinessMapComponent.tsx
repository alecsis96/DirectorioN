'use client';

import { useState } from 'react';
import { Business } from '../types/business';

interface BusinessMapProps {
  business: Business;
  height?: string;
  zoom?: number;
}

export default function BusinessMapComponent({ business, height = '400px', zoom = 16 }: BusinessMapProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  
  // Validar que lat/lng sean números válidos
  const lat = business.location?.lat;
  const lng = business.location?.lng;
  const hasValidCoordinates = 
    typeof lat === 'number' && 
    typeof lng === 'number' && 
    !isNaN(lat) && 
    !isNaN(lng) &&
    lat >= -90 && lat <= 90 &&
    lng >= -180 && lng <= 180;
  
  // URL del mapa embebido usando maps.google.com que es más permisivo
  const mapUrl = hasValidCoordinates
    ? `https://maps.google.com/maps?q=${lat},${lng}&z=${zoom}&output=embed`
    : `https://maps.google.com/maps?q=${encodeURIComponent(business.address || business.name + ' Yajalón, Chiapas')}&output=embed`;

  const directionsUrl = hasValidCoordinates
    ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.address || business.name + ' Yajalón')}`;

  const openInMapsUrl = hasValidCoordinates
    ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.address || business.name + ' Yajalón')}`;

  return (
    <div className="relative" style={{ height }}>
      {isLoading && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-xl z-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
        </div>
      )}
      
      {!hasError ? (
        <iframe
          src={mapUrl}
          width="100%"
          height="100%"
          style={{ border: 0, borderRadius: '12px' }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title={`Mapa de ${business.name}`}
          onLoad={() => setIsLoading(false)}
          onError={() => setHasError(true)}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 p-6">
          <div className="text-6xl mb-4">📍</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Ubicación en {business.colonia || 'Yajalón'}</h3>
          <p className="text-gray-600 text-center mb-4 max-w-md">
            {business.address || 'Dirección no disponible'}
          </p>
          <a
            href={openInMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#38761D] text-white rounded-lg font-semibold hover:bg-[#2d5418] transition shadow-md"
          >
            🗺️ Ver en Google Maps
          </a>
        </div>
      )}
      
      {!hasError && (
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-4 right-4 bg-white px-4 py-2 rounded-lg shadow-lg font-semibold text-[#38761D] hover:bg-gray-50 transition text-sm flex items-center gap-2 z-20"
        >
          🧭 Cómo llegar
        </a>
      )}
    </div>
  );
}
