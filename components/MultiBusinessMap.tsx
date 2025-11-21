'use client';

import { useState, useEffect } from 'react';
import { GoogleMap, LoadScript, Marker, InfoWindow } from '@react-google-maps/api';
import { optionalPublicEnv } from '../lib/env';
import { Business } from '../types/business';
import Link from 'next/link';

interface MultiBusinessMapProps {
  businesses: Business[];
  height?: string;
  zoom?: number;
  onBusinessClick?: (business: Business) => void;
}

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const defaultCenter = {
  lat: 17.1837,
  lng: -92.3389, // Yajalón, Chiapas
};

const libraries: ("places" | "geometry" | "drawing" | "visualization")[] = ["places"];

export default function MultiBusinessMap({ 
  businesses, 
  height = '500px', 
  zoom = 14,
  onBusinessClick 
}: MultiBusinessMapProps) {
  const apiKey = optionalPublicEnv('NEXT_PUBLIC_GOOGLE_MAPS_KEY');
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [center, setCenter] = useState(defaultCenter);

  // Filtrar negocios con coordenadas válidas
  const businessesWithLocation = businesses.filter(
    b => b.location?.lat && b.location?.lng
  );

  useEffect(() => {
    // Calcular centro basado en todos los negocios
    if (businessesWithLocation.length > 0) {
      const avgLat = businessesWithLocation.reduce((sum, b) => sum + (b.location?.lat || 0), 0) / businessesWithLocation.length;
      const avgLng = businessesWithLocation.reduce((sum, b) => sum + (b.location?.lng || 0), 0) / businessesWithLocation.length;
      setCenter({ lat: avgLat, lng: avgLng });
    }
  }, [businesses]);

  // Si no hay API key, no mostrar mapa
  if (!apiKey) {
    return (
      <div 
        className="flex items-center justify-center bg-gray-50 rounded-xl border border-gray-200"
        style={{ height }}
      >
        <div className="text-center p-8">
          <div className="text-5xl mb-3">🗺️</div>
          <p className="text-gray-600 mb-2 font-semibold">
            Mapa no disponible
          </p>
          <p className="text-sm text-gray-500">
            Configura NEXT_PUBLIC_GOOGLE_MAPS_KEY para ver el mapa
          </p>
        </div>
      </div>
    );
  }

  // Si no hay negocios con ubicación
  if (businessesWithLocation.length === 0) {
    return (
      <div 
        className="flex items-center justify-center bg-gray-50 rounded-xl border border-gray-200"
        style={{ height }}
      >
        <div className="text-center p-8">
          <div className="text-5xl mb-3">📍</div>
          <p className="text-gray-600 font-semibold">
            No hay negocios con ubicación en esta área
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height }} className="rounded-xl overflow-hidden">
      <LoadScript googleMapsApiKey={apiKey} libraries={libraries}>
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={center}
          zoom={zoom}
          options={{
            zoomControl: true,
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: true,
            styles: [
              {
                featureType: "poi",
                elementType: "labels",
                stylers: [{ visibility: "off" }],
              },
            ],
          }}
        >
          {/* Marcadores de todos los negocios */}
          {businessesWithLocation.map((business) => {
            const position = {
              lat: business.location!.lat,
              lng: business.location!.lng,
            };

            // Color del marcador según categoría
            const getMarkerColor = (category?: string) => {
              const colors: Record<string, string> = {
                'Restaurantes': '#E53E3E',
                'Tiendas': '#3182CE',
                'Servicios': '#38A169',
                'Salud': '#D53F8C',
                'Educación': '#805AD5',
              };
              return colors[category || ''] || '#38761D';
            };

            return (
              <Marker
                key={business.id}
                position={position}
                onClick={() => {
                  setSelectedBusiness(business);
                  if (onBusinessClick) onBusinessClick(business);
                }}
                icon={{
                  path: google.maps.SymbolPath.CIRCLE,
                  fillColor: getMarkerColor(business.category),
                  fillOpacity: 0.9,
                  strokeColor: '#ffffff',
                  strokeWeight: 2,
                  scale: 10,
                }}
              />
            );
          })}

          {/* InfoWindow del negocio seleccionado */}
          {selectedBusiness && selectedBusiness.location && (
            <InfoWindow
              position={{
                lat: selectedBusiness.location.lat,
                lng: selectedBusiness.location.lng,
              }}
              onCloseClick={() => setSelectedBusiness(null)}
            >
              <div className="p-2 max-w-xs">
                <Link href={`/negocios/${selectedBusiness.id}`}>
                  <div className="flex items-start gap-3 hover:opacity-80 transition cursor-pointer">
                    {selectedBusiness.image1 && (
                      <img
                        src={selectedBusiness.image1}
                        alt={selectedBusiness.name}
                        className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 text-sm mb-1">
                        {selectedBusiness.name}
                      </h3>
                      {selectedBusiness.category && (
                        <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full mb-2">
                          {selectedBusiness.category}
                        </span>
                      )}
                      {selectedBusiness.address && (
                        <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                          📍 {selectedBusiness.address}
                        </p>
                      )}
                      <div className="flex gap-2">
                        <span className="text-xs font-semibold text-[#38761D]">
                          Ver detalles →
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </LoadScript>
    </div>
  );
}
