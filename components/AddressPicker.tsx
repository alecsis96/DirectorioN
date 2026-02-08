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
  const [retryCount, setRetryCount] = useState(0);

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

    // Si no está disponible, esperar más tiempo y reintentar
    const timer = setTimeout(() => {
      if (!checkGoogleMaps()) {
        setError('El mapa interactivo no está disponible en este momento.');
      }
    }, 10000); // 10 segundos de espera

    return () => clearTimeout(timer);
  }, [retryCount]);

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

  // Manejar cambio manual de dirección (sin autocompletado)
  const handleManualChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAddress = e.target.value;
    onChange({ 
      address: newAddress, 
      lat: value.lat || 0, 
      lng: value.lng || 0 
    });
  };

  return (
    <div className="space-y-2 md:col-span-2">
      {error && (
        <div className="bg-yellow-50 border border-yellow-300 text-yellow-800 px-4 py-3 rounded-lg text-sm">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="font-semibold">⚠️ El mapa interactivo no está disponible</p>
              <p className="mt-1 text-xs">
                Puedes escribir la dirección manualmente. El mapa se agregará después cuando esté disponible.
              </p>
            </div>
            <button
              onClick={() => {
                setError(null);
                setRetryCount(c => c + 1);
              }}
              className="ml-2 px-3 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700 transition flex-shrink-0"
            >
              Reintentar
            </button>
          </div>
        </div>
      )}
      
      {!isGoogleMapsLoaded && !error && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm">
          <p>⏳ Cargando mapa interactivo...</p>
        </div>
      )}
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Dirección o referencia
        </label>
        <input
          ref={inputRef}
          type="text"
          defaultValue={value.address}
          onChange={!isGoogleMapsLoaded ? handleManualChange : undefined}
          placeholder="Ej: Centro, cerca del parque, Colonia Centro..."
          className="border border-gray-300 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          {isGoogleMapsLoaded 
            ? '💡 Escribe y selecciona de las sugerencias, o arrastra el pin en el mapa'
            : '📝 Escribe tu dirección o una referencia (ej: cerca del mercado)'}
        </p>
      </div>
      
      {isGoogleMapsLoaded ? (
        <div 
          ref={mapRef} 
          className="h-64 w-full rounded-lg border border-gray-300 bg-gray-100"
        />
      ) : error ? (
        <div className="h-64 w-full rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center">
          <div className="text-center p-4">
            <p className="text-gray-600 mb-2">🗺️ Mapa no disponible</p>
            <p className="text-xs text-gray-500">
              La dirección se guardará sin coordenadas
            </p>
          </div>
        </div>
      ) : (
        <div className="h-64 w-full rounded-lg border border-gray-300 bg-gray-50 flex items-center justify-center">
          <div className="text-gray-500 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm">Cargando mapa...</p>
          </div>
        </div>
      )}
    </div>
  );
}
