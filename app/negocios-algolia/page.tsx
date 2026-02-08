/**
 * Página de negocios con búsqueda Algolia
 * Nueva versión con motor de búsqueda dedicado
 */

'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import AlgoliaSearch from '../../components/AlgoliaSearch';
import BusinessModalWrapper from '../../components/BusinessModalWrapper';
import type { Business } from '../../types/business';

function NegociosAlgoliaContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);

  // Obtener filtros iniciales de URL
  const initialCategory = searchParams?.get('c') || undefined;
  const initialCity = searchParams?.get('city') || undefined;
  const initialState = searchParams?.get('state') || undefined;

  const handleBusinessClick = (business: Business) => {
    setSelectedBusiness(business);
    // Actualizar URL con el ID del negocio
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('id', business.id || '');
    router.push(`/negocios?${params.toString()}`, { scroll: false });
  };

  const handleCloseModal = () => {
    setSelectedBusiness(null);
    // Remover ID de la URL
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.delete('id');
    const newUrl = params.toString() ? `/negocios?${params.toString()}` : '/negocios';
    router.push(newUrl, { scroll: false });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold mb-2">Directorio de Negocios</h1>
          <p className="text-xl text-blue-100">
            Búsqueda instantánea con filtros inteligentes
          </p>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="container mx-auto px-4 py-8">
        <AlgoliaSearch
          onBusinessClick={handleBusinessClick}
          initialFilters={{
            category: initialCategory,
            city: initialCity,
            state: initialState,
          }}
          hitsPerPage={20}
          showFilters={true}
        />
      </div>

      {/* Modal de detalles */}
      {selectedBusiness && (
        <BusinessModalWrapper
          businessPreview={selectedBusiness}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}

export default function NegociosAlgoliaPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-12">
          <div className="container mx-auto px-4">
            <h1 className="text-4xl font-bold mb-2">Directorio de Negocios</h1>
            <p className="text-xl text-blue-100">
              Búsqueda instantánea con filtros inteligentes
            </p>
          </div>
        </div>
        <div className="container mx-auto px-4 py-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando búsqueda...</p>
        </div>
      </div>
    }>
      <NegociosAlgoliaContent />
    </Suspense>
  );
}
