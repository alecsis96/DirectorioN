'use client';

import { useEffect, useRef } from 'react';

type AddressValue = { address: string; lat: number; lng: number };
type Props = {
  value: AddressValue;
  onChange: (v: AddressValue) => void;
};

export default function AddressPicker({ value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!('google' in window) || !inputRef.current || !mapRef.current) return;

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

    marker.addListener('dragend', () => {
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

    ac.addListener('place_changed', () => {
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
  }, [value.address, value.lat, value.lng, onChange]);

  return (
    <div className="space-y-2 md:col-span-2">
      <input
        ref={inputRef}
        defaultValue={value.address}
        placeholder="Escribe tu dirección…"
        className="border rounded px-3 py-2 w-full"
      />
      <div ref={mapRef} className="h-64 w-full rounded border bg-gray-100" />
      <p className="text-xs text-gray-500">
        Elige una sugerencia o ajusta el pin arrastrándolo.
      </p>
    </div>
  );
}
