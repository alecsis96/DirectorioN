'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Business } from '../types/business';

interface BusinessesMapViewProps {
  businesses: Business[];
  className?: string;
  onBusinessClick?: (business: Business) => void;
}

declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

export default function BusinessesMapView({ 
  businesses, 
  className = '', 
  onBusinessClick 
}: BusinessesMapViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isListCollapsed, setIsListCollapsed] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const infoWindowRef = useRef<any>(null);

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

  // Centrar el mapa en un negocio específico
  const centerOnBusiness = useCallback((business: Business) => {
    if (!googleMapRef.current || !business.location?.lat || !business.location?.lng) return;
    
    googleMapRef.current.panTo({
      lat: business.location.lat,
      lng: business.location.lng
    });
    googleMapRef.current.setZoom(17);
    
    // Encontrar y hacer click en el marker correspondiente
    const marker = markersRef.current.find(m => m.businessId === business.id);
    if (marker && window.google) {
      window.google.maps.event.trigger(marker, 'click');
    }
  }, []);

  // Inicializar el mapa
  useEffect(() => {
    const loadGoogleMaps = () => {
      if (window.google && window.google.maps) {
        initializeMap();
        return;
      }

      // Verificar si ya existe el script
      if (document.querySelector('script[src*="maps.googleapis.com"]')) {
        const checkGoogle = setInterval(() => {
          if (window.google && window.google.maps) {
            clearInterval(checkGoogle);
            initializeMap();
          }
        }, 100);
        return;
      }

      // Cargar el script de Google Maps
      const script = document.createElement('script');
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      
      if (!apiKey) {
        console.error('Google Maps API Key no está configurada');
        setHasError(true);
        setIsLoading(false);
        return;
      }

      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = initializeMap;
      script.onerror = () => {
        console.error('Error al cargar Google Maps');
        setHasError(true);
        setIsLoading(false);
      };
      document.head.appendChild(script);
    };

    const initializeMap = () => {
      if (!mapRef.current || !window.google) return;

      try {
        // Crear el mapa
        const map = new window.google.maps.Map(mapRef.current, {
          center: center,
          zoom: businessesWithLocation.length === 0 ? 13 : 
                businessesWithLocation.length === 1 ? 16 : 14,
          mapTypeControl: true,
          streetViewControl: true,
          fullscreenControl: true,
          zoomControl: true,
        });

        googleMapRef.current = map;

        // Crear InfoWindow única
        infoWindowRef.current = new window.google.maps.InfoWindow();

        // Limpiar markers anteriores
        markersRef.current.forEach(marker => marker.setMap(null));
        markersRef.current = [];

        // Agregar marcadores para cada negocio
        businessesWithLocation.forEach((business) => {
          const marker = new window.google.maps.Marker({
            position: {
              lat: business.location!.lat,
              lng: business.location!.lng
            },
            map: map,
            title: business.name,
            animation: window.google.maps.Animation.DROP,
            label: {
              text: business.name.length > 15 ? business.name.substring(0, 15) + '...' : business.name,
              color: '#1f2937',
              fontSize: '11px',
              fontWeight: 'bold',
              className: 'map-marker-label'
            },
            icon: {
              url: business.plan === 'sponsor' 
                ? 'http://maps.google.com/mapfiles/ms/icons/purple-dot.png'
                : business.plan === 'featured'
                ? 'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png'
                : 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
              scaledSize: new window.google.maps.Size(32, 32),
            }
          });

          // Guardar referencia al negocio
          marker.businessId = business.id;

          // Agregar evento click al marker
          marker.addListener('click', () => {
            if (onBusinessClick) {
              onBusinessClick(business);
            }
          });

          markersRef.current.push(marker);
        });

        // Ajustar límites del mapa para mostrar todos los marcadores
        if (businessesWithLocation.length > 1) {
          const bounds = new window.google.maps.LatLngBounds();
          businessesWithLocation.forEach((business) => {
            bounds.extend({
              lat: business.location!.lat,
              lng: business.location!.lng
            });
          });
          map.fitBounds(bounds);
          
          // Agregar padding para que no queden muy pegados a los bordes
          const padding = { top: 50, right: 50, bottom: 180, left: 50 };
          map.fitBounds(bounds, padding);
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Error al inicializar el mapa:', error);
        setHasError(true);
        setIsLoading(false);
      }
    };

    loadGoogleMaps();

    return () => {
      // Limpiar markers al desmontar
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];
    };
  }, [businesses, businessesWithLocation.length, center.lat, center.lng, onBusinessClick]);

  return (
    <div className={`relative ${className}`}>
      {/* Loading Skeleton */}
      {isLoading && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-xl z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-3" />
            <p className="text-sm text-gray-600">Cargando mapa interactivo...</p>
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
              Verifica que la API Key de Google Maps esté configurada correctamente.
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
          {/* Contenedor del mapa */}
          <div 
            ref={mapRef} 
            className="w-full h-full rounded-xl"
            style={{ minHeight: '400px' }}
          />

          {/* Lista de negocios - Más compacta y menos invasiva */}
          {!isLoading && businessesWithLocation.length > 0 && (
            <div className={`absolute left-4 right-4 bg-white/90 backdrop-blur-md rounded-lg shadow-lg border border-gray-200/50 transition-all duration-300 ${
              isListCollapsed ? 'bottom-4 max-h-14' : 'bottom-4 max-h-52'
            }`}>
              <div className="p-3">
                {/* Header colapsable */}
                <button
                  onClick={() => setIsListCollapsed(!isListCollapsed)}
                  className="w-full flex items-center justify-between mb-2 hover:bg-gray-50 rounded-md px-2 py-1 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-xs font-bold text-gray-900">
                      {businessesWithLocation.length} {businessesWithLocation.length === 1 ? 'negocio' : 'negocios'}
                    </span>
                  </div>
                  <svg 
                    className={`w-4 h-4 text-gray-500 transition-transform ${isListCollapsed ? '' : 'rotate-180'}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Lista de negocios */}
                {!isListCollapsed && (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {businessesWithLocation.map((business) => (
                      <button
                        key={business.id}
                        onClick={() => {
                          centerOnBusiness(business);
                          onBusinessClick?.(business);
                        }}
                        className="w-full text-left p-2 rounded-md hover:bg-emerald-50/80 transition-colors border border-transparent hover:border-emerald-200 group"
                      >
                        <div className="flex items-center gap-2">
                          {business.logoUrl && (
                            <img
                              src={business.logoUrl}
                              alt={business.name}
                              className="w-8 h-8 rounded-md object-cover flex-shrink-0 border border-gray-200"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors truncate">
                              {business.name}
                              {business.plan === 'sponsor' && <span className="ml-1 text-[10px]">👑</span>}
                              {business.plan === 'featured' && <span className="ml-1 text-[10px]">🔥</span>}
                            </p>
                            <p className="text-[10px] text-gray-500 truncate">{business.category}</p>
                          </div>
                          {business.rating && (
                            <div className="flex items-center gap-0.5 flex-shrink-0">
                              <span className="text-yellow-500 text-[10px]">★</span>
                              <span className="text-[10px] font-semibold text-gray-700">{business.rating.toFixed(1)}</span>
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Leyenda - Más pequeña y discreta */}
          {!isLoading && businessesWithLocation.length > 0 && (
            <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md rounded-md shadow-md px-2 py-1.5 border border-gray-200/50">
              <div className="flex items-center gap-3 text-[10px]">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                  <span className="text-gray-600">Patrocinado</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                  <span className="text-gray-600">Destacado</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  <span className="text-gray-600">Regular</span>
                </div>
              </div>
            </div>
          )}

          {/* Botón para abrir en Google Maps */}
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('negocios Yajalón, Chiapas')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute top-4 right-4 bg-white/90 backdrop-blur-md rounded-md shadow-md px-2 py-1.5 text-[10px] font-semibold text-gray-700 hover:bg-white transition-colors border border-gray-200/50 flex items-center gap-1.5"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Abrir en Google Maps
          </a>
        </>
      )}
    </div>
  );
}
