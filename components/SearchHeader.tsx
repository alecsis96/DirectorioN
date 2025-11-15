'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { BsFilter, BsSearch, BsGeoAlt } from 'react-icons/bs';
import GeolocationButton from './GeolocationButton';
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
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                <BsFilter aria-hidden="true" />
                Filtros
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
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 px-4 pb-6 sm:items-center">
          <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">Filtros</h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Cerrar
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-gray-500">Categoria</label>
                <select
                  value={selectedCategory}
                  onChange={(event) => setSelectedCategory(event.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring focus:ring-emerald-100"
                >
                  <option value="">Todas</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-gray-500">Colonia</label>
                <select
                  value={selectedColonia}
                  onChange={(event) => setSelectedColonia(event.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring focus:ring-emerald-100"
                >
                  <option value="">Todas</option>
                  {colonias.map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-gray-500">Ordenar por</label>
                <select
                  value={selectedOrder}
                  onChange={(event) => setSelectedOrder(event.target.value as SortMode)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring focus:ring-emerald-100"
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-gray-500">Radio (km)</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={radiusValue}
                  onChange={(event) => setRadiusValue(event.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring focus:ring-emerald-100"
                  placeholder="Ej. 5"
                />
                <p className="mt-1 text-xs text-gray-500">Usa el botón de ubicación para actualizar lat/lng.</p>
              </div>

              <div className="rounded-2xl border border-gray-200 p-3">
                <p className="mb-2 text-xs font-semibold text-gray-500 uppercase">Ubicación</p>
                <GeolocationButton
                  radiusKm={Number(radiusValue) || radiusKm}
                  label="Aplicar ubicación"
                  onSuccess={handleGeoSuccess}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleApplyFilters}
              className="mt-5 w-full rounded-full bg-emerald-500 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
            >
              Aplicar filtros
            </button>
          </div>
        </div>
      )}
    </>
  );
}
