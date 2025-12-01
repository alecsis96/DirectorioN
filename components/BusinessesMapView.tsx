'use client';

import { useState, useEffect } from 'react';
import type { Business } from '../types/business';

interface BusinessesMapViewProps {
  businesses: Business[];
  className?: string;
  onBusinessClick?: (business: Business) => void;
}

export default function BusinessesMapView({ 
  businesses, 
  className = '', 
  onBusinessClick 
}: BusinessesMapViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Calcular el centro del mapa basado en los negocios con ubicación
  const businessesWithLocation = businesses.filter(b => b.location?.lat && b.location?.lng);
  
  // Centro por defecto: Yajalón, Chiapas
  const defaultCenter = { lat: 17.1733, lng: -92.3333 };
  
  const center = businessesWithLocation.length > 0
    ? {
        lat: businessesWithLocation.reduce((sum, b) => sum + (b.location!.lat || 0), 0) / businessesWithLocation.length,
        lng: businessesWithLocation.reduce((sum, b) => sum + (b.location!.lng || 0), 0) / businessesWithLocation.length,
      }
    : defaultCenter;

  // Crear URL para Google Maps con múltiples markers
  const createMapUrl = () => {
    if (businessesWithLocation.length === 0) {
      return `https://maps.google.com/maps?q=${encodeURIComponent('Yajalón, Chiapas')}&output=embed`;
    }

    // Para múltiples markers, usamos el centro y zoom adecuado
    const zoom = businessesWithLocation.length === 1 ? 16 : 14;
    return `https://maps.google.com/maps?q=${center.lat},${center.lng}&z=${zoom}&output=embed`;
  };

  const mapUrl = createMapUrl();

  return (
    <div className={`relative ${className}`}>
      {/* Loading Skeleton */}
      {isLoading && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-xl z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-3" />
            <p className="text-sm text-gray-600">Cargando mapa...</p>
          </div>
        </div>
      )}
      
      {/* Error State */}
      {hasError ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 rounded-xl border-2 border-gray-200">
          <div className="text-center p-6 max-w-md">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No se pudo cargar el mapa</h3>
            <p className="text-sm text-gray-600 mb-4">
              Intenta ver los negocios en modo lista o verifica tu conexión a internet.
            </p>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('Yajalón, Chiapas')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Abrir en Google Maps
            </a>
          </div>
        </div>
      ) : (
        <>
          {/* Mapa Embed */}
          <iframe
            src={mapUrl}
            width="100%"
            height="100%"
            style={{ border: 0, borderRadius: '12px' }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Mapa de negocios en Yajalón"
            onLoad={() => setIsLoading(false)}
            onError={() => setHasError(true)}
            className="rounded-xl"
          />

          {/* Lista de negocios en el mapa - Overlay */}
          {!isLoading && businessesWithLocation.length > 0 && (
            <div className="absolute bottom-4 left-4 right-4 bg-white rounded-xl shadow-2xl border border-gray-200 max-h-48 overflow-y-auto">
              <div className="p-4">
                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  {businessesWithLocation.length} {businessesWithLocation.length === 1 ? 'negocio' : 'negocios'} en el mapa
                </h3>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {businessesWithLocation.slice(0, 5).map((business) => (
                    <button
                      key={business.id}
                      onClick={() => onBusinessClick?.(business)}
                      className="w-full text-left p-2 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100 hover:border-emerald-300"
                    >
                      <div className="flex items-start gap-2">
                        {business.logoUrl && (
                          <img
                            src={business.logoUrl}
                            alt={business.name}
                            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{business.name}</p>
                          <p className="text-xs text-gray-500 truncate">{business.address}</p>
                        </div>
                        {business.rating && (
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <span className="text-yellow-500 text-xs">★</span>
                            <span className="text-xs font-semibold text-gray-700">{business.rating.toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                  {businessesWithLocation.length > 5 && (
                    <p className="text-xs text-gray-500 text-center pt-2 border-t">
                      +{businessesWithLocation.length - 5} más en el mapa
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Botón para abrir en Google Maps */}
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('negocios Yajalón, Chiapas')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute top-4 right-4 bg-white rounded-lg shadow-lg px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors border border-gray-200 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Abrir en Google Maps
          </a>
        </>
      )}
    </div>
  );
}
