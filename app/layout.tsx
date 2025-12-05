import type { ReactNode } from 'react';
import '../styles/globals.css';
import Providers from '../components/Providers';
import Navigation from '../components/Navigation';
import PWAInstaller from '../components/PWAInstaller';
import PWAUpdater from '../components/PWAUpdater';
import PushNotifications from '../components/PushNotifications';

export const metadata = {
  title: 'Directorio Yajalón - Conecta con negocios locales',
  description: 'Descubre negocios locales en Yajalón. Restaurantes, tiendas, servicios y más. Conecta con comercios locales sin gastar datos.',
  keywords: 'negocios yajalón, directorio comercial, restaurantes yajalón, tiendas locales, servicios yajalón',
  openGraph: {
    title: 'Directorio Yajalón',
    description: 'Descubre y conecta con negocios locales en Yajalón',
    images: ['/images/logo.png'],
    type: 'website',
    locale: 'es_MX',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Directorio Yajalón',
    description: 'Descubre y conecta con negocios locales en Yajalón',
    images: ['/images/logo.png'],
  },
  icons: {
    icon: '/images/logo.png',
    apple: '/images/logo.png',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#38761D" />
        
        {/* iOS Meta Tags */}
        <link rel="apple-touch-icon" href="/images/icon-180.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/images/icon-152.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/images/icon-167.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/images/icon-180.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Directorio Yajalón" />
        
        {/* Splash Screens para iOS */}
        <link rel="apple-touch-startup-image" href="/images/splash-2048x2732.png" media="(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)" />
        <link rel="apple-touch-startup-image" href="/images/splash-1668x2388.png" media="(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2)" />
        <link rel="apple-touch-startup-image" href="/images/splash-1536x2048.png" media="(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2)" />
        <link rel="apple-touch-startup-image" href="/images/splash-1242x2688.png" media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3)" />
        <link rel="apple-touch-startup-image" href="/images/splash-1125x2436.png" media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)" />
        <link rel="apple-touch-startup-image" href="/images/splash-828x1792.png" media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)" />
        <link rel="apple-touch-startup-image" href="/images/splash-750x1334.png" media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)" />
        
        {/* Otros Meta Tags PWA */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#38761D" />
        <meta name="msapplication-TileImage" content="/images/icon-144.png" />
      </head>
      <body className="min-h-screen bg-white text-gray-900 pb-20 md:pb-0" suppressHydrationWarning>
        <Providers>
          <Navigation />
          {children}
          <PWAInstaller />
          <PWAUpdater />
          <PushNotifications />
        </Providers> 
      </body>
    </html>
  );
}