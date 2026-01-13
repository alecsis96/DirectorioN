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
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);

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
    const baseUrl = 'https://maps.google.com/maps?';
    
    if (businessesWithLocation.length === 0) {
      return `${baseUrl}q=${encodeURIComponent('Yajalón, Chiapas')}&output=embed`;
    }

    // Crear parámetros para todos los marcadores
    const markers = businessesWithLocation.map(b => 
      `markers=color:${b.plan === 'sponsor' ? 'purple' : b.plan === 'featured' ? 'yellow' : 'red'}%7Clabel:${encodeURIComponent(b.name.charAt(0))}%7C${b.location!.lat},${b.location!.lng}`
    ).join('&');

    // Calcular zoom apropiado
    const zoom = businessesWithLocation.length === 1 ? 16 : 
                 businessesWithLocation.length <= 3 ? 15 : 
                 businessesWithLocation.length <= 10 ? 14 : 13;

    return `${baseUrl}${markers}&center=${center.lat},${center.lng}&zoom=${zoom}&output=embed`;
  };

  const mapUrl = createMapUrl();

  const handleBusinessClick = (business: Business) => {
    setSelectedBusiness(business);
    if (onBusinessClick) {
      onBusinessClick(business);
    }
  };

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
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('negocios Yajalón, Chiapas')}`}
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

          {/* Lista de negocios en el mapa - Overlay mejorado */}
          {!isLoading && businessesWithLocation.length > 0 && (
            <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl border border-gray-200 max-h-72 overflow-y-auto">
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <svg className="w-5 h-5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    <span>{businessesWithLocation.length} {businessesWithLocation.length === 1 ? 'negocio' : 'negocios'}</span>
                  </h3>
                  <span className="text-xs text-gray-500 font-normal">👆 Haz click para ver detalles</span>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                  {businessesWithLocation.map((business) => (
                    <button
                      key={business.id}
                      onClick={() => handleBusinessClick(business)}
                      className={`w-full text-left p-3 rounded-lg transition-all border-2 group ${
                        selectedBusiness?.id === business.id
                          ? 'bg-emerald-50 border-emerald-400 shadow-md'
                          : 'bg-white border-gray-100 hover:border-emerald-300 hover:bg-emerald-50/50 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {business.logoUrl && (
                          <img
                            src={business.logoUrl}
                            alt={business.name}
                            className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border-2 border-gray-200 group-hover:border-emerald-300 transition-colors"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="text-sm font-bold text-gray-900 group-hover:text-emerald-700 transition-colors flex items-center gap-1.5 flex-wrap">
                              <span className="truncate">{business.name}</span>
                              {business.plan === 'sponsor' && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700">
                                  👑 PATROCINADO
                                </span>
                              )}
                              {business.plan === 'featured' && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-yellow-100 text-yellow-700">
                                  🔥 DESTACADO
                                </span>
                              )}
                            </p>
                            {business.rating && (
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <span className="text-yellow-500 text-sm">★</span>
                                <span className="text-sm font-bold text-gray-700">{business.rating.toFixed(1)}</span>
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 truncate mb-1">{business.address}</p>
                          {business.category && (
                            <span className="inline-block text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                              📂 {business.category}
                            </span>
                          )}
                        </div>
                        <svg 
                          className={`w-5 h-5 flex-shrink-0 transition-colors ${
                            selectedBusiness?.id === business.id ? 'text-emerald-600' : 'text-gray-400 group-hover:text-emerald-600'
                          }`} 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Leyenda de colores - Más compacta */}
          {!isLoading && businessesWithLocation.length > 0 && (
            <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg px-3 py-2 border border-gray-200">
              <p className="font-bold text-gray-700 mb-1.5 text-xs flex items-center gap-1">
                <span>📌</span>
                Leyenda
              </p>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-purple-500"></div>
                  <span className="text-[11px] text-gray-600">Patrocinado</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                  <span className="text-[11px] text-gray-600">Destacado</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                  <span className="text-[11px] text-gray-600">Regular</span>
                </div>
              </div>
            </div>
          )}

          {/* Botón para abrir en Google Maps */}
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('negocios Yajalón, Chiapas')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-white transition-colors border border-gray-200 flex items-center gap-2 hover:shadow-xl"
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
