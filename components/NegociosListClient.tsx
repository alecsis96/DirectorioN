'use client';

import type { ChangeEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { User } from 'firebase/auth';
import { onAuthStateChanged, signOut } from 'firebase/auth';

import BusinessCard from './BusinessCard';
import SearchHeader from './SearchHeader';
import { auth, signInWithGoogle } from '../firebaseConfig';
import { sendEvent } from '../lib/telemetry';
import { sliceBusinesses } from '../lib/pagination';
import type { BusinessPreview } from '../types/business';
import { normalizeColonia } from '../lib/helpers/colonias';
import { DEFAULT_FILTER_STATE, DEFAULT_ORDER, PAGE_SIZE, type Filters, type SortMode } from '../lib/negociosFilters';

const SkeletonCard = () => (
  <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 animate-pulse">
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-4">
        <div className="h-6 w-40 rounded bg-gray-200" />
        <div className="h-4 w-16 rounded bg-gray-200" />
      </div>
      <div className="flex flex-wrap gap-2">
        <div className="h-5 w-20 rounded-full bg-gray-200" />
        <div className="h-5 w-24 rounded-full bg-gray-200" />
        <div className="h-5 w-16 rounded-full bg-gray-200" />
      </div>
      <div className="h-4 w-2/3 rounded bg-gray-200" />
      <div className="h-10 w-28 rounded bg-gray-200" />
    </div>
  </div>
);

const SkeletonList = ({ count }: { count: number }) => (
  <div className="space-y-4">
    {Array.from({ length: count }).map((_, index) => (
      <SkeletonCard key={`skeleton-${index}`} />
    ))}
  </div>
);

export type NegociosListClientProps = {
  businesses: BusinessPreview[];
  categories: string[];
  colonias: string[];
  initialFilters?: Filters;
  initialError?: string | null;
  geoQuery?: {
    lat?: string;
    lng?: string;
    radius?: string;
  } | null;
};

const FALLBACK_FILTERS: Filters = DEFAULT_FILTER_STATE;

export default function NegociosListClient({
  businesses = [],
  categories = [],
  colonias = [],
  initialFilters = FALLBACK_FILTERS,
  initialError = null,
  geoQuery = null,
}: NegociosListClientProps) {
  const pathname = usePathname() || '/negocios';
  const geoQueryRef = useRef(geoQuery);
  const [user, setUser] = useState<User | null>(() => auth.currentUser);
  const [prefersDataSaver, setPrefersDataSaver] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [uiFilters, setUiFilters] = useState<Filters>(() => ({
    category: initialFilters.category || '',
    colonia: initialFilters.colonia || '',
    order: initialFilters.order || DEFAULT_ORDER,
    page: initialFilters.page || 1,
    query: initialFilters.query || '',
  }));
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const pageViewType = pathname === '/' ? 'home' : 'list';

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    setUiFilters({
      category: initialFilters.category || '',
      colonia: initialFilters.colonia || '',
      order: initialFilters.order || DEFAULT_ORDER,
      page: initialFilters.page || 1,
      query: initialFilters.query || '',
    });
  }, [
    initialFilters.category,
    initialFilters.colonia,
    initialFilters.order,
    initialFilters.page,
    initialFilters.query,
  ]);

  useEffect(() => {
    geoQueryRef.current = geoQuery;
  }, [geoQuery]);

  useEffect(() => {
    if (typeof navigator === 'undefined') return undefined;
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (connection && typeof connection.saveData === 'boolean') {
      setPrefersDataSaver(Boolean(connection.saveData));
    }
    return undefined;
  }, []);

  useEffect(() => {
    sendEvent({ t: 'pv', p: pageViewType });
  }, [pageViewType]);

  useEffect(() => {
    if (!isFetching) return undefined;
    const timeout = window.setTimeout(() => setIsFetching(false), 150);
    return () => window.clearTimeout(timeout);
  }, [isFetching]);

  const syncUrl = useCallback(
    (next: Filters) => {
      if (typeof window === 'undefined') return;
      const params = new URLSearchParams();
      if (next.category) params.set('c', next.category);
      if (next.colonia) params.set('co', next.colonia);
      if (next.order && next.order !== DEFAULT_ORDER) params.set('o', next.order);
      if (next.page > 1) params.set('p', String(next.page));
      if (next.query) params.set('q', next.query);
      else params.delete('q');
      const geo = geoQueryRef.current;
      if (geo?.lat) params.set('lat', geo.lat);
      if (geo?.lng) params.set('lng', geo.lng);
      if (geo?.radius) params.set('radius', geo.radius);
      const qs = params.toString();
      const nextUrl = qs ? `${pathname}?${qs}` : pathname;
      window.history.replaceState({}, '', nextUrl);
    },
    [pathname],
  );

  const updateFilters = useCallback(
    (partial: Partial<Filters>, options?: { resetPage?: boolean }) => {
      setIsFetching(true);
      setUiFilters((prev) => {
        const nextPage = options?.resetPage ? 1 : partial.page ?? prev.page;
        const next: Filters = {
          category: partial.category ?? prev.category,
          colonia: partial.colonia ?? prev.colonia,
          order: partial.order ?? prev.order,
          page: nextPage,
          query: partial.query ?? prev.query,
        };
        syncUrl(next);
        return next;
      });
    },
    [syncUrl],
  );

  const handleCategoryChange = useCallback(
    (eventOrValue: ChangeEvent<HTMLSelectElement> | string) => {
      const value = typeof eventOrValue === 'string' ? eventOrValue : eventOrValue.target.value;
      updateFilters({ category: value }, { resetPage: true });
    },
    [updateFilters],
  );

  const handleColoniaChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      updateFilters({ colonia: event.target.value }, { resetPage: true });
    },
    [updateFilters],
  );

  const handleOrderChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      updateFilters({ order: event.target.value as SortMode }, { resetPage: true });
    },
    [updateFilters],
  );

  const handleSignIn = useCallback(() => {
    signInWithGoogle().catch((error) => {
      console.error('sign-in', error);
    });
  }, []);

  const handleSignOut = useCallback(() => {
    signOut(auth).catch((error) => {
      console.error('sign-out', error);
    });
  }, []);

  const paginated = useMemo(() => {
    const normalizedColonia = uiFilters.colonia;
    const normalizedCategory = uiFilters.category;
    const normalizedQuery = uiFilters.query.trim().toLowerCase();
    const filtered = businesses.filter((biz) => {
      if (normalizedCategory && biz.category !== normalizedCategory) return false;
      if (normalizedColonia && normalizeColonia(biz.colonia) !== normalizedColonia) return false;
      if (normalizedQuery) {
        const haystack = `${biz.name ?? ''} ${biz.address ?? ''} ${biz.category ?? ''}`.toLowerCase();
        if (!haystack.includes(normalizedQuery)) return false;
      }
      return true;
    });
    const sorted = [...filtered];
    if (uiFilters.order === 'az') {
      sorted.sort((a, b) => a.name.localeCompare(b.name, 'es'));
    } else if (uiFilters.order === 'rating') {
      sorted.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    } else {
      sorted.sort((a, b) => {
        if (a.isOpen !== b.isOpen) {
          return a.isOpen === 'si' ? -1 : 1;
        }
        return (b.rating ?? 0) - (a.rating ?? 0);
      });
    }
    const pageCount = Math.max(1, uiFilters.page);
    const currentSlice = sliceBusinesses(sorted, pageCount, PAGE_SIZE);
    const previousEnd = (pageCount - 1) * PAGE_SIZE;
    const accumulated = pageCount > 1 ? sorted.slice(0, previousEnd).concat(currentSlice) : currentSlice;
    return {
      items: accumulated,
      total: sorted.length,
    };
  }, [businesses, uiFilters]);

  const hasMore = paginated.items.length < paginated.total;

  const handleLoadMore = useCallback(() => {
    if (isFetching || !hasMore) return;
    updateFilters({ page: uiFilters.page + 1 });
  }, [hasMore, isFetching, uiFilters.page, updateFilters]);

  useEffect(() => {
    if (prefersDataSaver || !hasMore) return undefined;
    const target = sentinelRef.current;
    if (!target) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          handleLoadMore();
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [prefersDataSaver, hasMore, handleLoadMore]);

  const selectedColoniaLabel = useMemo(() => {
    if (!uiFilters.colonia) return '';
    const found = colonias.find((c) => normalizeColonia(c) === uiFilters.colonia);
    return found || uiFilters.colonia;
  }, [uiFilters.colonia, colonias]);

  const headingDescription = useMemo(() => {
    const segments: string[] = [];
    if (uiFilters.query) segments.push(`"${uiFilters.query}"`);
    if (uiFilters.category) segments.push(uiFilters.category);
    if (uiFilters.colonia) segments.push(`en ${selectedColoniaLabel}`);
    if (!segments.length) {
      return 'Explora comercios locales sin consumir datos extra.';
    }
    return `Resultados para ${segments.join(' ')}.`;
  }, [uiFilters.category, uiFilters.colonia, uiFilters.query, selectedColoniaLabel]);

  const activeGeo = geoQueryRef.current;
  const radiusValue = activeGeo?.radius ? Number.parseFloat(activeGeo.radius) : undefined;
  const radiusKm = Number.isFinite(radiusValue) && radiusValue! > 0 ? Number(radiusValue) : 5;
  const hasGeoActive = Boolean(activeGeo?.lat && activeGeo?.lng);

  const clearGeoFilters = useCallback(() => {
    if (typeof window === 'undefined') return;
    geoQueryRef.current = null;
    const params = new URLSearchParams(window.location.search);
    params.delete('lat');
    params.delete('lng');
    params.delete('radius');
    const qs = params.toString();
    window.location.href = qs ? `${pathname}?${qs}` : pathname;
  }, [pathname]);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    console.info('home_render', { count: paginated.items.length, saveData: prefersDataSaver });
  }, [paginated.items.length, prefersDataSaver]);

  const showEmptyState = paginated.items.length === 0 && !isFetching;

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-gray-50 text-gray-800 font-sans">
      <SearchHeader
        initialQuery={uiFilters.query}
        hasGeoActive={hasGeoActive}
        radiusKm={radiusKm}
        onClearLocation={hasGeoActive ? clearGeoFilters : undefined}
        categories={categories}
        colonias={colonias}
        currentFilters={{
          category: uiFilters.category,
          colonia: uiFilters.colonia,
          order: uiFilters.order,
        }}
      />
      <section className="max-w-6xl mx-auto px-6 py-10">
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg">
              <span className="text-2xl">🏪</span>
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-[#38761D] leading-tight">
                Directorio de Negocios en Yajalón
              </h1>
              <p className="text-sm md:text-base text-emerald-600 font-semibold">
                Tu guía completa de comercios locales
              </p>
            </div>
          </div>
          <p className="text-base md:text-lg text-gray-700 leading-relaxed">
            <span className="font-semibold text-gray-900">Descubre, compara y conecta</span> con los mejores negocios de Yajalón. 
            Encuentra restaurantes, tiendas, servicios profesionales y más, todo en un solo lugar. 
            <span className="inline-flex items-center gap-1 ml-1 text-emerald-600">
              📍 Cerca de ti, fácil de encontrar
            </span>
          </p>
          {initialError && (
            <p className="mt-3 text-sm text-amber-700 bg-amber-50 border-l-4 border-amber-500 rounded-r-lg px-4 py-3 shadow-sm">
              ⚠️ {initialError}
            </p>
          )}
          {prefersDataSaver && (
            <p className="mt-2 text-xs text-gray-500 bg-blue-50 px-3 py-2 rounded-lg">
              💾 Modo ahorro de datos activo: evitamos imágenes y mapas embebidos.
            </p>
          )}
          
          <div className="mt-6 flex flex-col sm:flex-row gap-3 items-start sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
              <span className="text-gray-700">
                ¿Tienes un negocio?
              </span>
              <Link
                prefetch={false}
                href="/para-negocios"
                className="text-emerald-600 font-semibold hover:text-emerald-700 hover:underline underline-offset-2 transition"
              >
                Regístralo aquí →
              </Link>
              <span className="text-gray-400">|</span>
              <Link
                prefetch={false}
                href="/mis-solicitudes"
                className="text-blue-600 font-semibold hover:text-blue-700 hover:underline underline-offset-2 transition"
              >
                Verificar solicitud →
              </Link>
            </div>
            
            {user ? (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-xs text-gray-500">{user.email}</span>
                <button
                  onClick={handleSignOut}
                  className="rounded border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-100 transition"
                >
                  Cerrar sesión
                </button>
              </div>
            ) : (
              <button
                onClick={handleSignIn}
                className="rounded bg-[#38761D] px-3 py-1 text-xs font-semibold text-white hover:bg-[#2f5a1a]"
              >
                Iniciar sesion
              </button>
            )}
          </div>
        </header>

        {/* Categorías Destacadas */}
        {!uiFilters.category && !uiFilters.query && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="text-2xl">🏷️</span>
              Explora por categoría
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {[
                { name: 'Restaurantes', icon: '🍽️', color: 'from-orange-500 to-red-500', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' },
                { name: 'Servicios', icon: '🔧', color: 'from-blue-500 to-cyan-500', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
                { name: 'Tiendas', icon: '🛍️', color: 'from-purple-500 to-pink-500', bgColor: 'bg-purple-50', borderColor: 'border-purple-200' },
                { name: 'Salud', icon: '🏥', color: 'from-green-500 to-emerald-500', bgColor: 'bg-green-50', borderColor: 'border-green-200' },
                { name: 'Educación', icon: '📚', color: 'from-indigo-500 to-blue-500', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-200' },
                { name: 'Entretenimiento', icon: '🎬', color: 'from-rose-500 to-pink-500', bgColor: 'bg-rose-50', borderColor: 'border-rose-200' },
              ]
                .filter(cat => categories.some(c => c.toLowerCase().includes(cat.name.toLowerCase())))
                .map((cat) => (
                  <button
                    key={cat.name}
                    onClick={() => handleCategoryChange(categories.find(c => c.toLowerCase().includes(cat.name.toLowerCase())) || '')}
                    className={`group relative overflow-hidden rounded-xl ${cat.bgColor} border-2 ${cat.borderColor} p-4 text-center transition-all hover:shadow-lg hover:scale-105 active:scale-95`}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${cat.color} opacity-0 group-hover:opacity-10 transition-opacity`} />
                    <div className="relative">
                      <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">{cat.icon}</div>
                      <div className="text-sm font-bold text-gray-700 group-hover:text-gray-900">
                        {categories.find(c => c.toLowerCase().includes(cat.name.toLowerCase())) || cat.name}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {filteredBusinesses.filter(b => b.category?.toLowerCase().includes(cat.name.toLowerCase())).length} negocios
                      </div>
                    </div>
                  </button>
                ))}
              
              {/* Ver todas las categorías */}
              <button
                onClick={() => {
                  const categoriesSection = document.getElementById('all-categories');
                  categoriesSection?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="group relative overflow-hidden rounded-xl bg-gray-50 border-2 border-gray-200 p-4 text-center transition-all hover:shadow-lg hover:scale-105 active:scale-95 hover:bg-gray-100"
              >
                <div className="relative">
                  <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">📋</div>
                  <div className="text-sm font-bold text-gray-700 group-hover:text-gray-900">
                    Ver todas
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {categories.length} categorías
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Filtros activos - Chips para mostrar filtros seleccionados */}
        {(uiFilters.category || uiFilters.colonia || uiFilters.order !== DEFAULT_ORDER) && (
          <div className="mb-6 flex flex-wrap gap-2">
            {uiFilters.category && (
              <button
                onClick={() => updateFilters({ category: '' }, { resetPage: true })}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-800 rounded-full text-sm font-medium hover:bg-green-200 transition"
              >
                📂 {uiFilters.category}
                <span className="text-green-600">✕</span>
              </button>
            )}
            {uiFilters.colonia && (
              <button
                onClick={() => updateFilters({ colonia: '' }, { resetPage: true })}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm font-medium hover:bg-blue-200 transition"
              >
                📍 {selectedColoniaLabel}
                <span className="text-blue-600">✕</span>
              </button>
            )}
            {uiFilters.order !== DEFAULT_ORDER && (
              <button
                onClick={() => updateFilters({ order: DEFAULT_ORDER }, { resetPage: true })}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-800 rounded-full text-sm font-medium hover:bg-purple-200 transition"
              >
                🔄 {uiFilters.order === 'rating' ? 'Mejor calificados' : 'A-Z'}
                <span className="text-purple-600">✕</span>
              </button>
            )}
            <button
              onClick={() => updateFilters({ category: '', colonia: '', order: DEFAULT_ORDER }, { resetPage: true })}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-gray-600 text-sm font-medium hover:text-gray-800 underline"
            >
              Limpiar filtros
            </button>
          </div>
        )}

        <div id="all-categories" className="space-y-6">
          {showEmptyState && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-xl px-4 py-6 text-center">
              No encontramos negocios con los filtros seleccionados. Ajusta la busqueda para ver mas opciones.
            </div>
          )}

          {!showEmptyState && paginated.items.map((biz) => <BusinessCard key={biz.id} business={biz} />)}

          {isFetching && paginated.items.length === 0 && <SkeletonList count={3} />}
          {isFetching && paginated.items.length > 0 && <SkeletonList count={1} />}
        </div>

        {hasMore && (
          <div className="mt-6 flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={isFetching}
              aria-label="Cargar mas resultados"
              className="inline-flex items-center justify-center px-5 py-2 rounded-lg bg-[#38761D] text-white text-sm font-semibold hover:bg-[#2f5a1a] transition disabled:opacity-50"
            >
              {isFetching ? 'Cargando...' : 'Cargar mas'}
            </button>
            {!prefersDataSaver && <div ref={sentinelRef} className="h-1 w-full" aria-hidden="true" />}
          </div>
        )}
      </section>
    </main>
  );
}
