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
  
  const lat = business.location?.lat;
  const lng = business.location?.lng;
  
  // URL del mapa embebido
  const mapUrl = lat && lng
    ? `https://www.google.com/maps?q=${lat},${lng}&z=${zoom}&output=embed`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.address || business.name + ' Yajalón')}`;

  const directionsUrl = lat && lng
    ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.address || business.name + ' Yajalón')}`;

  return (
    <div className="relative" style={{ height }}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-xl z-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
        </div>
      )}
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
      />
      <a
        href={directionsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-4 right-4 bg-white px-4 py-2 rounded-lg shadow-lg font-semibold text-[#38761D] hover:bg-gray-50 transition text-sm flex items-center gap-2 z-20"
      >
        🧭 Cómo llegar
      </a>
    </div>
  );
}
