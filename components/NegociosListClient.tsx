'use client';

import type { ChangeEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import type { User } from 'firebase/auth';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import dynamic from 'next/dynamic';

import BusinessCard from './BusinessCard';
import { auth, signInWithGoogle } from '../firebaseConfig';
import { trackPageView } from '../lib/telemetry';
import { sliceBusinesses } from '../lib/pagination';
import type { Business, BusinessPreview } from '../types/business';
import { normalizeColonia } from '../lib/helpers/colonias';
import { DEFAULT_FILTER_STATE, DEFAULT_ORDER, PAGE_SIZE, type Filters, type SortMode } from '../lib/negociosFilters';
import { getBusinessStatus } from './BusinessHours';

const BusinessModalWrapper = dynamic(() => import('./BusinessModalWrapper'), { ssr: false });

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
  const searchParams = useSearchParams();
  const geoQueryRef = useRef(geoQuery);
  const lastUrlQueryRef = useRef(initialFilters.query || '');
  const [user, setUser] = useState<User | null>(() => auth.currentUser);
  const [prefersDataSaver, setPrefersDataSaver] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [quickFilterOpen, setQuickFilterOpen] = useState(false);
  const [quickFilterTopRated, setQuickFilterTopRated] = useState(false);
  const [quickFilterNew, setQuickFilterNew] = useState(false);
  const [quickFilterDelivery, setQuickFilterDelivery] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessPreview | Business | null>(null);
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

  // Escuchar cambios en la URL para búsqueda instantánea
  useEffect(() => {
    const urlQuery = searchParams?.get('q') || '';
    if (urlQuery !== lastUrlQueryRef.current) {
      lastUrlQueryRef.current = urlQuery;
      setUiFilters(prev => ({
        ...prev,
        query: urlQuery,
        page: 1, // Reset page on search
      }));
    }
  }, [searchParams]);

  useEffect(() => {
    if (typeof navigator === 'undefined') return undefined;
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (connection && typeof connection.saveData === 'boolean') {
      setPrefersDataSaver(Boolean(connection.saveData));
    }
    return undefined;
  }, []);

  useEffect(() => {
    trackPageView(pageViewType === 'home' ? 'home' : 'negocios', {
      totalBusinesses: businesses.length,
      geoQuery: geoQuery ? 'enabled' : 'disabled',
    });
  }, [pageViewType, businesses.length, geoQuery]);

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
        return next;
      });
    },
    [],
  );

  // Sincronizar URL cuando cambien los filtros
  useEffect(() => {
    syncUrl(uiFilters);
  }, [uiFilters, syncUrl]);

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
    const now = new Date();
    
    const filtered = businesses.filter((biz) => {
      if (normalizedCategory && biz.category !== normalizedCategory) return false;
      if (normalizedColonia && normalizeColonia(biz.colonia) !== normalizedColonia) return false;
      if (normalizedQuery) {
        const haystack = `${biz.name ?? ''} ${biz.address ?? ''} ${biz.category ?? ''} ${biz.description ?? ''} ${biz.phone ?? ''} ${biz.WhatsApp ?? ''} ${biz.colonia ?? ''}`.toLowerCase();
        if (!haystack.includes(normalizedQuery)) return false;
      }
      
      // Filtros rápidos
      if (quickFilterOpen) {
        // Calcular estado en tiempo real usando el horario
        if (!biz.hours) return false;
        const status = getBusinessStatus(biz.hours, now);
        if (!status.isOpen) return false;
      }
      if (quickFilterTopRated && (biz.rating ?? 0) < 4.5) return false;
      if (quickFilterDelivery && biz.hasDelivery !== true) return false;
      if (quickFilterNew) {
        const created = (biz as any).createdAt;
        if (created) {
          const createdDate = created.toDate ? created.toDate() : new Date(created);
          const daysDiff = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
          if (daysDiff > 30) return false;
        } else {
          return false;
        }
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
        // Calcular estado en tiempo real para ordenar
        const aOpen = a.hours ? getBusinessStatus(a.hours, now).isOpen : false;
        const bOpen = b.hours ? getBusinessStatus(b.hours, now).isOpen : false;
        if (aOpen !== bOpen) {
          return aOpen ? -1 : 1;
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
  }, [businesses, uiFilters, quickFilterOpen, quickFilterTopRated, quickFilterNew, quickFilterDelivery]);

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
      <section className="max-w-6xl mx-auto px-6 py-10 pb-24 md:pb-10">
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

        {/* Banner de Negocios Patrocinados - Máxima visibilidad */}
        {!uiFilters.category && !uiFilters.query && !uiFilters.colonia && (
          <>
            {(() => {
              const sponsored = businesses.filter(b => b.plan === 'sponsor').slice(0, 3);
              
              if (sponsored.length === 0) return null;
              
              return (
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                      <span className="text-3xl">👑</span>
                      Negocios Patrocinados
                    </h2>
                    <span className="text-xs text-gray-500 bg-purple-50 px-3 py-1 rounded-full border border-purple-200">
                      Premium Sponsor
                    </span>
                  </div>
                  
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {sponsored.map((business) => (
                      <div
                        key={business.id}
                        className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 via-pink-500 to-red-500 p-1 shadow-2xl hover:shadow-purple-500/50 transition-all duration-300"
                      >
                        <div className="bg-white rounded-[14px] p-5 h-full">
                          {/* Badge Patrocinado */}
                          <div className="absolute top-3 right-3 z-10 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
                            <span>👑</span>
                            SPONSOR
                          </div>
                          
                          <div className="flex flex-col h-full">
                            <div className="mb-4 flex-grow">
                              <h3 className="text-xl font-bold text-gray-900 mb-2 pr-20 group-hover:text-purple-600 transition">
                                {business.name}
                              </h3>
                              <div className="flex flex-wrap gap-2 mb-3">
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded-full">
                                  📂 {business.category}
                                </span>
                                {business.rating && business.rating > 0 && (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">
                                    ⭐ {business.rating.toFixed(1)}
                                  </span>
                                )}
                                {business.hasDelivery && (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-800 text-xs font-semibold rounded-full">
                                    🚚 Delivery
                                  </span>
                                )}
                              </div>
                              {business.address && (
                                <p className="text-sm text-gray-600 line-clamp-2">
                                  📍 {business.address}
                                </p>
                              )}
                            </div>

                            {/* Botones de acción */}
                            <div className="flex flex-col gap-2">
                              <button
                                onClick={() => setSelectedBusiness(business)}
                                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-3 rounded-lg font-bold text-sm hover:from-purple-700 hover:to-pink-700 transition shadow-md"
                              >
                                Ver Detalles
                              </button>
                              <div className="grid grid-cols-2 gap-2">
                                {business.WhatsApp && (
                                  <a
                                    href={`https://wa.me/${business.WhatsApp.replace(/\D/g, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-green-500 text-white px-3 py-2 rounded-lg text-xs font-semibold hover:bg-green-600 transition shadow-md flex items-center justify-center gap-1"
                                  >
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                    </svg>
                                    WhatsApp
                                  </a>
                                )}
                                {business.phone && (
                                  <a
                                    href={`tel:${business.phone.replace(/\D/g, '')}`}
                                    className="bg-blue-500 text-white px-3 py-2 rounded-lg text-xs font-semibold hover:bg-blue-600 transition shadow-md flex items-center justify-center gap-1"
                                  >
                                    📞 Llamar
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </>
        )}

        {/* Negocios Destacados del Mes */}
        {!uiFilters.category && !uiFilters.query && !uiFilters.colonia && (
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <span className="text-3xl">⭐</span>
                Negocios Destacados del Mes
              </h2>
              <span className="text-xs text-gray-500 bg-yellow-50 px-3 py-1 rounded-full border border-yellow-200">
                Premium
              </span>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {(() => {
                // Filtrar negocios destacados (excluir patrocinados - ellos tienen su propia sección)
                const featured = businesses.filter(b => {
                  // NO mostrar patrocinados aquí
                  if (b.plan === 'sponsor') return false;
                  
                  // Criterio 1: Tiene featured marcado Y plan premium
                  const isFeatured = b.featured === true || b.featured === 'true';
                  const hasPremiumPlan = b.plan === 'featured';
                  
                  // Criterio 2: Si no hay plan definido pero tiene featured, mostrar igual
                  const featuredWithoutPlan = isFeatured && !b.plan;
                  
                  // Criterio 3: Plan premium (featured) sin featured explícito
                  const isPremiumOnly = hasPremiumPlan;
                  
                  return (isFeatured && hasPremiumPlan) || featuredWithoutPlan || isPremiumOnly;
                })
                .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
                .slice(0, 3);

                // Debug: mostrar en consola
                if (typeof window !== 'undefined') {
                  console.log('Negocios destacados encontrados:', featured.length);
                  console.log('Detalles:', featured.map(b => ({ 
                    name: b.name, 
                    featured: b.featured, 
                    plan: b.plan 
                  })));
                }

                if (featured.length === 0) {
                  return (
                    <div className="col-span-full text-center py-8 bg-yellow-50 rounded-xl border-2 border-dashed border-yellow-200">
                      <p className="text-gray-600 text-sm">
                        🌟 Próximamente aquí aparecerán los negocios destacados del mes.
                      </p>
                      <p className="text-gray-500 text-xs mt-2">
                        ¿Tienes un negocio? <a href="/para-negocios" className="text-emerald-600 font-semibold underline">Conoce nuestros planes premium</a>
                      </p>
                    </div>
                  );
                }

                return featured.map((business) => (
                  <div
                    key={business.id}
                    className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-200 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105"
                  >
                    {/* Badge Destacado */}
                    <div className="absolute top-3 right-3 z-10 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
                      <span>⭐</span>
                      Destacado
                    </div>
                    
                    {/* Contenido */}
                    <div className="p-6">
                      <div className="mb-4">
                        <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-emerald-600 transition">
                          {business.name}
                        </h3>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                            📂 {business.category}
                          </span>
                          {business.rating && business.rating > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">
                              ⭐ {business.rating.toFixed(1)}
                            </span>
                          )}
                        </div>
                        {business.address && (
                          <p className="text-sm text-gray-600 line-clamp-1">
                            📍 {business.address}
                          </p>
                        )}
                      </div>

                      {/* Botones de acción */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedBusiness(business)}
                          className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 text-white px-4 py-2 rounded-lg font-semibold text-sm hover:from-emerald-600 hover:to-green-700 transition shadow-md"
                        >
                          Ver Detalles
                        </button>
                        {business.WhatsApp && (
                          <a
                            href={`https://wa.me/${business.WhatsApp.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-green-500 text-white p-2 rounded-lg hover:bg-green-600 transition shadow-md"
                            aria-label="WhatsApp"
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                            </svg>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        )}

        {/* Categorías Destacadas */}
        {!uiFilters.category && !uiFilters.query && categories.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="text-2xl">🏷️</span>
              Explora por categoría
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {categories.slice(0, 7).map((cat) => {
                const count = businesses.filter(b => b.category === cat).length;
                return (
                  <button
                    key={cat}
                    onClick={() => handleCategoryChange(cat)}
                    className="group rounded-lg bg-white border border-gray-200 p-3 text-left transition-all hover:shadow-md hover:border-emerald-300"
                  >
                    <div className="text-sm font-semibold text-gray-800 group-hover:text-emerald-600 mb-1">
                      {cat}
                    </div>
                    <div className="text-xs text-gray-500">
                      {count} {count === 1 ? 'negocio' : 'negocios'}
                    </div>
                  </button>
                );
              })}
              
              {categories.length > 7 && (
                <button
                  onClick={() => {
                    const select = document.querySelector('select[name="category"]') as HTMLSelectElement;
                    if (select) {
                      select.focus();
                      select.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                  }}
                  className="rounded-lg bg-gray-50 border border-gray-200 p-3 text-center transition-all hover:bg-gray-100 hover:border-gray-300"
                >
                  <div className="text-sm font-semibold text-gray-600">
                    +{categories.length - 7} más
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Ver todas
                  </div>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Filtros Rápidos con Chips */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <span>⚡</span>
              Filtros rápidos
            </h3>
            {(quickFilterOpen || quickFilterTopRated || quickFilterNew || quickFilterDelivery) && (
              <button
                onClick={() => {
                  setQuickFilterOpen(false);
                  setQuickFilterTopRated(false);
                  setQuickFilterNew(false);
                  setQuickFilterDelivery(false);
                }}
                className="text-xs text-gray-500 hover:text-gray-700 underline"
              >
                Limpiar filtros rápidos
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {/* Abierto Ahora */}
            <button
              onClick={() => setQuickFilterOpen(!quickFilterOpen)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                quickFilterOpen
                  ? 'bg-green-500 text-white shadow-lg scale-105'
                  : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-green-300 hover:bg-green-50'
              }`}
            >
              <span className="text-lg">⏰</span>
              Abierto ahora
              {quickFilterOpen && (
                <span className="bg-white text-green-600 rounded-full px-2 py-0.5 text-xs font-bold">
                  {(() => {
                    const now = new Date();
                    return businesses.filter(b => {
                      if (!b.hours) return false;
                      return getBusinessStatus(b.hours, now).isOpen;
                    }).length;
                  })()}
                </span>
              )}
            </button>

            {/* Mejor Valorados */}
            <button
              onClick={() => setQuickFilterTopRated(!quickFilterTopRated)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                quickFilterTopRated
                  ? 'bg-yellow-500 text-white shadow-lg scale-105'
                  : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-yellow-300 hover:bg-yellow-50'
              }`}
            >
              <span className="text-lg">⭐</span>
              Mejor valorados
              {quickFilterTopRated && (
                <span className="bg-white text-yellow-600 rounded-full px-2 py-0.5 text-xs font-bold">
                  {businesses.filter(b => (b.rating ?? 0) >= 4.5).length}
                </span>
              )}
            </button>

            {/* Delivery */}
            <button
              onClick={() => setQuickFilterDelivery(!quickFilterDelivery)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                quickFilterDelivery
                  ? 'bg-orange-500 text-white shadow-lg scale-105'
                  : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-orange-300 hover:bg-orange-50'
              }`}
            >
              <span className="text-lg">🚚</span>
              Delivery
              {quickFilterDelivery && (
                <span className="bg-white text-orange-600 rounded-full px-2 py-0.5 text-xs font-bold">
                  {businesses.filter(b => b.hasDelivery === true).length}
                </span>
              )}
            </button>

            {/* Nuevos */}
            <button
              onClick={() => setQuickFilterNew(!quickFilterNew)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                quickFilterNew
                  ? 'bg-purple-500 text-white shadow-lg scale-105'
                  : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-purple-300 hover:bg-purple-50'
              }`}
            >
              <span className="text-lg">🆕</span>
              Nuevos
              {quickFilterNew && (
                <span className="bg-white text-purple-600 rounded-full px-2 py-0.5 text-xs font-bold">
                  {businesses.filter(b => {
                    const created = (b as any).createdAt;
                    if (!created) return false;
                    const createdDate = created.toDate ? created.toDate() : new Date(created);
                    const daysDiff = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
                    return daysDiff <= 30;
                  }).length}
                </span>
              )}
            </button>
          </div>
        </div>

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

          {!showEmptyState && paginated.items.map((biz) => (
            <BusinessCard 
              key={biz.id} 
              business={biz}
              onViewDetails={(business) => setSelectedBusiness(business)}
            />
          ))}

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

      {/* Modal de detalles */}
      {selectedBusiness && (
        <BusinessModalWrapper
          businessPreview={selectedBusiness}
          onClose={() => setSelectedBusiness(null)}
        />
      )}
    </main>
  );
}
