'use client';

import React, { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import AlgoliaSearch from './AlgoliaSearch';
import BusinessModalWrapper from './BusinessModalWrapper';
import type { Business } from '../types/business';

function NegociosAlgoliaContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);

  const initialCategory = searchParams?.get('c') || undefined;
  const initialCity = searchParams?.get('city') || undefined;
  const initialState = searchParams?.get('state') || undefined;

  const handleBusinessClick = (business: Business) => {
    setSelectedBusiness(business);
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('id', business.id || '');
    router.push(`/negocios?${params.toString()}`, { scroll: false });
  };

  const handleCloseModal = () => {
    setSelectedBusiness(null);
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.delete('id');
    const newUrl = params.toString() ? `/negocios?${params.toString()}` : '/negocios';
    router.push(newUrl, { scroll: false });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 py-12 text-white">
        <div className="container mx-auto px-4">
          <h1 className="mb-2 text-4xl font-bold">Directorio de Negocios</h1>
          <p className="text-xl text-blue-100">Búsqueda instantánea con filtros inteligentes</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <AlgoliaSearch
          onBusinessClick={handleBusinessClick}
          initialFilters={{
            category: initialCategory,
            city: initialCity,
            state: initialState,
          }}
          hitsPerPage={20}
          showFilters
        />
      </div>

      {selectedBusiness ? (
        <BusinessModalWrapper
          businessPreview={selectedBusiness}
          onClose={handleCloseModal}
        />
      ) : null}
    </div>
  );
}

function AlgoliaLoadingFallback() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 py-12 text-white">
        <div className="container mx-auto px-4">
          <h1 className="mb-2 text-4xl font-bold">Directorio de Negocios</h1>
          <p className="text-xl text-blue-100">Búsqueda instantánea con filtros inteligentes</p>
        </div>
      </div>
      <div className="container mx-auto px-4 py-8 text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
        <p className="mt-4 text-gray-600">Cargando búsqueda...</p>
      </div>
    </div>
  );
}

export default function NegociosAlgoliaClient() {
  return (
    <Suspense fallback={<AlgoliaLoadingFallback />}>
      <NegociosAlgoliaContent />
    </Suspense>
  );
}
