'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { BsFilter, BsSearch, BsGeoAlt } from 'react-icons/bs';
import GeolocationButton from './GeolocationButton';
import { useFavorites } from '../context/FavoritesContext';
import type { SortMode } from '../lib/negociosFilters';

type SearchHeaderProps = {
  initialQuery?: string;
  hasGeoActive?: boolean;
  radiusKm?: number;
  onClearLocation?: () => void;
  categories: string[];
  colonias: string[];
  currentFilters: {
    category: string;
    colonia: string;
    order: SortMode;
  };
};

const sortOptions: { label: string; value: SortMode }[] = [
  { label: 'Destacado', value: 'destacado' },
  { label: 'Mejor calificados', value: 'rating' },
  { label: 'A-Z', value: 'az' },
];

export default function SearchHeader({
  initialQuery = '',
  hasGeoActive = false,
  radiusKm = 5,
  onClearLocation,
  categories,
  colonias,
  currentFilters,
}: SearchHeaderProps) {
  const router = useRouter();
  const pathname = usePathname() || '/negocios';
  const params = useSearchParams();
  const [term, setTerm] = useState(initialQuery);
  const [isVisible, setIsVisible] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const lastScrollRef = useRef(0);

  const [selectedCategory, setSelectedCategory] = useState(currentFilters.category);
  const [selectedColonia, setSelectedColonia] = useState(currentFilters.colonia);
  const [selectedOrder, setSelectedOrder] = useState<SortMode>(currentFilters.order);
  const radiusQueryValue = params?.get('radius') ?? params?.get('r') ?? '';
  const [radiusValue, setRadiusValue] = useState(radiusQueryValue);
  const [geoFeedback, setGeoFeedback] = useState<string | null>(null);
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { favorites } = useFavorites();

  useEffect(() => {
    setTerm(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    setSelectedCategory(currentFilters.category);
    setSelectedColonia(currentFilters.colonia);
    setSelectedOrder(currentFilters.order);
  }, [currentFilters.category, currentFilters.colonia, currentFilters.order]);

  useEffect(() => {
    setRadiusValue(radiusQueryValue);
  }, [radiusQueryValue]);

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const current = window.scrollY;
      const last = lastScrollRef.current;
      if (Math.abs(current - last) < 6) return;
      if (current > last && current > 60) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      lastScrollRef.current = current;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const applyQuery = (value: string) => {
    const nextParams = new URLSearchParams(params?.toString() ?? '');
    if (value) {
      nextParams.set('q', value);
    } else {
      nextParams.delete('q');
    }
    const qs = nextParams.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    applyQuery(term.trim());
  };

  const locationTitle = hasGeoActive ? 'Negocios cerca de ti' : 'Activa tu ubicación';
  const locationSubtitle = hasGeoActive
    ? `Radio ${radiusQueryValue || radiusKm} km`
    : 'Toca el pin para obtener resultados cercanos.';

  const handleGeoSuccess = useCallback(() => {
    setIsModalOpen(false);
    setRadiusValue(String(radiusKm));
    setGeoFeedback('Ubicación actualizada');
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }
    feedbackTimeoutRef.current = setTimeout(() => setGeoFeedback(null), 2500);
  }, [radiusKm]);

  const handleApplyFilters = () => {
    const nextParams = new URLSearchParams(params?.toString() ?? '');
    if (selectedCategory) {
      nextParams.set('c', selectedCategory);
    } else {
      nextParams.delete('c');
    }

    if (selectedColonia) {
      nextParams.set('co', selectedColonia);
    } else {
      nextParams.delete('co');
    }

    if (selectedOrder && selectedOrder !== 'destacado') {
      nextParams.set('o', selectedOrder);
    } else {
      nextParams.delete('o');
    }

    if (radiusValue) {
      nextParams.set('radius', radiusValue);
      nextParams.set('r', radiusValue);
    } else {
      nextParams.delete('radius');
      nextParams.delete('r');
    }

    nextParams.delete('p');

    const qs = nextParams.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
    setIsModalOpen(false);
  };

  // Contador de filtros activos
  const activeFiltersCount = [
    selectedCategory,
    selectedColonia,
    selectedOrder !== 'destacado' ? selectedOrder : null
  ].filter(Boolean).length;

  return (
    <>
      <div
        className={`sticky top-0 z-20 border-b border-gray-100 bg-white/90 shadow-md backdrop-blur transition-transform duration-300 ${isVisible ? 'translate-y-0' : '-translate-y-full'}`}
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 md:px-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 shadow-inner">
                <BsGeoAlt className="text-base" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase text-gray-500">Ubicación</p>
                <p className="text-sm font-medium text-gray-900">{locationTitle}</p>
                <p className="text-xs text-gray-500">{locationSubtitle}</p>
                {geoFeedback && <p className="text-xs font-semibold text-emerald-600">{geoFeedback}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasGeoActive && onClearLocation && (
                <button
                  type="button"
                  onClick={onClearLocation}
                  className="text-xs font-semibold text-gray-500 underline-offset-2 hover:underline"
                >
                  Limpiar
                </button>
              )}
              <GeolocationButton
                radiusKm={radiusKm}
                variant="compact"
                label="Mi ubicación"
                onSuccess={handleGeoSuccess}
              />
              <Link
                href="/favoritos"
                className="relative inline-flex items-center justify-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
              >
                <span className="text-red-500">♥</span>
                Favoritos
                {favorites.length > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white shadow-lg">
                    {favorites.length}
                  </span>
                )}
              </Link>
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="relative inline-flex items-center justify-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
              >
                <BsFilter aria-hidden="true" />
                Filtros
                {activeFiltersCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white shadow-lg">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 shadow-sm"
          >
            <BsSearch className="text-gray-400" aria-hidden="true" />
            <input
              type="search"
              placeholder="Buscar un negocio o producto"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              className="flex-1 bg-transparent text-sm text-gray-700 focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-full bg-emerald-500 px-4 py-1 text-xs font-semibold text-white hover:bg-emerald-600"
            >
              Buscar
            </button>
          </form>
        </div>
      </div>

      {isModalOpen && (
        <div 
          className="fixed inset-0 z-30 flex items-end justify-center bg-black/50 backdrop-blur-sm px-4 pb-6 sm:items-center transition-all"
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl transform transition-all animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del Modal */}
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Filtros de búsqueda</h3>
                <p className="text-sm text-gray-500 mt-1">Personaliza tus resultados</p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition"
                aria-label="Cerrar filtros"
              >
                ✕
              </button>
            </div>

            <div className="space-y-5">
              {/* Categoría */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
                <label className="flex items-center gap-2 mb-2 text-sm font-bold text-green-900">
                  <span className="text-lg">📂</span>
                  Categoría
                </label>
                <select
                  value={selectedCategory}
                  onChange={(event) => setSelectedCategory(event.target.value)}
                  className="w-full rounded-lg border-2 border-green-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                >
                  <option value="">Todas las categorías</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Colonia */}
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-100">
                <label className="flex items-center gap-2 mb-2 text-sm font-bold text-blue-900">
                  <span className="text-lg">📍</span>
                  Colonia
                </label>
                <select
                  value={selectedColonia}
                  onChange={(event) => setSelectedColonia(event.target.value)}
                  className="w-full rounded-lg border-2 border-blue-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                >
                  <option value="">Todas las colonias</option>
                  {colonias.map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
              </div>

              {/* Ordenar */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-100">
                <label className="flex items-center gap-2 mb-2 text-sm font-bold text-purple-900">
                  <span className="text-lg">🔄</span>
                  Ordenar por
                </label>
                <select
                  value={selectedOrder}
                  onChange={(event) => setSelectedOrder(event.target.value as SortMode)}
                  className="w-full rounded-lg border-2 border-purple-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Radio de búsqueda */}
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-4 border border-orange-100">
                <label className="flex items-center gap-2 mb-2 text-sm font-bold text-orange-900">
                  <span className="text-lg">📏</span>
                  Radio de búsqueda
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={radiusValue}
                  onChange={(event) => setRadiusValue(event.target.value)}
                  className="w-full rounded-lg border-2 border-orange-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
                  placeholder="Ej. 5 km"
                />
                <p className="mt-2 text-xs text-orange-700">
                  💡 Activa tu ubicación para búsquedas cercanas
                </p>
              </div>

              {/* Botón de Geolocalización */}
              <div className="rounded-xl border-2 border-dashed border-gray-300 p-4 bg-gray-50">
                <p className="mb-3 text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <span className="text-base">🎯</span>
                  Búsqueda por ubicación
                </p>
                <GeolocationButton
                  radiusKm={Number(radiusValue) || radiusKm}
                  label="📍 Usar mi ubicación actual"
                  onSuccess={handleGeoSuccess}
                />
              </div>
            </div>

            {/* Botones de Acción */}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('');
                  setSelectedColonia('');
                  setSelectedOrder('destacado');
                  setRadiusValue('');
                }}
                className="flex-1 rounded-xl border-2 border-gray-300 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 transition"
              >
                Limpiar todo
              </button>
              <button
                type="button"
                onClick={handleApplyFilters}
                className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 py-3 text-sm font-bold text-white hover:from-emerald-600 hover:to-green-700 shadow-lg hover:shadow-xl transition-all"
              >
                Aplicar filtros
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
