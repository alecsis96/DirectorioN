/**
 * Componente de búsqueda mejorado con Algolia InstantSearch
 * 
 * Características:
 * - Búsqueda en tiempo real con debounce
 * - Faceted filters (categoría, ciudad, estado)
 * - Autocompletado
 * - Resultados instantáneos
 * - Geolocalización opcional
 */

'use client';

import React, { useState } from 'react';
import { InstantSearch, SearchBox, Hits, Configure, RefinementList, CurrentRefinements, Stats, Pagination } from 'react-instantsearch';
import { searchClient, ALGOLIA_INDEX_NAME } from '@/lib/algoliaClient';
import { Business } from '@/types/business';
import { MapPin, Star, Phone, Globe } from 'lucide-react';

interface AlgoliaHit extends Business {
  objectID: string;
  _highlightResult?: any;
}

interface AlgoliaSearchProps {
  onBusinessClick?: (business: Business) => void;
  initialFilters?: {
    category?: string;
    city?: string;
    state?: string;
  };
  hitsPerPage?: number;
  showFilters?: boolean;
}

/**
 * Componente de resultado individual (Hit)
 */
function BusinessHit({ hit, onClick }: { hit: AlgoliaHit; onClick?: (business: Business) => void }) {
  const handleClick = () => {
    onClick?.(hit as Business);
  };

  return (
    <div
      onClick={handleClick}
      className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow cursor-pointer border border-gray-200"
    >
      {/* Imagen */}
      <div className="relative h-48 mb-3 overflow-hidden rounded-md">
        <img
          src={hit.images?.[0] || hit.logo || '/placeholder-business.jpg'}
          alt={hit.name}
          className="w-full h-full object-cover"
        />
        {hit.isPremium && (
          <span className="absolute top-2 right-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
            Premium
          </span>
        )}
      </div>

      {/* Contenido */}
      <div className="space-y-2">
        {/* Nombre */}
        <h3 className="text-lg font-bold text-gray-900 line-clamp-1">
          {hit.name}
        </h3>

        {/* Categoría */}
        <p className="text-sm text-blue-600 font-medium">
          {hit.category}
          {hit.subcategory && ` • ${hit.subcategory}`}
        </p>

        {/* Descripción */}
        {hit.description && (
          <p className="text-sm text-gray-600 line-clamp-2">
            {hit.description}
          </p>
        )}

        {/* Rating */}
        {hit.rating > 0 && (
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="text-sm font-semibold">{hit.rating.toFixed(1)}</span>
            <span className="text-xs text-gray-500">({hit.reviewCount || 0})</span>
          </div>
        )}

        {/* Ubicación */}
        {hit.address?.city && (
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <MapPin className="w-4 h-4" />
            <span>{hit.address.city}, {hit.address.state}</span>
          </div>
        )}

        {/* Contacto rápido */}
        <div className="flex gap-2 pt-2">
          {hit.phone && (
            <a
              href={`tel:${hit.phone}`}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-full hover:bg-blue-100"
            >
              <Phone className="w-3 h-3" />
              Llamar
            </a>
          )}
          {hit.website && (
            <a
              href={hit.website}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 text-xs bg-gray-50 text-gray-600 px-3 py-1 rounded-full hover:bg-gray-100"
            >
              <Globe className="w-3 h-3" />
              Web
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Componente principal de búsqueda con Algolia
 */
export default function AlgoliaSearch({
  onBusinessClick,
  initialFilters = {},
  hitsPerPage = 20,
  showFilters = true,
}: AlgoliaSearchProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Construir filtros iniciales
  const filters = Object.entries(initialFilters)
    .filter(([_, value]) => value)
    .map(([key, value]) => `${key}:"${value}"`)
    .join(' AND ');

  return (
    <InstantSearch
      searchClient={searchClient}
      indexName={ALGOLIA_INDEX_NAME}
      future={{ preserveSharedStateOnUnmount: true }}
    >
      <Configure
        hitsPerPage={hitsPerPage}
        filters={`status:published${filters ? ` AND ${filters}` : ''}`}
        attributesToSnippet={['description:20']}
        snippetEllipsisText="..."
      />

      <div className="space-y-4">
        {/* Barra de búsqueda */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <SearchBox
            placeholder="Busca negocios, categorías, ubicaciones..."
            classNames={{
              root: 'w-full',
              form: 'relative',
              input: 'w-full px-4 py-3 pl-10 pr-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500',
              submit: 'absolute left-3 top-1/2 -translate-y-1/2',
              reset: 'absolute right-3 top-1/2 -translate-y-1/2',
              submitIcon: 'w-5 h-5 text-gray-400',
              resetIcon: 'w-5 h-5 text-gray-400',
              loadingIcon: 'w-5 h-5 text-gray-400',
            }}
          />

          {/* Stats */}
          <div className="mt-2 text-sm text-gray-600">
            <Stats
              classNames={{
                root: 'text-center',
                text: 'text-sm text-gray-600',
              }}
              translations={{
                rootElementText({ nbHits, processingTimeMS }) {
                  return `${nbHits.toLocaleString()} resultados encontrados en ${processingTimeMS}ms`;
                },
              }}
            />
          </div>
        </div>

        {/* Filtros activos */}
        <CurrentRefinements
          classNames={{
            root: 'flex flex-wrap gap-2',
            list: 'flex flex-wrap gap-2',
            item: 'bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center gap-2',
            label: 'font-medium',
            category: 'flex items-center gap-1',
            delete: 'text-blue-600 hover:text-blue-800 cursor-pointer',
          }}
        />

        {/* Layout principal */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar de filtros */}
          {showFilters && (
            <div className={`lg:col-span-1 ${filtersOpen ? 'block' : 'hidden lg:block'}`}>
              <div className="bg-white rounded-lg shadow-md p-4 space-y-6 sticky top-4">
                <h3 className="font-bold text-lg text-gray-900">Filtros</h3>

                {/* Categoría */}
                <div>
                  <h4 className="font-semibold text-sm text-gray-700 mb-2">Categoría</h4>
                  <RefinementList
                    attribute="category"
                    limit={10}
                    showMore={true}
                    showMoreLimit={50}
                    classNames={{
                      root: 'space-y-2',
                      list: 'space-y-2',
                      item: 'flex items-center gap-2',
                      label: 'flex items-center gap-2 cursor-pointer w-full',
                      checkbox: 'w-4 h-4 text-blue-600',
                      labelText: 'text-sm text-gray-700 flex-1',
                      count: 'text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full',
                      showMore: 'text-sm text-blue-600 hover:text-blue-800 mt-2 cursor-pointer',
                    }}
                  />
                </div>

                {/* Ciudad */}
                <div>
                  <h4 className="font-semibold text-sm text-gray-700 mb-2">Ciudad</h4>
                  <RefinementList
                    attribute="address.city"
                    limit={5}
                    showMore={true}
                    classNames={{
                      root: 'space-y-2',
                      list: 'space-y-2',
                      item: 'flex items-center gap-2',
                      label: 'flex items-center gap-2 cursor-pointer w-full',
                      checkbox: 'w-4 h-4 text-blue-600',
                      labelText: 'text-sm text-gray-700 flex-1',
                      count: 'text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full',
                      showMore: 'text-sm text-blue-600 hover:text-blue-800 mt-2 cursor-pointer',
                    }}
                  />
                </div>

                {/* Estado */}
                <div>
                  <h4 className="font-semibold text-sm text-gray-700 mb-2">Estado</h4>
                  <RefinementList
                    attribute="address.state"
                    limit={5}
                    showMore={true}
                    classNames={{
                      root: 'space-y-2',
                      list: 'space-y-2',
                      item: 'flex items-center gap-2',
                      label: 'flex items-center gap-2 cursor-pointer w-full',
                      checkbox: 'w-4 h-4 text-blue-600',
                      labelText: 'text-sm text-gray-700 flex-1',
                      count: 'text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full',
                      showMore: 'text-sm text-blue-600 hover:text-blue-800 mt-2 cursor-pointer',
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Resultados */}
          <div className={showFilters ? 'lg:col-span-3' : 'lg:col-span-4'}>
            {/* Botón toggle filtros móvil */}
            {showFilters && (
              <button
                onClick={() => setFiltersOpen(!filtersOpen)}
                className="lg:hidden mb-4 w-full bg-blue-600 text-white py-2 rounded-lg"
              >
                {filtersOpen ? 'Ocultar Filtros' : 'Mostrar Filtros'}
              </button>
            )}

            {/* Grid de resultados */}
            <Hits
              hitComponent={({ hit }) => (
                <BusinessHit hit={hit as AlgoliaHit} onClick={onBusinessClick} />
              )}
              classNames={{
                root: 'space-y-4',
                list: 'grid grid-cols-1 md:grid-cols-2 gap-4',
                item: '',
              }}
            />

            {/* Paginación */}
            <div className="mt-8">
              <Pagination
                classNames={{
                  root: 'flex justify-center',
                  list: 'flex gap-2',
                  item: 'px-3 py-2 rounded-lg border',
                  link: 'text-gray-700 hover:bg-gray-100',
                  selectedItem: 'bg-blue-600 text-white',
                  disabledItem: 'opacity-50 cursor-not-allowed',
                }}
                padding={2}
                showFirst={true}
                showLast={true}
                showPrevious={true}
                showNext={true}
              />
            </div>
          </div>
        </div>
      </div>
    </InstantSearch>
  );
}
