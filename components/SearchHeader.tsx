'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { BsFilter, BsSearch, BsGeoAlt, BsClock, BsFire, BsX } from 'react-icons/bs';
import GeolocationButton from './GeolocationButton';
import { useFavorites } from '../context/FavoritesContext';
import { useDebounce } from '../hooks/useDebounce';
import type { SortMode } from '../lib/negociosFilters';
import { useSearchSuggestions, useRecentSearches, usePopularSearches } from '../hooks/useSearchSuggestions';
import type { SearchSuggestion } from '../hooks/useSearchSuggestions';

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
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);
  
  // Debounce del término de búsqueda para búsqueda instantánea
  const debouncedTerm = useDebounce(term, 500);
  
  // Hooks para sugerencias
  const { suggestions, isLoading } = useSearchSuggestions(term, categories);
  const { recentSearches, addRecentSearch, clearRecentSearches } = useRecentSearches();
  const { popularSearches, incrementSearch } = usePopularSearches();
  
  // Combinar todas las sugerencias
  const allSuggestions = useMemo(() => {
    const results: SearchSuggestion[] = [];
    
    // Si no hay término de búsqueda, mostrar recientes y populares
    if (term.trim().length < 2) {
      if (recentSearches.length > 0) {
        results.push(...recentSearches.slice(0, 3).map(s => ({
          type: 'recent' as const,
          name: s,
        })));
      }
      if (popularSearches.length > 0) {
        results.push(...popularSearches.slice(0, 3).map(s => ({
          type: 'popular' as const,
          name: s.term,
        })));
      }
    } else {
      // Si hay búsqueda, mostrar sugerencias relevantes
      results.push(...suggestions);
    }
    
    return results;
  }, [term, suggestions, recentSearches, popularSearches]);

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

  // Búsqueda instantánea con debounce
  useEffect(() => {
    // Solo ejecutar si el término ha cambiado y no estamos en la carga inicial
    if (debouncedTerm !== initialQuery && term.length >= 0) {
      setIsSearching(true);
      const searchTerm = debouncedTerm.trim();
      
      // Actualizar URL con el término de búsqueda
      const nextParams = new URLSearchParams(params?.toString() ?? '');
      if (searchTerm) {
        nextParams.set('q', searchTerm);
        // Guardar en historial si hay término
        if (searchTerm.length >= 2) {
          addRecentSearch(searchTerm);
          incrementSearch(searchTerm);
        }
      } else {
        nextParams.delete('q');
      }
      
      const qs = nextParams.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      
      // Pequeño delay para mostrar indicador de búsqueda
      setTimeout(() => setIsSearching(false), 300);
    }
  }, [debouncedTerm]);

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
        setShowAutocomplete(false);
      } else {
        setIsVisible(true);
      }
      lastScrollRef.current = current;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Cerrar autocomplete al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        autocompleteRef.current &&
        !autocompleteRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setShowAutocomplete(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Navegación con teclado
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showAutocomplete || allSuggestions.length === 0) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setSelectedIndex(prev => 
          prev < allSuggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        event.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        if (selectedIndex >= 0) {
          event.preventDefault();
          handleAutocompleteSelect(allSuggestions[selectedIndex].name);
        }
        break;
      case 'Escape':
        event.preventDefault();
        setShowAutocomplete(false);
        setSelectedIndex(-1);
        break;
    }
  };

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
    setShowAutocomplete(false);
    // El submit solo cierra el autocomplete, la búsqueda ya se ejecutó con debounce
    searchInputRef.current?.blur();
  };

  const handleAutocompleteSelect = (suggestion: string) => {
    setTerm(suggestion);
    setShowAutocomplete(false);
    // Al seleccionar una sugerencia, aplicar inmediatamente (sin esperar debounce)
    addRecentSearch(suggestion);
    incrementSearch(suggestion);
    const nextParams = new URLSearchParams(params?.toString() ?? '');
    nextParams.set('q', suggestion);
    const qs = nextParams.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  // Función para resaltar texto coincidente
  const highlightMatch = (text: string, query: string) => {
    if (!query.trim() || query.trim().length < 2) return text;
    
    const regex = new RegExp(`(${query.trim()})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 text-gray-900 font-semibold">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  // Obtener icono según tipo de sugerencia
  const getSuggestionIcon = (type: SearchSuggestion['type']) => {
    switch (type) {
      case 'business':
        return '🏪';
      case 'category':
        return '📂';
      case 'recent':
        return <BsClock className="text-base" />;
      case 'popular':
        return <BsFire className="text-base text-orange-500" />;
      default:
        return '🔍';
    }
  };

  const getSuggestionLabel = (type: SearchSuggestion['type']) => {
    switch (type) {
      case 'business':
        return 'Negocio';
      case 'category':
        return 'Categoría';
      case 'recent':
        return 'Reciente';
      case 'popular':
        return 'Popular';
      default:
        return 'Buscar';
    }
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
            {/* Logo y título */}
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg">
                <span className="text-xl">🏪</span>
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-bold text-[#38761D]">Directorio Yajalón</p>
                <p className="text-xs text-gray-500">Negocios locales</p>
              </div>
            </Link>
            
            <div className="flex items-center gap-2">
              <Link
                href="/favoritos"
                className="relative inline-flex items-center justify-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
              >
                <span className="text-red-500">♥</span>
                <span className="hidden sm:inline">Favoritos</span>
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
                <span className="hidden sm:inline">Filtros</span>
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
            className="relative flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 shadow-sm"
          >
            {isSearching ? (
              <div className="animate-spin">
                <BsSearch className="text-[#38761D]" aria-hidden="true" />
              </div>
            ) : (
              <BsSearch className="text-gray-400" aria-hidden="true" />
            )}
            <input
              ref={searchInputRef}
              type="search"
              placeholder="Buscar un negocio o producto..."
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              onFocus={() => setShowAutocomplete(true)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent text-sm text-gray-700 focus:outline-none"
              autoComplete="off"
              aria-label="Búsqueda de negocios"
              aria-autocomplete="list"
              aria-controls="autocomplete-results"
              aria-expanded={showAutocomplete}
            />
            {isSearching && (
              <span className="text-xs text-[#38761D] font-medium whitespace-nowrap">
                Buscando...
              </span>
            )}
            {term && !isSearching && (
              <button
                type="button"
                onClick={() => {
                  setTerm('');
                  setShowAutocomplete(false);
                  searchInputRef.current?.focus();
                }}
                className="text-gray-400 hover:text-gray-600 transition"
                aria-label="Limpiar búsqueda"
              >
                ✕
              </button>
            )}
            <button
              type="submit"
              className="rounded-full bg-emerald-500 px-4 py-1 text-xs font-semibold text-white hover:bg-emerald-600 transition"
            >
              Buscar
            </button>

            {/* Dropdown de Autocompletado */}
            {showAutocomplete && allSuggestions.length > 0 && (
              <div
                ref={autocompleteRef}
                id="autocomplete-results"
                role="listbox"
                className="absolute left-0 right-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-96 overflow-hidden"
              >
                {/* Header con opciones */}
                {term.trim().length < 2 && recentSearches.length > 0 && (
                  <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
                    <span className="text-xs font-medium text-gray-600">
                      {recentSearches.length > 0 && popularSearches.length > 0 
                        ? 'Búsquedas recientes y populares'
                        : recentSearches.length > 0 
                        ? 'Búsquedas recientes' 
                        : 'Búsquedas populares'}
                    </span>
                    {recentSearches.length > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          clearRecentSearches();
                        }}
                        className="text-xs text-gray-500 hover:text-red-600 transition flex items-center gap-1"
                      >
                        <BsX className="text-sm" />
                        Limpiar
                      </button>
                    )}
                  </div>
                )}

                <div className="py-2 max-h-80 overflow-y-auto">
                  {isLoading && term.trim().length >= 2 ? (
                    <div className="px-4 py-8 text-center">
                      <div className="inline-block w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-sm text-gray-500 mt-2">Buscando...</p>
                    </div>
                  ) : (
                    allSuggestions.map((result, index) => (
                      <button
                        key={`${result.type}-${result.name}-${index}`}
                        type="button"
                        role="option"
                        aria-selected={selectedIndex === index}
                        onClick={() => handleAutocompleteSelect(result.name)}
                        className={`w-full px-4 py-2.5 text-left hover:bg-gray-50 transition flex items-center gap-3 group ${
                          selectedIndex === index ? 'bg-emerald-50 border-l-4 border-emerald-500' : ''
                        }`}
                      >
                        <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition ${
                          selectedIndex === index 
                            ? 'bg-emerald-100' 
                            : result.type === 'popular'
                            ? 'bg-orange-50'
                            : result.type === 'recent'
                            ? 'bg-blue-50'
                            : 'bg-gray-50 group-hover:bg-gray-100'
                        }`}>
                          {getSuggestionIcon(result.type)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-medium truncate ${
                            selectedIndex === index ? 'text-emerald-900' : 'text-gray-900'
                          }`}>
                            {term.trim().length >= 2 && result.type !== 'recent' && result.type !== 'popular'
                              ? highlightMatch(result.name, term)
                              : result.name
                            }
                          </div>
                          {result.category && (
                            <div className="text-xs text-gray-500 truncate">
                              en {result.category}
                            </div>
                          )}
                          {!result.category && (
                            <div className="text-xs text-gray-500">
                              {getSuggestionLabel(result.type)}
                            </div>
                          )}
                        </div>
                        <span className={`flex-shrink-0 transition ${
                          selectedIndex === index 
                            ? 'text-emerald-600 opacity-100' 
                            : 'text-gray-400 opacity-0 group-hover:opacity-100'
                        }`}>
                          →
                        </span>
                      </button>
                    ))
                  )}
                </div>

                <div className="border-t border-gray-100 px-4 py-2 bg-gray-50">
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                    <kbd className="px-2 py-1 bg-white border border-gray-200 rounded text-xs font-mono">↑↓</kbd>
                    <span>navegar</span>
                    <kbd className="px-2 py-1 bg-white border border-gray-200 rounded text-xs font-mono ml-2">Enter</kbd>
                    <span>seleccionar</span>
                    <kbd className="px-2 py-1 bg-white border border-gray-200 rounded text-xs font-mono ml-auto">Esc</kbd>
                    <span>cerrar</span>
                  </div>
                  <div className="text-xs text-emerald-600 flex items-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                    Búsqueda instantánea activada - Los resultados se actualizan mientras escribes
                  </div>
                </div>
              </div>
            )}
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
