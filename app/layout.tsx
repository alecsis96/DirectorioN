import type { ReactNode } from 'react';
import '../styles/globals.css';
import Providers from '../components/Providers';
import Navigation from '../components/Navigation';
import PWAInstaller from '../components/PWAInstaller';

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
        <link rel="apple-touch-icon" href="/images/logo.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Directorio Yajalón" />
      </head>
      <body className="min-h-screen bg-white text-gray-900" suppressHydrationWarning>
        <Providers>
          <Navigation />
          {children}
          <PWAInstaller />
        </Providers> 
      </body>
    </html>
  );
}