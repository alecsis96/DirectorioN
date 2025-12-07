import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

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
  return <FavoritosClient />;
}
