/**
 * NegociosListClient - Lista principal de negocios con filtros y búsqueda
 * 
 * CARD RENDERING UNIFICATION (Refactor 2026-01-24):
 * ===================================================
 * - Se eliminó FreeBusinessCardCompact para unificar el diseño de tarjetas
 * - Ahora TODOS los planes (sponsor/featured/free) usan BusinessCard
 * - BusinessCard maneja internamente los estilos diferenciados por tier
 * - La función renderBusinessCard() centraliza la decisión de renderizado
 * - Comportamiento consistente en búsqueda, filtros y vista normal
 * - Se mantiene toda la lógica existente: rotación, paginación, filtros, mapa
 * 
 * ANTES: Móviles usaban FreeBusinessCardCompact para free, BusinessCard para premium
 * AHORA: Todos usan BusinessCard siempre, con estilos internos según plan
 */

'use client';

import type { ChangeEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import dynamic from 'next/dynamic';

import BusinessCard from './BusinessCard';
// REMOVED: FreeBusinessCardCompact - Ya no se usa, unificamos a BusinessCard para todos los planes
// import FreeBusinessCardCompact from './FreeBusinessCardCompact';
import BusinessesMapView from './BusinessesMapView';
import { auth, signInWithGoogle } from '../firebaseConfig';
import { useCurrentUser } from '../hooks/useAuth';
import { trackPageView } from '../lib/telemetry';
import { sliceBusinesses } from '../lib/pagination';
import type { Business, BusinessPreview } from '../types/business';
import { normalizeColonia } from '../lib/helpers/colonias';
import { DEFAULT_FILTER_STATE, DEFAULT_ORDER, PAGE_SIZE, type Filters, type SortMode } from '../lib/negociosFilters';
import { getBusinessStatus } from './BusinessHours';
import { useFavorites } from '../context/FavoritesContext';
import { selectSponsoredRotation } from '../lib/sponsoredRotation';

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
  const router = useRouter();
  const geoQueryRef = useRef(geoQuery);
  const lastUrlQueryRef = useRef(initialFilters.query || '');
  const user = useCurrentUser();
  const { favorites, addFavorite, removeFavorite } = useFavorites();
  const [prefersDataSaver, setPrefersDataSaver] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [quickFilterOpen, setQuickFilterOpen] = useState(false);
  const [quickFilterTopRated, setQuickFilterTopRated] = useState(false);
  const [quickFilterNew, setQuickFilterNew] = useState(false);
  const [quickFilterDelivery, setQuickFilterDelivery] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessPreview | Business | null>(null);
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);
  const [showCategoriesSection, setShowCategoriesSection] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [freeBusinessesLimit, setFreeBusinessesLimit] = useState(10);
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

  // Sincronizar filtros rápidos desde URL
  useEffect(() => {
    const quickFilter = searchParams?.get('quickFilter');
    setQuickFilterOpen(quickFilter === 'open');
    setQuickFilterTopRated(quickFilter === 'topRated');
    setQuickFilterDelivery(quickFilter === 'delivery');
    setQuickFilterNew(quickFilter === 'new');
  }, [searchParams]);

  // Sincronizar modo de vista desde URL
  useEffect(() => {
    const viewParam = searchParams?.get('view');
    if (viewParam === 'map') {
      setViewMode('map');
    } else if (viewParam === 'list') {
      setViewMode('list');
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

  // Resetear límite de negocios gratuitos cuando cambien filtros o búsqueda
  useEffect(() => {
    setFreeBusinessesLimit(10);
  }, [uiFilters.category, uiFilters.colonia, uiFilters.order, uiFilters.query]);

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
      if (quickFilterDelivery && biz.hasEnvio !== true) return false;
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
    
    // Separar por planes ANTES de ordenar
    // Para patrocinados: aplicar rotación justa (máx 6 por sesión)
    const allPatrocinados = filtered.filter(b => b.plan === 'sponsor');
    const patrocinados = selectSponsoredRotation(allPatrocinados, 6);
    const destacados = filtered.filter(b => b.plan === 'featured');
    const gratis = filtered.filter(b => !b.plan || b.plan === 'free');
    
    // Función para ordenar cada grupo
    const sortGroup = (group: BusinessPreview[]) => {
      const sorted = [...group];
      if (uiFilters.order === 'az') {
        sorted.sort((a, b) => a.name.localeCompare(b.name, 'es'));
      } else if (uiFilters.order === 'rating') {
        sorted.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
      } else {
        sorted.sort((a, b) => {
          const aOpen = a.hours ? getBusinessStatus(a.hours, now).isOpen : false;
          const bOpen = b.hours ? getBusinessStatus(b.hours, now).isOpen : false;
          if (aOpen !== bOpen) {
            return aOpen ? -1 : 1;
          }
          return (b.rating ?? 0) - (a.rating ?? 0);
        });
      }
      return sorted;
    };
    
    const sortedPatrocinados = sortGroup(patrocinados);
    const sortedDestacados = sortGroup(destacados);
    const sortedGratis = sortGroup(gratis);
    
    // Combinar en orden: patrocinados -> destacados -> gratis
    const allSorted = [...sortedPatrocinados, ...sortedDestacados, ...sortedGratis];
    
    const pageCount = Math.max(1, uiFilters.page);
    const currentSlice = sliceBusinesses(allSorted, pageCount, PAGE_SIZE);
    const previousEnd = (pageCount - 1) * PAGE_SIZE;
    const accumulated = pageCount > 1 ? allSorted.slice(0, previousEnd).concat(currentSlice) : currentSlice;
    
    return {
      items: accumulated,
      patrocinados: accumulated.filter(b => b.plan === 'sponsor'),
      destacados: accumulated.filter(b => b.plan === 'featured'),
      gratis: accumulated.filter(b => !b.plan || b.plan === 'free'),
      total: allSorted.length,
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
        </header>

        {/* Banner de Negocios Patrocinados - Máxima visibilidad */}
        {!uiFilters.category && !uiFilters.query && !uiFilters.colonia && (
          <>
            {(() => {
              // Aplicar rotación justa: máx 6 patrocinados por sesión, mostrar 3 en banner
              const allSponsored = businesses.filter(b => b.plan === 'sponsor');
              const rotatedSponsored = selectSponsoredRotation(allSponsored, 6);
              const sponsored = rotatedSponsored.slice(0, 3);
              
              if (sponsored.length === 0) return null;
              
              return (
                <div className="mb-8">
                  <div className="mb-4">
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                      <span className="text-3xl">👑</span>
                      Negocios Patrocinados
                      <span className="text-lg font-semibold text-purple-600">({allSponsored.length})</span>
                    </h2>
                    <p className="text-sm text-gray-500 mt-1 ml-11">
                      Los patrocinados aparecen primero y se rotan para dar visibilidad a todos.
                    </p>
                  </div>
                  
                  {/* Carrusel horizontal en móvil, grid en desktop */}
                  <div className="
                    flex md:grid
                    overflow-x-auto md:overflow-visible
                    snap-x snap-mandatory md:snap-none
                    gap-4 md:gap-6
                    px-4 -mx-4 md:px-0 md:mx-0
                    pb-4 md:pb-0
                    md:grid-cols-2 lg:grid-cols-3
                    scrollbar-hide
                  ">
                    {sponsored.map((business) => (
                      <div
                        key={business.id}
                        className="
                          group relative overflow-hidden rounded-2xl 
                          bg-gradient-to-br from-purple-600 via-pink-500 to-red-500 
                          p-1 shadow-2xl hover:shadow-purple-500/50 transition-all duration-300
                          w-[85%] md:w-auto
                          flex-shrink-0 md:flex-shrink
                          snap-center md:snap-align-none
                        "
                      >
                        <div className="bg-white rounded-[14px] p-5 h-full">
                          {/* Badge Patrocinado */}
                          <div className="absolute top-3 right-3 z-10 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
                            <span>👑</span>
                            PATROCINADO
                          </div>
                          
                          <div className="flex flex-col h-full">
                            {/* NUEVO: Contenedor Visual de Carrusel/Video - JUSTIFICACIÓN DEL PRECIO MÁS ALTO */}
                            <div className="mb-4 h-40 w-full overflow-hidden rounded-lg bg-gray-100 border border-gray-200 shadow-xl">
                              <img 
                                src={
                                  business.coverUrl ||
                                  business.image1 ||
                                  '/images/default-premium-cover.svg'
                                }
                                alt={`Imagen principal de ${business.name}`}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              />
                            </div>

                            {/* Header con Logo, Nombre y Botón de Favoritos (más compactos) */}
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <img 
                                  src={
                                    business.logoUrl ||
                                    business.image1 ||
                                    '/images/default-premium-logo.svg'
                                  }
                                  alt={`Logo de ${business.name}`}
                                  className="w-10 h-10 rounded-full object-cover border-2 border-gray-200 flex-shrink-0"
                                />
                                <h3 className="text-xl font-bold text-gray-900 pr-2 group-hover:text-purple-600 transition truncate">
                                  {business.name}
                                </h3>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const isFav = favorites.includes(business.id);
                                  if (isFav) removeFavorite(business.id);
                                  else addFavorite(business.id);
                                }}
                                aria-label={favorites.includes(business.id) ? "Quitar de favoritos" : "Agregar a favoritos"}
                                className={`text-2xl transition-colors flex-shrink-0 ${ 
                                  favorites.includes(business.id) ? 'text-red-500' : 'text-red-400 hover:text-red-500'
                                }`}
                              >
                                {favorites.includes(business.id) ? '♥' : '♡'}
                              </button>
                            </div>

                            <div className="mb-4 flex-grow">
                              {/* Tags: Categoria, Rating, Delivery */}
                              <div className="flex flex-wrap gap-2 mb-3">
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded-full">
                                  📂 {business.category}
                                </span>
                                {business.rating && business.rating > 0 && (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">
                                    ⭐ {business.rating.toFixed(1)}
                                  </span>
                                )}
                                {business.hasEnvio && (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-800 text-xs font-semibold rounded-full">
                                    🚚 Envío
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
                              <div className="grid grid-cols-3 gap-2">
                                {business.WhatsApp && (
                                  <a
                                    href={`https://wa.me/${business.WhatsApp.replace(/\D/g, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="border-2 border-green-500 text-green-600 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-green-50 transition bg-transparent flex items-center justify-center gap-1"
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
                                    className="border-2 border-blue-500 text-blue-600 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-blue-50 transition bg-transparent flex items-center justify-center gap-1"
                                  >
                                    📞 Llamar
                                  </a>
                                )}
                                {(business.location?.lat && business.location?.lng) && (
                                  <a
                                    href={`https://www.google.com/maps/dir/?api=1&destination=${business.location.lat},${business.location.lng}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="border-2 border-orange-500 text-orange-600 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-orange-50 transition bg-transparent flex items-center justify-center gap-1"
                                  >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    Como llegar
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
                <span className="text-lg font-semibold text-yellow-600">({(() => {
                  return businesses.filter(b => {
                    if (b.plan === 'sponsor') return false;
                    const isFeatured = b.featured === true || b.featured === 'true';
                    const hasPremiumPlan = b.plan === 'featured';
                    const featuredWithoutPlan = isFeatured && !b.plan;
                    const isPremiumOnly = hasPremiumPlan;
                    return (isFeatured && hasPremiumPlan) || featuredWithoutPlan || isPremiumOnly;
                  }).length;
                })()})</span>
              </h2>
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
                    </div>
                  );
                }

                return featured.map((business) => {
                  // Calcular estado del negocio (Abierto/Cerrado)
                  const now = new Date();
                  const status = business.hours ? getBusinessStatus(business.hours, now) : { isOpen: false, opensAt: undefined, closesAt: undefined, todayLabel: 'Horario no disp.' };
                  const isOpen = status.isOpen;
                  const isPremium = business.plan && business.plan !== 'free';
                  
                  // Formatear label de horario
                  let hoursLabel = "Horario disponible";
                  if (status.isOpen && status.closesAt) hoursLabel = `Cierra ${status.closesAt}`;
                  else if (!status.isOpen && status.opensAt) hoursLabel = `Abre ${status.opensAt}`;
                  else if (status.todayLabel) hoursLabel = status.todayLabel;
                  
                  return (
                    <div
                      key={business.id}
                      className="group relative overflow-hidden rounded-2xl bg-white border-2 border-blue-100 shadow-lg hover:shadow-blue-200/50 transition-all duration-300 hover:-translate-y-1"
                    >
                      {/* Badge Destacado (Esquina superior) */}
                      <div className="absolute top-0 right-0 z-10 bg-gradient-to-bl from-blue-500 to-cyan-500 text-white px-3 py-1.5 rounded-bl-xl text-[10px] font-bold tracking-wider uppercase shadow-sm">
                        ✨ DESTACADO
                      </div>

                      <div className="p-5 pt-8 flex flex-col h-full">
                        {/* HEADER: Logo, Título y Favorito */}
                        <div className="flex items-start gap-3 mb-3">
                          <img 
                            src={
                              business.logoUrl ||
                              business.image1 ||
                              (isPremium
                                ? '/images/default-premium-logo.svg'
                                : 'data:image/svg+xml,%3Csvg xmlns=\"http://www.w3.org/2000/svg\" width=\"56\" height=\"56\"%3E%3Crect fill=\"%23f0f0f0\" width=\"56\" height=\"56\"/%3E%3Ctext x=\"50%25\" y=\"50%25\" dominant-baseline=\"middle\" text-anchor=\"middle\" font-family=\"sans-serif\" font-size=\"12\" fill=\"%23999\"%3ELogo%3C/text%3E%3C/svg%3E')
                            }
                            alt={`Logo ${business.name}`}
                            className="w-14 h-14 rounded-lg object-cover border border-gray-100 shadow-sm flex-shrink-0 bg-gray-50"
                          />
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-bold text-gray-900 leading-snug group-hover:text-blue-600 transition line-clamp-2 mb-1">
                              {business.name}
                            </h3>
                            
                            {/* Rating Simplificado y Limpio (Solo Estrella + Número) */}
                            <div className="flex items-center gap-1.5 mt-1">
                              {business.rating && business.rating > 0 && (
                                <div className="flex items-center bg-yellow-50 px-2 py-0.5 rounded-md border border-yellow-100">
                                  <span className="text-yellow-500 text-xs mr-1">★</span>
                                  <span className="font-bold text-gray-800 text-xs leading-none pt-0.5">
                                    {business.rating.toFixed(1)}
                                  </span>
                                </div>
                              )}
                              {/* Si no tiene rating, no mostramos nada para mantenerlo limpio */}
                            </div>
                          </div>
                          
                          {/* Botón Favorito */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const isFav = favorites.includes(business.id);
                              if (isFav) removeFavorite(business.id);
                              else addFavorite(business.id);
                            }}
                            aria-label={favorites.includes(business.id) ? "Quitar de favoritos" : "Agregar a favoritos"}
                            className={`text-2xl transition-colors flex-shrink-0 -mt-1 ${
                              favorites.includes(business.id) ? 'text-red-500' : 'text-gray-300 hover:text-red-500'
                            }`}
                          >
                            {favorites.includes(business.id) ? '♥' : '♡'}
                          </button>
                        </div>

                        {/* INFO: Tags, Estado y Ubicación */}
                        <div className="mb-4 flex-grow space-y-2">
                          {/* Fila 1: Categoría y Estado (Abierto/Cerrado) */}
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 font-medium">
                              📂 {business.category}
                            </span>
                            
                            {/* Estado Abierto/Cerrado (Dinámico) */}
                            <span className={`px-2 py-0.5 rounded-md font-bold ${
                              isOpen ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {isOpen ? 'Abierto' : 'Cerrado'}
                            </span>

                            {/* Delivery Tag */}
                            {business.hasEnvio && (
                              <span className="px-2 py-0.5 rounded-md bg-orange-50 text-orange-700 font-medium flex items-center gap-1">
                                🚚 <span className="hidden sm:inline">Envío</span>
                              </span>
                            )}
                          </div>

                          {/* Fila 2: Ubicación y Horario texto */}
                          <div className="space-y-0.5">
                            {business.colonia && (
                              <p className="text-xs text-gray-500 flex items-center gap-1">
                                <span className="text-gray-400">📍</span> {business.colonia}
                              </p>
                            )}
                            <p className="text-xs text-gray-400 pl-4">
                              {hoursLabel}
                            </p>
                          </div>
                        </div>

                        {/* FOOTER: Botones de Acción (Estilo BusinessCard) */}
                        <div className="flex flex-col gap-2 mt-auto">
                          <button
                            onClick={() => setSelectedBusiness(business)}
                            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition shadow-md shadow-blue-200"
                          >
                            Ver Detalles
                          </button>
                          
                          {/* Botones secundarios */}
                          <div className="grid grid-cols-3 gap-2">
                            {business.WhatsApp && (
                              <a
                                href={`https://wa.me/${business.WhatsApp.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-1 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs font-bold hover:bg-green-100 transition"
                              >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                    </svg> WhatsApp
                              </a>
                            )}
                            {business.phone && (
                              <a
                                href={`tel:${business.phone.replace(/\D/g, '')}`}
                                className="flex items-center justify-center gap-1 py-1.5 bg-gray-50 text-gray-700 border border-gray-200 rounded-lg text-xs font-bold hover:bg-gray-100 transition"
                              >
                                <span>📞</span> Llamar
                              </a>
                            )}
                            {(business.location?.lat && business.location?.lng) && (
                              <a
                                href={`https://www.google.com/maps/dir/?api=1&destination=${business.location.lat},${business.location.lng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-1 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-xs font-bold hover:bg-amber-100 transition"
                              >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                Como llegar
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}

        {/* Categorías Destacadas */}
        {!uiFilters.category && !uiFilters.query && categories.length > 0 && (
          <div className="mb-8" suppressHydrationWarning>
            <button
              onClick={() => setShowCategoriesSection(!showCategoriesSection)}
              className="w-full text-left text-xl font-bold text-gray-800 mb-4 flex items-center justify-between gap-2 hover:text-emerald-600 transition-colors group"
            >
              <div className="flex items-center gap-2">
                <span className="text-2xl">🏷️</span>
                <span>Explora por categoría</span>
              </div>
              <svg 
                className={`w-6 h-6 transition-transform duration-300 ${showCategoriesSection ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {showCategoriesSection && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 animate-in fade-in slide-in-from-top-2 duration-300" suppressHydrationWarning>
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
                    onClick={() => setShowCategoriesModal(true)}
                    className="rounded-lg bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 p-3 text-center transition-all hover:shadow-md hover:border-emerald-400 hover:scale-105"
                  >
                    <div className="text-sm font-semibold text-emerald-700">
                      +{categories.length - 7} más
                    </div>
                    <div className="text-xs text-emerald-600 mt-1">
                      Ver todas
                    </div>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        
        {/* Toggle Vista Lista / Mapa */}
        <div className="mb-6 flex items-center justify-center gap-1 bg-gray-100 p-1 rounded-lg w-fit mx-auto">
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-all ${
              viewMode === 'list'
                ? 'bg-white text-gray-900 shadow-md'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            Vista Lista
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-all ${
              viewMode === 'map'
                ? 'bg-white text-gray-900 shadow-md'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            Vista Mapa
          </button>
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

        {/* Determinar si las secciones superiores (Sponsor/Featured) se están mostrando */}
        {(() => {
          const showTopSections = !uiFilters.category && !uiFilters.query && !uiFilters.colonia;
          
          // Obtener los IDs de los negocios ya mostrados en las secciones Patrocinado y Destacado
          // Sponsor: aplicar misma rotación justa que en banner (consistencia)
          const allSponsoredForTop = businesses.filter(b => b.plan === 'sponsor');
          const rotatedSponsoredForTop = selectSponsoredRotation(allSponsoredForTop, 6);
          const sponsoredTopIds = showTopSections 
            ? rotatedSponsoredForTop.slice(0, 3).map(b => b.id)
            : [];
          
          // Featured top 3: (Excluyendo patrocinados que ya están arriba)
          const featuredTopIds = showTopSections 
            ? businesses.filter(b => b.plan !== 'sponsor' && (b.featured === true || b.featured === 'true' || b.plan === 'featured'))
              .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
              .slice(0, 3)
              .map(b => b.id)
            : [];
          
          // Combinar los IDs a excluir de la lista principal
          const excludedTopIds = [...sponsoredTopIds, ...featuredTopIds];
          
          // Aplicar un filtro a la lista paginada para excluir los negocios ya mostrados en las secciones superiores
          // SOLO en vista lista, en vista mapa mostrar todos
          const businessesToDisplay = paginated.items.filter(biz => {
            // Excluir negocios si su ID está en la lista de IDs excluidos, y solo si la sección superior de patrocinados/destacados está activa
            // PERO: en vista mapa, mostrar todos los negocios sin excluir
            if (viewMode === 'list' && showTopSections && excludedTopIds.includes(biz.id)) {
              return false;
            }
            return true;
          });

          return (
            <div id="all-categories">
              {/* Vista de Mapa */}
              {viewMode === 'map' && (
                <div className="mb-6">
                  {showEmptyState ? (
                    <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-xl px-4 py-6 text-center">
                      No encontramos negocios con los filtros seleccionados. Ajusta la búsqueda para ver más opciones.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Columna izquierda: Mapa */}
                      <div className="lg:col-span-2">
                        <div className="rounded-2xl overflow-hidden shadow-xl border-2 border-gray-200 mb-4">
                          <BusinessesMapView
                            businesses={businessesToDisplay as Business[]}
                            className="h-[600px] w-full"
                            onBusinessClick={(business) => setSelectedBusiness(business)}
                          />
                        </div>
                        
                        {/* Leyenda debajo del mapa */}
                        <div className="bg-white rounded-lg shadow-md px-4 py-3 border border-gray-200">
                          <p className="font-bold text-gray-700 mb-2 text-sm flex items-center gap-2">
                            <span>📌</span>
                            Leyenda de colores
                          </p>
                          <div className="flex flex-wrap gap-4">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                              <span className="text-sm text-gray-600">Patrocinado</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                              <span className="text-sm text-gray-600">Destacado</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-red-500"></div>
                              <span className="text-sm text-gray-600">Regular</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Columna derecha: Lista de negocios */}
                      <div className="lg:col-span-1">
                        <div className="bg-white rounded-xl shadow-md border border-gray-200 sticky top-4">
                          <div className="p-4 border-b border-gray-200">
                            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                              <svg className="w-5 h-5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                              </svg>
                              <span>{businessesToDisplay.length} {businessesToDisplay.length === 1 ? 'negocio' : 'negocios'}</span>
                            </h3>
                            <p className="text-xs text-gray-500 mt-1">Haz click para ubicar en el mapa</p>
                          </div>
                          
                          <div className="p-3 space-y-2 max-h-[520px] overflow-y-auto">
                            {businessesToDisplay.map((business) => (
                              <button
                                key={business.id}
                                onClick={() => setSelectedBusiness(business)}
                                className="w-full text-left p-3 rounded-lg hover:bg-emerald-50 transition-colors border border-gray-100 hover:border-emerald-300 hover:shadow-sm group"
                              >
                                <div className="flex items-start gap-3">
                                  {business.logoUrl && (
                                    <img
                                      src={business.logoUrl}
                                      alt={business.name}
                                      className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-gray-200"
                                    />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2 mb-1">
                                      <p className="text-sm font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">
                                        <span className="line-clamp-1">{business.name}</span>
                                        {business.plan === 'sponsor' && (
                                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-700 ml-1">
                                            👑 PATROCINADO
                                          </span>
                                        )}
                                        {business.plan === 'featured' && (
                                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-yellow-100 text-yellow-700 ml-1">
                                            🔥 DESTACADO
                                          </span>
                                        )}
                                      </p>
                                    </div>
                                    <p className="text-xs text-gray-600 line-clamp-1 mb-1">{business.address}</p>
                                    <div className="flex items-center gap-2">
                                      {business.category && (
                                        <span className="inline-block text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                          📂 {business.category}
                                        </span>
                                      )}
                                      {business.rating && (
                                        <div className="flex items-center gap-1">
                                          <span className="text-yellow-500 text-xs">★</span>
                                          <span className="text-xs font-semibold text-gray-700">{business.rating.toFixed(1)}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Vista de Lista */}
              {viewMode === 'list' && (
                <div className="space-y-6">
                  {showEmptyState && (
                    <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-xl px-4 py-6 text-center">
                      No encontramos negocios con los filtros seleccionados. Ajusta la busqueda para ver mas opciones.
                    </div>
                  )}

                  {!showEmptyState && (() => {
                    // UNIFIED CARD RENDERING: Ya no separamos premium de free para usar cards diferentes
                    // Todos los planes ahora usan BusinessCard de forma consistente
                    // Solo separamos para aplicar límite de paginación a negocios free
                    const premiumBusinesses = businessesToDisplay.filter(biz => 
                      biz.plan === 'sponsor' || biz.plan === 'patrocinado' || biz.plan === 'featured' || biz.plan === 'destacado'
                    );
                    const freeBusinesses = businessesToDisplay.filter(biz => 
                      !biz.plan || biz.plan === 'free'
                    );
                    
                    // Aplicar límite solo a negocios gratuitos
                    const displayedFreeBusinesses = freeBusinesses.slice(0, freeBusinessesLimit);
                    const hasMoreFreeBusinesses = freeBusinesses.length > displayedFreeBusinesses.length;
                    
                    /**
                     * Función centralizada para renderizar tarjetas de negocio
                     * - Usa SIEMPRE BusinessCard independientemente del plan (sponsor/featured/free)
                     * - Mantiene consistencia visual en todas las vistas (búsqueda, filtros, normal)
                     * - Elimina la lógica anterior que usaba FreeBusinessCardCompact en móvil
                     */
                    const renderBusinessCard = (biz: BusinessPreview) => (
                      <div key={biz.id}>
                        <BusinessCard 
                          business={biz}
                          onViewDetails={(business) => setSelectedBusiness(business)}
                        />
                      </div>
                    );
                    
                    return (
                      <>
                        {/* Renderizar negocios premium (sin límite) - Usa BusinessCard unificada */}
                        {premiumBusinesses.map(renderBusinessCard)}
                        
                        {/* Renderizar negocios gratuitos (con límite) - Usa BusinessCard unificada */}
                        {displayedFreeBusinesses.map(renderBusinessCard)}
                        
                        {/* Botón "Cargar más" para negocios gratuitos */}
                        {hasMoreFreeBusinesses && (
                          <div className="flex justify-center mt-6">
                            <button
                              onClick={() => setFreeBusinessesLimit(prev => prev + 10)}
                              className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-[#38761D] text-white text-sm font-semibold hover:bg-[#2f5a1a] transition shadow-md hover:shadow-lg"
                            >
                              Cargar más negocios
                              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </>
                    );
                  })()}

                  {isFetching && businessesToDisplay.length === 0 && <SkeletonList count={3} />}
                  {isFetching && businessesToDisplay.length > 0 && <SkeletonList count={1} />}
                </div>
              )}
            </div>
          );
        })()}

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

      {/* Modal de categorías */}
      {showCategoriesModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowCategoriesModal(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🏷️</span>
                <h2 className="text-2xl font-bold text-white">Todas las Categorías</h2>
              </div>
              <button
                onClick={() => setShowCategoriesModal(false)}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-all"
                aria-label="Cerrar"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(85vh-80px)]">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.sort((a, b) => a.localeCompare(b, 'es')).map((cat) => {
                  const count = businesses.filter(b => b.category === cat).length;
                  const isSelected = uiFilters.category === cat;
                  
                  return (
                    <button
                      key={cat}
                      onClick={() => {
                        handleCategoryChange(cat);
                        setShowCategoriesModal(false);
                      }}
                      className={`group rounded-xl p-4 text-left transition-all hover:shadow-lg ${
                        isSelected 
                          ? 'bg-gradient-to-br from-emerald-500 to-teal-500 border-2 border-emerald-600 shadow-md' 
                          : 'bg-white border-2 border-gray-200 hover:border-emerald-300'
                      }`}
                    >
                      <div className={`text-base font-bold mb-2 ${
                        isSelected ? 'text-white' : 'text-gray-800 group-hover:text-emerald-600'
                      }`}>
                        {cat}
                      </div>
                      <div className={`text-sm flex items-center gap-2 ${
                        isSelected ? 'text-emerald-50' : 'text-gray-600'
                      }`}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <span className="font-semibold">{count}</span>
                        <span>{count === 1 ? 'negocio' : 'negocios'}</span>
                      </div>
                      {isSelected && (
                        <div className="mt-2 flex items-center gap-1 text-white text-xs font-semibold">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Seleccionada
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Botón para limpiar filtro de categoría */}
              {uiFilters.category && (
                <div className="mt-6 pt-6 border-t border-gray-200 flex justify-center">
                  <button
                    onClick={() => {
                      handleCategoryChange('');
                      setShowCategoriesModal(false);
                    }}
                    className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Limpiar categoría
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
