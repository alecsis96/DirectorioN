'use client';

import { useEffect, useState } from 'react';
import { GoogleMap, LoadScript, Marker, InfoWindow } from '@react-google-maps/api';
import { optionalPublicEnv } from '../lib/env';
import { Business } from '../types/business';

interface BusinessMapProps {
  business: Business;
  height?: string;
  zoom?: number;
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

export default function BusinessMapComponent({ business, height = '400px', zoom = 16 }: BusinessMapProps) {
  const apiKey = optionalPublicEnv('NEXT_PUBLIC_GOOGLE_MAPS_KEY');
  const [showInfo, setShowInfo] = useState(false);
  const [center, setCenter] = useState(defaultCenter);

  useEffect(() => {
    // Extraer coordenadas del negocio
    if (business.location?.lat && business.location?.lng) {
      setCenter({
        lat: business.location.lat,
        lng: business.location.lng,
      });
    } else if (business.address) {
      // Intentar geocodificar la dirección si no hay coordenadas
      // Por ahora usar centro por defecto
      setCenter(defaultCenter);
    }
  }, [business]);

  // Si no hay API key, mostrar mapa estático con enlace a Google Maps
  if (!apiKey) {
    const mapUrl = business.location?.lat && business.location?.lng
      ? `https://www.google.com/maps?q=${business.location.lat},${business.location.lng}&z=16&output=embed`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.address || business.name + ' Yajalón')}`;

    return (
      <div className="relative" style={{ height }}>
        <iframe
          src={mapUrl}
          width="100%"
          height="100%"
          style={{ border: 0, borderRadius: '12px' }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title={`Mapa de ${business.name}`}
        />
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${business.location?.lat || ''},${business.location?.lng || ''}`}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-4 right-4 bg-white px-4 py-2 rounded-lg shadow-lg font-semibold text-[#38761D] hover:bg-gray-50 transition text-sm flex items-center gap-2"
        >
          🧭 Cómo llegar
        </a>
      </div>
    );
  }

  // Mapa interactivo con API key
  return (
    <div style={{ height }}>
      <LoadScript googleMapsApiKey={apiKey} libraries={libraries}>
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={center}
          zoom={zoom}
          options={{
            zoomControl: true,
            streetViewControl: true,
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
          {/* Marcador del negocio */}
          {business.location?.lat && business.location?.lng && (
            <Marker
              position={{ lat: business.location.lat, lng: business.location.lng }}
              onClick={() => setShowInfo(!showInfo)}
              icon={{
                url: business.image1 || '/images/logo.png',
                scaledSize: new google.maps.Size(40, 40),
                anchor: new google.maps.Point(20, 40),
              }}
              animation={google.maps.Animation.DROP}
            />
          )}

          {/* Ventana de información */}
          {showInfo && business.location?.lat && business.location?.lng && (
            <InfoWindow
              position={{ lat: business.location.lat, lng: business.location.lng }}
              onCloseClick={() => setShowInfo(false)}
            >
              <div className="p-2 max-w-xs">
                <div className="flex items-start gap-3">
                  {business.image1 && (
                    <img
                      src={business.image1}
                      alt={business.name}
                      className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 text-sm mb-1 truncate">
                      {business.name}
                    </h3>
                    {business.category && (
                      <p className="text-xs text-gray-600 mb-2">{business.category}</p>
                    )}
                    {business.address && (
                      <p className="text-xs text-gray-700 mb-2 line-clamp-2">
                        📍 {business.address}
                      </p>
                    )}
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${business.location.lat},${business.location.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#38761D] hover:text-[#2d5418] transition"
                    >
                      🧭 Cómo llegar
                    </a>
                  </div>
                </div>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </LoadScript>
    </div>
  );
}
