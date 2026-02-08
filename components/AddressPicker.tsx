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
  const [error, setError] = useState<string | null>(null);

  // Verificar si Google Maps está disponible
  useEffect(() => {
    const checkGoogleMaps = () => {
      if ('google' in window && window.google?.maps) {
        setIsGoogleMapsLoaded(true);
        setError(null);
        return true;
      }
      return false;
    };

    // Verificar inmediatamente
    if (checkGoogleMaps()) return;

    // Si no está disponible, esperar un poco y reintentar
    const timer = setTimeout(() => {
      if (!checkGoogleMaps()) {
        setError('Google Maps no está disponible. Recarga la página.');
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isGoogleMapsLoaded) return;
    if (!inputRef.current || !mapRef.current) return;

    try {
      inputRef.current.value = value.address ?? '';

      const center = new google.maps.LatLng(
        value.lat || 16.9028, // Coordenadas aproximadas de Yajalón
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

      // Guardar referencias a los listeners para limpiarlos
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

      // Cleanup: remover listeners cuando el componente se desmonta o las dependencias cambian
      return () => {
        google.maps.event.removeListener(dragendListener);
        google.maps.event.removeListener(placeChangedListener);
        marker.setMap(null);
      };
    } catch (err) {
      console.error('Error al inicializar Google Maps:', err);
      setError('Error al cargar el mapa. Por favor, intenta recargar la página.');
    }
  }, [isGoogleMapsLoaded, value.address, value.lat, value.lng, onChange]);

  return (
    <div className="space-y-2 md:col-span-2">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          <p className="font-semibold">⚠️ {error}</p>
          <p className="mt-1 text-xs">
            Asegúrate de que NEXT_PUBLIC_GOOGLE_MAPS_KEY esté configurada correctamente.
          </p>
        </div>
      )}
      
      {!isGoogleMapsLoaded && !error && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm">
          <p>⏳ Cargando mapa...</p>
        </div>
      )}
      
      <input
        ref={inputRef}
        defaultValue={value.address}
        placeholder="Escribe tu dirección…"
        className="border rounded px-3 py-2 w-full disabled:bg-gray-100 disabled:cursor-not-allowed"
        disabled={!isGoogleMapsLoaded}
      />
      <div 
        ref={mapRef} 
        className={`h-64 w-full rounded border ${isGoogleMapsLoaded ? 'bg-gray-100' : 'bg-gray-200 flex items-center justify-center'}`}
      >
        {!isGoogleMapsLoaded && !error && (
          <div className="text-gray-500 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-700 mx-auto mb-2"></div>
            <p className="text-sm">Cargando Google Maps...</p>
          </div>
        )}
      </div>
      <p className="text-xs text-gray-500">
        {isGoogleMapsLoaded 
          ? 'Elige una sugerencia o ajusta el pin arrastrándolo.'
          : 'El mapa se cargará en un momento...'}
      </p>
    </div>
  );
}
