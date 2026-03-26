/**
 * NegociosListClient - Lista principal de negocios con filtros y bÃºsqueda
 * 
 * CARD RENDERING STRATEGY (Actualizado 2026-01-24):
 * ==================================================
 * DISEÃ‘O DIFERENCIADO POR PLAN:
 * - Premium (Patrocinado/Destacado): Usa PremiumBusinessCard con portada/cover grande
 * - Gratuito: Usa BusinessCard con diseÃ±o estÃ¡ndar
 * 
 * CONSISTENCIA VISUAL:
 * - Los negocios premium SIEMPRE mantienen su diseÃ±o premium (con cover)
 * - Aplica en: secciones especiales, resultados filtrados, bÃºsqueda
 * - Sin filtros: Secciones superiores de premium legacy combinadas
 * - Con filtros: Premium mantiene PremiumBusinessCard, Free usa BusinessCard
 * 
 * VISTA COMPACTA (TOGGLE OPCIONAL):
 * - El usuario puede activar "Vista Compacta" para simplificar la vista
 * - Cuando activa: TODOS los negocios usan BusinessCard (sin covers)
 * - Por defecto: Desactivada (premium muestra diseÃ±o premium)
 * 
 * FUNCIONALIDADES:
 * - RotaciÃ³n automÃ¡tica de negocios PREMIUMs en secciÃ³n superior
 * - PaginaciÃ³n incremental para negocios gratuitos (10 por vez)
 * - Filtros: categorÃ­a, colonia, ordenamiento, bÃºsqueda, envÃ­o
 * - Vista mapa integrada con Google Maps
 * - Favoritos (localStorage + context)
 */

'use client';

import type { ChangeEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { signOut } from 'firebase/auth';
import dynamic from 'next/dynamic';

// Swiper para carrusel de PREMIUMs
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

import BusinessCard from './BusinessCard';
import BusinessCardVertical from './BusinessCardVertical';
import PremiumBusinessCard from './PremiumBusinessCard';
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
import { CATEGORY_GROUPS, resolveCategory, type CategoryGroupId } from '../lib/categoriesCatalog';

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

const CATEGORY_SHORTCUTS = CATEGORY_GROUPS.map((group) => ({
  id: group.id,
  icon: group.icon,
  label: group.name,
  shortLabel:
    group.id === 'food'
      ? 'Comida'
      : group.id === 'commerce'
        ? 'Tiendas'
        : group.id === 'services'
          ? 'Servicios'
          : group.id === 'health'
            ? 'Salud'
            : group.id === 'home'
              ? 'Hogar'
              : group.id === 'events'
                ? 'Eventos'
                : group.id === 'education'
                  ? 'Cursos'
                  : 'Otro',
}));

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
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [compactView] = useState(false); // Se mantiene por compatibilidad hasta retirar la variante compacta
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

  // Escuchar cambios en la URL para bÃºsqueda instantÃ¡nea
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

  // Sincronizar filtros rÃ¡pidos desde URL
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
      const categoryParam = next.categoryId || next.category;
      if (categoryParam) params.set('c', categoryParam);
      if (next.categoryGroupId) params.set('g', next.categoryGroupId);
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
          categoryId: partial.categoryId ?? prev.categoryId,
          categoryName: partial.categoryName ?? prev.categoryName,
          categoryGroupId: partial.categoryGroupId ?? prev.categoryGroupId,
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

  // Resetear lÃ­mite de negocios gratuitos cuando cambien filtros o bÃºsqueda
  useEffect(() => {
    setFreeBusinessesLimit(10);
  }, [uiFilters.category, uiFilters.categoryId, uiFilters.categoryGroupId, uiFilters.colonia, uiFilters.order, uiFilters.query]);

  const handleCategoryChange = useCallback(
    (eventOrValue: ChangeEvent<HTMLSelectElement> | string) => {
      const value = typeof eventOrValue === 'string' ? eventOrValue : eventOrValue.target.value;
      const resolved = resolveCategory(value);
      updateFilters(
        {
          category: resolved.categoryName,
          categoryId: resolved.categoryId,
          categoryName: resolved.categoryName,
          categoryGroupId: resolved.groupId,
        },
        { resetPage: true }
      );
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
    const normalizedCategory = uiFilters.categoryId || uiFilters.category;
    const resolvedCategoryFilter = normalizedCategory ? resolveCategory(normalizedCategory) : null;
    const normalizedQuery = uiFilters.query.trim().toLowerCase();
    const now = new Date();
    
    const filtered = businesses.filter((biz) => {
      const resolvedBizCategory = resolveCategory(
        (biz as any).categoryId || (biz as any).categoryName || biz.category
      );
      if (resolvedCategoryFilter && resolvedBizCategory.categoryId !== resolvedCategoryFilter.categoryId) return false;
      if (uiFilters.categoryGroupId && resolvedBizCategory.groupId !== uiFilters.categoryGroupId) return false;
      if (normalizedColonia && normalizeColonia(biz.colonia) !== normalizedColonia) return false;
      if (normalizedQuery) {
        const haystack = `${biz.name ?? ''} ${biz.address ?? ''} ${biz.categoryName ?? biz.category ?? ''} ${biz.description ?? ''} ${biz.phone ?? ''} ${biz.WhatsApp ?? ''} ${biz.colonia ?? ''}`.toLowerCase();
        if (!haystack.includes(normalizedQuery)) return false;
      }
      
      // Filtros rÃ¡pidos
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
    // Para patrocinados: aplicar rotacion justa (max 6 por sesion)
    const allPatrocinados = filtered.filter(b => b.plan === 'sponsor');
    const patrocinados = selectSponsoredRotation(allPatrocinados, 6);
    const destacados = filtered.filter(b => b.plan === 'featured');
    const gratis = filtered.filter(b => !b.plan || b.plan === 'free');
    
    // FunciÃ³n para ordenar cada grupo
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

  const selectedCategoryGroupLabel = useMemo(() => {
    if (!uiFilters.categoryGroupId) return '';
    return CATEGORY_GROUPS.find((group) => group.id === uiFilters.categoryGroupId)?.name || '';
  }, [uiFilters.categoryGroupId]);

  const headingDescription = useMemo(() => {
    const segments: string[] = [];
    if (uiFilters.query) segments.push(`"${uiFilters.query}"`);
    if (uiFilters.category) segments.push(uiFilters.category);
    else if (uiFilters.categoryGroupId && selectedCategoryGroupLabel) segments.push(selectedCategoryGroupLabel);
    if (uiFilters.colonia) segments.push(`en ${selectedColoniaLabel}`);
    if (!segments.length) {
      return 'Explora negocios, promociones y contactos rapidos por WhatsApp.';
    }
    return `Resultados para ${segments.join(' ')}.`;
  }, [uiFilters.category, uiFilters.categoryGroupId, uiFilters.colonia, uiFilters.query, selectedCategoryGroupLabel, selectedColoniaLabel]);

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

  const toggleQuickFilter = useCallback((filter: 'open' | 'topRated' | 'delivery' | 'new') => {
    setQuickFilterOpen((prev) => (filter === 'open' ? !prev : prev));
    setQuickFilterTopRated((prev) => (filter === 'topRated' ? !prev : prev));
    setQuickFilterDelivery((prev) => (filter === 'delivery' ? !prev : prev));
    setQuickFilterNew((prev) => (filter === 'new' ? !prev : prev));
  }, []);

  const clearQuickFilters = useCallback(() => {
    setQuickFilterOpen(false);
    setQuickFilterTopRated(false);
    setQuickFilterDelivery(false);
    setQuickFilterNew(false);
  }, []);

  const clearAllFilters = useCallback(() => {
    clearQuickFilters();
    updateFilters(
      {
        category: '',
        categoryId: '',
        categoryName: '',
        categoryGroupId: undefined,
        colonia: '',
        order: DEFAULT_ORDER,
        query: '',
      },
      { resetPage: true },
    );
  }, [clearQuickFilters, updateFilters]);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    console.info('home_render', { count: paginated.items.length, saveData: prefersDataSaver });
  }, [paginated.items.length, prefersDataSaver]);

  const showEmptyState = paginated.items.length === 0 && !isFetching;
  const hasActiveFilters =
    Boolean(uiFilters.category || uiFilters.categoryGroupId || uiFilters.colonia || uiFilters.query || uiFilters.order !== DEFAULT_ORDER) ||
    quickFilterOpen ||
    quickFilterTopRated ||
    quickFilterDelivery ||
    quickFilterNew;
  const activeFilterCount = [
    Boolean(uiFilters.category),
    Boolean(uiFilters.categoryGroupId),
    Boolean(uiFilters.colonia),
    Boolean(uiFilters.query),
    uiFilters.order !== DEFAULT_ORDER,
    quickFilterOpen,
    quickFilterTopRated,
    quickFilterDelivery,
    quickFilterNew,
  ].filter(Boolean).length;
  const quickFilterButtonClass = (active: boolean) =>
    `inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition sm:text-sm ${
      active
        ? 'bg-emerald-600 text-white shadow-sm'
        : 'border border-gray-200 bg-white text-gray-700 hover:border-emerald-300 hover:text-emerald-700'
    }`;
  const utilityControlClass =
    'h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 sm:w-auto sm:min-w-[148px]';
  const activeFilterChipClass =
    'inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800';

  return (
    <main className="min-h-screen overflow-x-clip bg-gradient-to-b from-white to-gray-50 font-sans text-gray-800">
      <section className="mx-auto max-w-6xl px-4 py-2 pb-24 sm:px-6 md:pb-10">
        {/* Breadcrumbs con Schema.org - Solo cuando hay filtros activos (evita redundancia con nav inferior) */}
        {(uiFilters.category || uiFilters.colonia) && (
          <nav aria-label="Breadcrumb" className="mb-4">
            <ol className="flex items-center gap-2 text-sm" itemScope itemType="https://schema.org/BreadcrumbList">
              <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
                <a href="/" itemProp="item" className="text-emerald-600 hover:text-emerald-700 font-medium">
                  <span itemProp="name">Inicio</span>
                </a>
                <meta itemProp="position" content="1" />
              </li>
              <li className="text-gray-400">/</li>
              <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
                <a href="/negocios" itemProp="item" className="text-emerald-600 hover:text-emerald-700 font-medium">
                  <span itemProp="name">Negocios</span>
                </a>
                <meta itemProp="position" content="2" />
              </li>
              {uiFilters.category && (
                <>
                  <li className="text-gray-400">/</li>
                  <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
                    <span className="text-gray-700 font-semibold" itemProp="name">{uiFilters.category}</span>
                    <meta itemProp="position" content="3" />
                  </li>
                </>
              )}
              {uiFilters.colonia && (
                <>
                  <li className="text-gray-400">/</li>
                  <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
                    <span className="text-gray-700 font-semibold" itemProp="name">{selectedColoniaLabel}</span>
                    <meta itemProp="position" content={uiFilters.category ? "4" : "3"} />
                  </li>
                </>
              )}
            </ol>
          </nav>
        )}

        <header className="mb-5">
          {/* H1 semÃ¡ntico fijo para SEO */}
          <div className="rounded-[24px] border border-gray-200 bg-white px-4 py-4 shadow-sm md:px-6 md:py-5">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700">Explora Yajalon</p>
                  <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-gray-900 md:text-4xl">
                    Negocios y promociones en Yajalon
                  </h1>
                  <p className="mt-1.5 max-w-2xl text-sm leading-6 text-gray-600 md:text-base">
                    {headingDescription}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    {paginated.total} resultados
                  </span>
                  {hasGeoActive ? (
                    <button
                      type="button"
                      onClick={clearGeoFilters}
                      className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
                    >
                      Cerca de ti ({radiusKm} km)
                    </button>
                  ) : null}
                </div>
              </div>
          
          {/* H2 dinÃ¡mico segÃºn filtros/bÃºsqueda */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 sm:p-4">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Refinar resultados
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        Categoria, zona y prioridad para encontrar mas rapido.
                      </p>
                    </div>
                    {hasActiveFilters ? (
                      <span className="inline-flex items-center self-start rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                        {activeFilterCount} activos
                      </span>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <button
                      type="button"
                      onClick={() => setShowCategoriesModal(true)}
                      className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                    >
                      Categorias
                    </button>

                    <label className="block">
                      <span className="sr-only">Filtrar por colonia</span>
                      <select value={uiFilters.colonia} onChange={handleColoniaChange} className={utilityControlClass}>
                        <option value="">Todas las zonas</option>
                        {colonias.map((colonia) => (
                          <option key={colonia} value={normalizeColonia(colonia)}>
                            {colonia}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="sr-only">Ordenar negocios</span>
                      <select value={uiFilters.order} onChange={handleOrderChange} className={utilityControlClass}>
                        <option value={DEFAULT_ORDER}>Relevancia</option>
                        <option value="rating">Mejor calificados</option>
                        <option value="az">A-Z</option>
                      </select>
                    </label>
                  </div>

                  <div className="-mx-3 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0">
                    <div className="flex w-max gap-3 sm:gap-4">
                      {CATEGORY_SHORTCUTS.map((shortcut) => {
                        const active = uiFilters.categoryGroupId === shortcut.id;
                        return (
                          <button
                            key={shortcut.id}
                            type="button"
                            onClick={() =>
                              updateFilters(
                                {
                                  category: '',
                                  categoryId: '',
                                  categoryName: '',
                                  categoryGroupId: active ? undefined : shortcut.id,
                                },
                                { resetPage: true },
                              )
                            }
                            className="snap-start text-center"
                            aria-pressed={active}
                          >
                            <span
                              className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full border bg-white text-2xl shadow-sm transition sm:h-16 sm:w-16 ${
                                active
                                  ? 'border-emerald-500 ring-2 ring-emerald-200'
                                  : 'border-slate-200 hover:border-emerald-300'
                              }`}
                            >
                              {shortcut.icon}
                            </span>
                            <span className={`mt-2 block text-xs font-medium leading-4 ${active ? 'text-emerald-700' : 'text-slate-600'}`}>
                              {shortcut.shortLabel}
                            </span>
                          </button>
                        );
                      })}

                      <button
                        type="button"
                        onClick={() => setShowCategoriesModal(true)}
                        className="snap-start text-center"
                      >
                        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-slate-200 bg-white text-xl shadow-sm transition hover:border-emerald-300 sm:h-16 sm:w-16">
                          +
                        </span>
                        <span className="mt-2 block text-xs font-medium leading-4 text-slate-600">
                          Ver todas
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => toggleQuickFilter('open')} className={quickFilterButtonClass(quickFilterOpen)}>
                      Abiertos ahora
                    </button>
                    <button type="button" onClick={() => toggleQuickFilter('delivery')} className={quickFilterButtonClass(quickFilterDelivery)}>
                      Con envio
                    </button>
                    <button type="button" onClick={() => toggleQuickFilter('topRated')} className={quickFilterButtonClass(quickFilterTopRated)}>
                      4.5+
                    </button>
                    <button type="button" onClick={() => toggleQuickFilter('new')} className={quickFilterButtonClass(quickFilterNew)}>
                      Nuevos
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center justify-center gap-1 rounded-xl bg-gray-100 p-1 sm:justify-start">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-all ${
                      viewMode === 'list'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                    Lista
                  </button>
                  <button
                    onClick={() => setViewMode('map')}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-all ${
                      viewMode === 'map'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                    Mapa
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {hasActiveFilters ? (
                    <button
                      type="button"
                      onClick={clearAllFilters}
                      className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50 sm:text-sm"
                    >
                      Limpiar filtros
                    </button>
                  ) : null}
                </div>
              </div>

              {hasActiveFilters ? (
                <div className="flex flex-wrap gap-2">
                  {uiFilters.query ? (
                    <button
                      type="button"
                      onClick={() => updateFilters({ query: '' }, { resetPage: true })}
                      className={activeFilterChipClass}
                    >
                      "{uiFilters.query}"
                      <span aria-hidden>x</span>
                    </button>
                  ) : null}
                  {uiFilters.category ? (
                    <button
                      type="button"
                      onClick={() =>
                        updateFilters(
                          { category: '', categoryId: '', categoryName: '', categoryGroupId: undefined },
                          { resetPage: true },
                        )
                      }
                      className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
                    >
                      {uiFilters.category}
                      <span aria-hidden>x</span>
                    </button>
                  ) : null}
                  {uiFilters.categoryGroupId && selectedCategoryGroupLabel ? (
                    <button
                      type="button"
                      onClick={() =>
                        updateFilters(
                          { category: '', categoryId: '', categoryName: '', categoryGroupId: undefined },
                          { resetPage: true },
                        )
                      }
                      className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                    >
                      {selectedCategoryGroupLabel}
                      <span aria-hidden>x</span>
                    </button>
                  ) : null}
                  {uiFilters.colonia ? (
                    <button
                      type="button"
                      onClick={() => updateFilters({ colonia: '' }, { resetPage: true })}
                      className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
                    >
                      {selectedColoniaLabel}
                      <span aria-hidden>x</span>
                    </button>
                  ) : null}
                  {uiFilters.order !== DEFAULT_ORDER ? (
                    <button
                      type="button"
                      onClick={() => updateFilters({ order: DEFAULT_ORDER }, { resetPage: true })}
                      className="inline-flex items-center gap-2 rounded-full bg-purple-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-purple-700"
                    >
                      {uiFilters.order === 'rating' ? 'Mejor calificados' : 'A-Z'}
                      <span aria-hidden>x</span>
                    </button>
                  ) : null}
                  {quickFilterOpen ? (
                    <button
                      type="button"
                      onClick={() => setQuickFilterOpen(false)}
                      className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                    >
                      Abiertos ahora
                      <span aria-hidden>x</span>
                    </button>
                  ) : null}
                  {quickFilterDelivery ? (
                    <button
                      type="button"
                      onClick={() => setQuickFilterDelivery(false)}
                      className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                    >
                      Con envio
                      <span aria-hidden>x</span>
                    </button>
                  ) : null}
                  {quickFilterTopRated ? (
                    <button
                      type="button"
                      onClick={() => setQuickFilterTopRated(false)}
                      className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                    >
                      4.5+
                      <span aria-hidden>x</span>
                    </button>
                  ) : null}
                  {quickFilterNew ? (
                    <button
                      type="button"
                      onClick={() => setQuickFilterNew(false)}
                      className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                    >
                      Nuevos
                      <span aria-hidden>x</span>
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </header>

        {/* Vitrina Premium visible */}
        {!uiFilters.category && !uiFilters.categoryGroupId && !uiFilters.query && !uiFilters.colonia && !quickFilterOpen && !quickFilterTopRated && !quickFilterDelivery && !quickFilterNew && (
          <>
            {(() => {
              const allSponsored = businesses.filter((b) => b.plan === 'sponsor');
              const rotatedSponsored = selectSponsoredRotation(allSponsored, 6);
              const premiumFeatured = businesses.filter(
                (b) =>
                  b.plan === 'featured' ||
                  b.featured === true ||
                  b.featured === 'true',
              );
              const premiumShowcase = [...rotatedSponsored, ...premiumFeatured]
                .filter((business, index, array) => array.findIndex((item) => item.id === business.id) === index)
                .slice(0, 6);

              if (premiumShowcase.length === 0) return null;
              
              return (
                <div className="mb-10 overflow-hidden">
                  <div className="mb-4 px-1 sm:px-2">
                    <h2 className="text-2xl font-bold text-gray-800">
                      Negocios premium <span className="text-lg font-semibold text-purple-600">({premiumShowcase.length})</span>
                    </h2>
                    <p className="mt-1 text-sm text-gray-500 sm:ml-11">
                      Mas presencia, mejor vitrina y contacto rapido por WhatsApp.
                    </p>
                  </div>
                  
                  <Swiper
                    modules={[Autoplay]}
                    spaceBetween={12}
                    slidesPerView={1.1}
                    autoplay={{ delay: 4000, disableOnInteraction: false }}
                    loop={premiumShowcase.length > 1}
                    breakpoints={{
                      640: { slidesPerView: premiumShowcase.length >= 2 ? 2 : 1 },
                      1024: { slidesPerView: premiumShowcase.length >= 3 ? 3 : premiumShowcase.length },
                    }}
                    className="sponsored-carousel"
                  >
                    {premiumShowcase.map((business) => (
                      <SwiperSlide key={business.id}>
                        <BusinessCard
                          business={business}
                          onViewDetails={(biz) => setSelectedBusiness(biz)}
                        />
                      </SwiperSlide>
                    ))}
                  </Swiper>
                </div>
              );
            })()}
          </>
        )}

        {/* Filtros activos - Chips para mostrar filtros seleccionados */}
        {false && (uiFilters.category || uiFilters.colonia || uiFilters.order !== DEFAULT_ORDER) && (
          <div className="mb-6 flex flex-wrap gap-2">
            {uiFilters.category && (
              <button
                onClick={() =>
                  updateFilters(
                    { category: '', categoryId: '', categoryName: '', categoryGroupId: undefined },
                    { resetPage: true },
                  )
                }
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-full text-sm font-semibold hover:bg-emerald-700 transition-all shadow-md ring-2 ring-emerald-300"
              >
                {uiFilters.category}
                <span className="text-white hover:scale-110 transition-transform">x</span>
              </button>
            )}
            {uiFilters.colonia && (
              <button
                onClick={() => updateFilters({ colonia: '' }, { resetPage: true })}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-semibold hover:bg-blue-700 transition-all shadow-md ring-2 ring-blue-300"
              >
                {selectedColoniaLabel}
                <span className="text-white hover:scale-110 transition-transform">x</span>
              </button>
            )}
            {uiFilters.order !== DEFAULT_ORDER && (
              <button
                onClick={() => updateFilters({ order: DEFAULT_ORDER }, { resetPage: true })}
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-full text-sm font-semibold hover:bg-purple-700 transition-all shadow-md ring-2 ring-purple-300"
              >
                {uiFilters.order === 'rating' ? 'Mejor calificados' : 'A-Z'}
                <span className="text-white hover:scale-110 transition-transform">x</span>
              </button>
            )}
            <button
              onClick={() =>
                updateFilters(
                  { category: '', categoryId: '', categoryName: '', categoryGroupId: undefined, colonia: '', order: DEFAULT_ORDER },
                  { resetPage: true },
                )
              }
              className="inline-flex items-center gap-1 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200 hover:text-gray-900 rounded-full transition-all border border-gray-300"
            >
              Limpiar filtros
            </button>
          </div>
        )}

        {/* Determinar si las secciones superiores (Sponsor/Featured) se estÃ¡n mostrando */}
        {(() => {
          const showTopSections = !uiFilters.category && !uiFilters.categoryGroupId && !uiFilters.query && !uiFilters.colonia && 
                                   !quickFilterOpen && !quickFilterTopRated && !quickFilterDelivery && !quickFilterNew;
          
          // Obtener los IDs de los negocios ya mostrados en la vitrina Premium superior
          const allSponsoredForTop = businesses.filter(b => b.plan === 'sponsor');
          const rotatedSponsoredForTop = selectSponsoredRotation(allSponsoredForTop, 6);
          const premiumTopIds = showTopSections
            ? [...rotatedSponsoredForTop, ...businesses.filter(b => b.plan === 'featured' || b.featured === true || b.featured === 'true')]
                .filter((business, index, array) => array.findIndex((item) => item.id === business.id) === index)
                .slice(0, 6)
                .map((business) => business.id)
            : [];
          
          // Aplicar un filtro a la lista paginada para excluir los negocios ya mostrados en las secciones superiores
          // SOLO en vista lista, en vista mapa mostrar todos
          const businessesToDisplay = paginated.items.filter(biz => {
            // Excluir negocios si su ID estÃ¡ en la lista de IDs excluidos, y solo si la secciÃ³n superior de PREMIUMs/PREMIUMs estÃ¡ activa
            // PERO: en vista mapa, mostrar todos los negocios sin excluir
            if (viewMode === 'list' && showTopSections && premiumTopIds.includes(biz.id)) {
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
                      No encontramos negocios con los filtros seleccionados. Ajusta la busqueda para ver mas opciones.
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
                            Leyenda de colores
                          </p>
                          <div className="flex flex-wrap gap-4">
                            <div className="flex items-center gap-2">
                              <div className="h-3 w-3 rounded-full bg-gradient-to-r from-amber-500 to-purple-500"></div>
                              <span className="text-sm text-gray-600">Premium</span>
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
                                            PREMIUM
                                          </span>
                                        )}
                                        {business.plan === 'featured' && (
                                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-yellow-100 text-yellow-700 ml-1">
                                            PREMIUM
                                          </span>
                                        )}
                                      </p>
                                    </div>
                                    <p className="text-xs text-gray-600 line-clamp-1 mb-1">{business.address}</p>
                                    <div className="flex items-center gap-2">
                                      {business.category && (
                                        <span className="inline-block text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                          {business.category}
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
                <div className="space-y-2">
                  {showEmptyState && (
                    <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-xl px-4 py-6 text-center">
                      No encontramos negocios con los filtros seleccionados. Ajusta la busqueda para ver mas opciones.
                    </div>
                  )}

                  {!showEmptyState && (() => {
                    // Separar solo patrocinados (usan PremiumBusinessCard) del resto (usan BusinessCard)
                    // Solo separamos para aplicar lÃ­mite de paginaciÃ³n a negocios free
                    const sponsoredBusinesses = businessesToDisplay.filter(biz => 
                      biz.plan === 'sponsor' || biz.plan === 'patrocinado'
                    );
                    const otherBusinesses = businessesToDisplay.filter(biz => 
                      biz.plan !== 'sponsor' && biz.plan !== 'patrocinado'
                    );
                    
                    // Aplicar lÃ­mite solo a negocios gratuitos (no featured)
                    const featuredBusinesses = otherBusinesses.filter(biz =>
                      biz.plan === 'featured' || biz.plan === 'destacado'
                    );
                    const freeBusinesses = otherBusinesses.filter(biz => 
                      !biz.plan || biz.plan === 'free'
                    );
                    const displayedFreeBusinesses = freeBusinesses.slice(0, freeBusinessesLimit);
                    const hasMoreFreeBusinesses = freeBusinesses.length > displayedFreeBusinesses.length;
                    
                    /**
                     * FunciÃ³n centralizada para renderizar tarjetas de negocio
                     * - Patrocinados: Usan PremiumBusinessCard (con portada/cover grande)
                     * - Destacados: Usan BusinessCardVertical (coherencia con HOME)
                     * - Gratuitos: Usan BusinessCard (diseÃ±o estÃ¡ndar)
                     * - Vista Compacta: Fuerza BusinessCard para TODOS cuando compactView = true
                     * - Consistencia: Se mantiene en todas las vistas (bÃºsqueda, filtros, normal)
                     */
                    const renderBusinessCard = (biz: BusinessPreview) => {
                      const isSponsor = biz.plan === 'sponsor' || biz.plan === 'patrocinado';
                      const isFeatured = biz.plan === 'featured' || biz.plan === 'destacado';
                      
                      // Si Vista Compacta estÃ¡ activada, usar BusinessCard para todos
                      if (compactView) {
                        return (
                          <div key={biz.id}>
                            <BusinessCard 
                              business={biz}
                              onViewDetails={(business) => setSelectedBusiness(business)}
                            />
                          </div>
                        );
                      }
                      
                      // PREMIUMs usan PremiumBusinessCard (con portada)
                      if (isSponsor) {
                        return (
                          <div key={biz.id}>
                            <PremiumBusinessCard 
                              business={biz}
                              onViewDetails={(business) => setSelectedBusiness(business)}
                            />
                          </div>
                        );
                      }
                      
                      // PREMIUMs usan BusinessCardVertical (coherencia con HOME)
                      if (isFeatured) {
                        return (
                          <div key={biz.id}>
                            <BusinessCardVertical 
                              business={biz}
                              onViewDetails={(business) => setSelectedBusiness(business)}
                            />
                          </div>
                        );
                      }
                      
                      // Gratuitos usan BusinessCard estÃ¡ndar
                      return (
                        <div key={biz.id}>
                          <BusinessCard 
                            business={biz}
                            onViewDetails={(business) => setSelectedBusiness(business)}
                          />
                        </div>
                      );
                    };
                    
                    return (
                      <>
                        {/* Renderizar negocios PREMIUMs (sin lÃ­mite) - Usa PremiumBusinessCard con portada */}
                        {sponsoredBusinesses.map(renderBusinessCard)}
                        
                        {/* Renderizar negocios PREMIUMs (sin lÃ­mite) - Usa BusinessCard con badge */}
                        {featuredBusinesses.map(renderBusinessCard)}
                        
                        {/* Renderizar negocios gratuitos (con lÃ­mite) - Usa BusinessCard */}
                        {displayedFreeBusinesses.map(renderBusinessCard)}
                        
                        {/* BotÃ³n "Cargar mÃ¡s" para negocios gratuitos */}
                        {hasMoreFreeBusinesses && (
                          <div className="flex flex-col items-center gap-3 mt-6 p-6 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border-2 border-emerald-200">
                            <div className="text-center">
                              <p className="text-sm font-semibold text-gray-700 mb-1">
                                Mostrando {displayedFreeBusinesses.length} de {freeBusinesses.length} negocios
                              </p>
                              <p className="text-xs text-gray-600">
                                {freeBusinesses.length - displayedFreeBusinesses.length} negocios mas disponibles
                              </p>
                            </div>
                            <button
                              onClick={() => setFreeBusinessesLimit(prev => prev + 10)}
                              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-all shadow-md hover:shadow-lg hover:scale-105 active:scale-95"
                            >
                              <span>Cargar 10 mas</span>
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <div className="mt-4 flex flex-col items-center gap-2">
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

      {/* Modal de categorÃ­as */}
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
                <h2 className="text-2xl font-bold text-white">Todas las categorias</h2>
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
                  const resolved = resolveCategory(cat);
                  const count = businesses.filter(b => {
                    const resolvedBiz = resolveCategory((b as any).categoryId || (b as any).categoryName || b.category);
                    return resolvedBiz.categoryId === resolved.categoryId;
                  }).length;
                  const isSelected = uiFilters.categoryId
                    ? uiFilters.categoryId === resolved.categoryId
                    : uiFilters.category === resolved.categoryName;
                  
                  return (
                    <button
                      key={cat}
                      onClick={() => {
                        updateFilters(
                          {
                            category: resolved.categoryName,
                            categoryId: resolved.categoryId,
                            categoryName: resolved.categoryName,
                            categoryGroupId: resolved.groupId,
                          },
                          { resetPage: true },
                        );
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

              {/* BotÃ³n para limpiar filtro de categorÃ­a */}
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
                    Limpiar categoria
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

