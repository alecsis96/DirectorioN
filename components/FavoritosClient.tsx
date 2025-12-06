'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useFavorites } from '../context/FavoritesContext';
import BusinessCard from './BusinessCard';
import type { Business } from '../types/business';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import { app } from '../firebaseConfig';

const db = getFirestore(app);

export default function FavoritosClient() {
  const { favorites } = useFavorites();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchFavorites() {
      // Filtrar favoritos válidos (strings no vacíos)
      const validFavorites = favorites.filter(
        (id): id is string => typeof id === 'string' && id.trim().length > 0
      );

      if (validFavorites.length === 0) {
        setBusinesses([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        console.log('[FavoritosClient] Valid Favorites IDs:', validFavorites);
        
        // Firestore permite máximo 10 items en un 'in' query, así que dividimos en chunks
        const chunks: string[][] = [];
        for (let i = 0; i < validFavorites.length; i += 10) {
          chunks.push(validFavorites.slice(i, i + 10));
        }

        const allBusinesses: Business[] = [];
        
        for (const chunk of chunks) {
          console.log('[FavoritosClient] Fetching chunk:', chunk);
          const q = query(
            collection(db, 'businesses'),
            where('__name__', 'in', chunk)
          );
          
          const snapshot = await getDocs(q);
          console.log('[FavoritosClient] Snapshot size:', snapshot.size);
          snapshot.forEach((doc) => {
            const data = doc.data();
            console.log('[FavoritosClient] Found business:', doc.id, data.name);
            allBusinesses.push({ id: doc.id, ...data } as Business);
          });
        }

        console.log('[FavoritosClient] Total businesses found:', allBusinesses.length);
        setBusinesses(allBusinesses);
      } catch (err) {
        console.error('Error fetching favorites:', err);
        setError('No se pudieron cargar los favoritos. Intenta nuevamente.');
      } finally {
        setLoading(false);
      }
    }

    fetchFavorites();
  }, [favorites]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-10 pb-24 md:pb-10">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Link
              href="/negocios"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition"
            >
              ←
            </Link>
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-[#38761D] flex items-center gap-3">
                <span className="text-red-500 text-4xl">♥</span>
                Mis Favoritos
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {favorites.length === 0 
                  ? 'Aún no has guardado ningún negocio' 
                  : `${favorites.length} ${favorites.length === 1 ? 'negocio guardado' : 'negocios guardados'}`}
              </p>
            </div>
          </div>
          
          <p className="text-base text-gray-700">
            Aquí encontrarás todos los negocios que has marcado como favoritos. 
            Toca el corazón <span className="text-red-500">♥</span> en cualquier negocio para agregarlo a esta lista.
          </p>
        </header>

        {/* Loading State */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 animate-pulse">
                <div className="flex flex-col gap-3">
                  <div className="h-6 w-40 rounded bg-gray-200" />
                  <div className="flex gap-2">
                    <div className="h-5 w-20 rounded-full bg-gray-200" />
                    <div className="h-5 w-24 rounded-full bg-gray-200" />
                  </div>
                  <div className="h-4 w-2/3 rounded bg-gray-200" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-r-lg">
            <p className="font-semibold">⚠️ Error</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && favorites.length === 0 && (
          <div className="bg-white border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center">
            <div className="text-6xl mb-4">💔</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              No tienes favoritos aún
            </h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Explora el directorio y marca con <span className="text-red-500">♥</span> los negocios que más te gusten para tenerlos siempre a la mano.
            </p>
            <Link
              href="/negocios"
              className="inline-flex items-center gap-2 bg-[#38761D] text-white px-6 py-3 rounded-lg hover:bg-[#2f5a1a] transition font-semibold shadow-md"
            >
              Explorar negocios →
            </Link>
          </div>
        )}

        {/* Business List */}
        {!loading && !error && businesses.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Mostrando {businesses.length} de {favorites.length} favoritos
              </p>
              <Link
                href="/negocios"
                className="text-sm text-emerald-600 font-semibold hover:text-emerald-700 hover:underline"
              >
                Ver todos los negocios →
              </Link>
            </div>
            
            {businesses.map((business) => (
              <BusinessCard key={business.id} business={business} />
            ))}

            {businesses.length < favorites.length && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-xl px-4 py-3 text-sm text-center">
                ℹ️ Algunos favoritos podrían no estar disponibles o haber sido eliminados
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
