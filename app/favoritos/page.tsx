import type { Metadata } from 'next';
import { Suspense } from 'react';

import FavoritosClient from '../../components/FavoritosClient';

export const metadata: Metadata = {
  title: 'Mis Favoritos - Directorio Yajalón',
  description: 'Tus negocios favoritos guardados en Yajalón',
  robots: {
    index: false,
    follow: true,
  },
};

export default function FavoritosPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Cargando...</div>}>
      <FavoritosClient />
    </Suspense>
  );
}
