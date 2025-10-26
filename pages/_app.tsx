import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import { consumeAuthRedirect } from '../firebaseConfig';
import Script from 'next/script';

function MyApp({ Component, pageProps }: AppProps) {
  const googleMapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      consumeAuthRedirect();
      if (!googleMapsKey && process.env.NODE_ENV === 'development') {
        console.warn('Google Maps key is missing. Set NEXT_PUBLIC_GOOGLE_MAPS_KEY in your environment.');
      }
    }
  }, [googleMapsKey]);

  return (
    <>
      {googleMapsKey ? (
        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${googleMapsKey}&libraries=places&loading=async`}
          strategy="afterInteractive"
        />
      ) : null}
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;
