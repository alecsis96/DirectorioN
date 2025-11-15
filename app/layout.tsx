// app/layout.tsx (Versión corregida)

import type { ReactNode } from 'react';
import '../styles/globals.css';
// DEBES eliminar la importación de FavoritesProvider de aquí
import Providers from '../components/Providers'; // <-- NUEVA IMPORTACIÓN DEL WRAPPER

export const metadata = {
  title: 'Directorio Yajalón',
  description: 'Conecta con negocios locales sin gastar datos.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-white text-gray-900">
        {/* Usar el wrapper de cliente para resolver el Mismatch */}
        <Providers>{children}</Providers> 
      </body>
    </html>
  );
}