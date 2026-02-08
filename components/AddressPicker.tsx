'use client';

import { useEffect, useRef, useState } from 'react';

type AddressValue = { address: string; lat: number; lng: number };
type Props = {
  value: AddressValue;
  onChange: (v: AddressValue) => void;
};

export default function AddressPicker({ value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const mapInitializedRef = useRef(false);

  // Verificar si Google Maps está disponible (sin forzar carga)
  useEffect(() => {
    const checkGoogleMaps = () => {
      if ('google' in window && window.google?.maps && window.google?.maps?.places) {
        setIsGoogleMapsLoaded(true);
        return true;
      }
      return false;
    };

    // Verificar inmediatamente
    if (checkGoogleMaps()) return;

    // Verificar periódicamente sin timeout de error
    const interval = setInterval(() => {
      if (checkGoogleMaps()) {
        clearInterval(interval);
      }
    }, 1000);

    // Limpiar después de 15 segundos
    const cleanup = setTimeout(() => {
      clearInterval(interval);
    }, 15000);

    return () => {
      clearInterval(interval);
      clearTimeout(cleanup);
    };
  }, [retryCount]);

  // Inicializar mapa solo cuando esté disponible y el usuario lo solicite
  useEffect(() => {
    if (!isGoogleMapsLoaded || !showMap) return;
    if (!inputRef.current || !mapRef.current) return;
    if (mapInitializedRef.current) return;

    try {
      mapInitializedRef.current = true;

      const center = new google.maps.LatLng(
        value.lat || 16.9028,
        value.lng || -92.3254
      );

      const map = new google.maps.Map(mapRef.current, {
        center,
        zoom: value.lat ? 16 : 13,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });

      const marker = new google.maps.Marker({
        map,
        position: center,
        draggable: true,
      });

      const dragendListener = marker.addListener('dragend', () => {
        const p = marker.getPosition();
        if (!p) return;
        const currentAddress = inputRef.current?.value || value.address;
        onChange({ address: currentAddress, lat: p.lat(), lng: p.lng() });
        map.setCenter(p);
      });

      const ac = new google.maps.places.Autocomplete(inputRef.current, {
        fields: ['formatted_address', 'geometry'],
        componentRestrictions: { country: 'mx' },
      });

      const placeChangedListener = ac.addListener('place_changed', () => {
        const place = ac.getPlace();
        const loc = place.geometry?.location;
        const addr = place.formatted_address || inputRef.current?.value || '';
        if (!loc) return;

        if (inputRef.current) {
          inputRef.current.value = addr;
        }

        const position = new google.maps.LatLng(loc.lat(), loc.lng());
        marker.setPosition(position);
        map.setCenter(position);
        onChange({ address: addr, lat: loc.lat(), lng: loc.lng() });
      });

      return () => {
        try {
          google.maps.event.removeListener(dragendListener);
          google.maps.event.removeListener(placeChangedListener);
          marker.setMap(null);
        } catch (err) {
          console.warn('Error al limpiar Google Maps:', err);
        }
      };
    } catch (err) {
      console.error('Error al inicializar Google Maps:', err);
      setShowMap(false);
      mapInitializedRef.current = false;
    }
  }, [isGoogleMapsLoaded, showMap, value.lat, value.lng]);

  // Manejar cambio manual de dirección
  const handleManualChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAddress = e.target.value;
    onChange({ 
      address: newAddress, 
      lat: value.lat || 0, 
      lng: value.lng || 0 
    });
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Dirección o referencia
        </label>
        <input
          ref={inputRef}
          type="text"
          defaultValue={value.address}
          onChange={handleManualChange}
          placeholder="Ej: Centro, cerca del parque, Colonia Centro..."
          className="border border-gray-300 rounded-lg px-4 py-2.5 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="text-xs text-gray-500 mt-1.5">
          Escribe tu dirección o una referencia de ubicación
        </p>
      </div>

      {/* Botón para mostrar mapa solo si está disponible */}
      {isGoogleMapsLoaded && !showMap && (
        <button
          type="button"
          onClick={() => setShowMap(true)}
          className="w-full px-4 py-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-100 transition text-sm font-medium flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          Usar mapa interactivo para ubicación precisa
        </button>
      )}

      {/* Mapa (solo si se solicita) */}
      {showMap && isGoogleMapsLoaded && (
        <div className="space-y-2">
          <div 
            ref={mapRef} 
            className="h-64 w-full rounded-lg border border-gray-300 bg-gray-100"
          />
          <p className="text-xs text-gray-500">
            💡 Selecciona de las sugerencias o arrastra el pin para ajustar la ubicación
          </p>
        </div>
      )}

      {/* Mensaje de ayuda si Maps no está disponible */}
      {!isGoogleMapsLoaded && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-600">
          <p className="flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <span>El mapa interactivo no es necesario. Puedes escribir la dirección manualmente.</span>
          </p>
        </div>
      )}
    </div>
  );
}
