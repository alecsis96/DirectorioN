// components/Providers.tsx
'use client';

import React, { useEffect } from 'react';
import Script from 'next/script';
import { FavoritesProvider } from '../context/FavoritesContext';

const googleMapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;

export default function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!googleMapsKey && process.env.NODE_ENV === 'development') {
      console.warn(
        'Falta definir NEXT_PUBLIC_GOOGLE_MAPS_KEY para habilitar el mapa en el dashboard.'
      );
    }
  }, []);

  return (
    <>
      {googleMapsKey ? (
        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${googleMapsKey}&libraries=places&loading=async`}
          strategy="afterInteractive"
        />
      ) : null}
      <FavoritesProvider>{children}</FavoritesProvider>
    </>
  );
}
