// app/layout.tsx (Versión corregida)

import type { ReactNode } from 'react';
import '../styles/globals.css';
// DEBES eliminar la importación de FavoritesProvider de aquí
import Providers from '../components/Providers'; // <-- NUEVA IMPORTACIÓN DEL WRAPPER
import Navigation from '../components/Navigation';

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
      <body className="min-h-screen bg-white text-gray-900" suppressHydrationWarning>
        {/* Usar el wrapper de cliente para resolver el Mismatch */}
        <Providers>
          <Navigation />
          {children}
        </Providers> 
      </body>
    </html>
  );
}