'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { BsHeart, BsHouseDoor, BsShop, BsPerson, BsFilter, BsSearch } from 'react-icons/bs';
import { FormEvent, useState, useEffect, Suspense, useRef } from 'react';
import { useFavorites } from '../context/FavoritesContext';
import GeolocationButton from './GeolocationButton';
import { useSearchSuggestions } from '../hooks/useSearchSuggestions';
import { useDebounce } from '../hooks/useDebounce';
import { 
  LogIn, 
  LayoutDashboard, 
  Heart, 
  History, 
  HelpCircle, 
  Bell, 
  BarChart2, 
  LogOut, 
  ChevronDown 
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth } from '../firebaseConfig';

// Componente de Menú Desplegable de Usuario
const UserDropdown = ({ user, onSignOut }: { user: any, onSignOut: () => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cierra el menú al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const menuItems = [
    { icon: LayoutDashboard, label: 'Mis Negocios', href: '/mis-negocios', desc: 'Gestiona tus empresas' },
    { icon: Heart, label: 'Favoritos', href: '/favoritos', desc: 'Tus lugares guardados' },
    { icon: History, label: 'Historial', href: '/historial', desc: 'Visto recientemente' },
    { icon: Bell, label: 'Notificaciones', href: '/notificaciones', desc: 'Avisos importantes' },
    { icon: BarChart2, label: 'Métricas', href: '/metricas', desc: 'Rendimiento' },
    { icon: HelpCircle, label: 'Ayuda y Soporte', href: '/ayuda', desc: 'Centro de ayuda' },
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botón del Trigger (Avatar del Usuario) */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 pr-3 rounded-full border border-gray-200 hover:bg-gray-50 transition-all"
      >
        {user.photoURL ? (
          <img src={user.photoURL} alt="User" className="w-8 h-8 rounded-full object-cover" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-[#38761D] text-white flex items-center justify-center text-sm font-bold">
            {user.email?.[0].toUpperCase() || 'U'}
          </div>
        )}
        <span className="text-sm font-medium text-gray-700 hidden sm:block max-w-[100px] truncate">
          {user.displayName || 'Mi Cuenta'}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Menú Desplegable */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
          {/* Header del Menú */}
          <div className="p-4 bg-gray-50 border-b border-gray-100">
            <p className="text-sm font-bold text-gray-900">{user.displayName || 'Usuario'}</p>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
          </div>

          {/* Opciones */}
          <div className="p-2">
            {menuItems.map((item, index) => (
              <Link 
                key={index} 
                href={item.href}
                onClick={() => setIsOpen(false)}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
              >
                <div className="p-2 bg-gray-100 rounded-md group-hover:bg-white group-hover:shadow-sm transition-all">
                  <item.icon className="w-4 h-4 text-gray-600 group-hover:text-[#38761D]" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-gray-800">{item.label}</span>
                  </div>
                  <p className="text-xs text-gray-500">{item.desc}</p>
                </div>
              </Link>
            ))}
          </div>

          {/* Footer / Logout */}
          <div className="p-2 border-t border-gray-100 bg-gray-50">
            <button
              onClick={() => {
                setIsOpen(false);
                onSignOut();
              }}
              className="flex items-center gap-2 w-full p-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Cerrar Sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

function NavigationContent() {
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const { favorites } = useFavorites();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [colonias, setColonias] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const isUserTypingRef = useRef(false);
  const { suggestions, isLoading: loadingSuggestions } = useSearchSuggestions(searchTerm, categories);
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  
  // Estado para controlar visibilidad del nav en scroll
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  
  // Determinar si mostrar el buscador basado en la ruta
  const showSearch = pathname === '/' || pathname === '/negocios';

  // Detectar scroll para ocultar/mostrar navegación
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Solo ocultar si se ha scrolleado más de 100px
      if (currentScrollY < 100) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY) {
        // Scrolling down - ocultar
        setIsVisible(false);
      } else {
        // Scrolling up - mostrar
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // Funciones de autenticación
  const handleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push('/');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };
  
  // Sincronizar searchTerm con URL
  useEffect(() => {
    const q = params?.get('q') || '';
    setSearchTerm(q);
    isUserTypingRef.current = false;
  }, [params]);

  // Búsqueda instantánea con debounce
  useEffect(() => {
    if (!isUserTypingRef.current) return;
    if (!showSearch) return; // Solo en páginas con buscador
    
    const currentQuery = params?.get('q') || '';
    const trimmedTerm = debouncedSearchTerm.trim();
    
    if (trimmedTerm === currentQuery) {
      isUserTypingRef.current = false;
      return;
    }
    
    const nextParams = new URLSearchParams(params?.toString() ?? '');
    if (trimmedTerm) {
      nextParams.set('q', trimmedTerm);
    } else {
      nextParams.delete('q');
    }
    nextParams.delete('p'); // Reset page
    
    const qs = nextParams.toString();
    const targetPath = pathname === '/' ? '/negocios' : pathname || '/negocios';
    router.replace(qs ? `${targetPath}?${qs}` : targetPath, { scroll: false });
    
    isUserTypingRef.current = false;
  }, [debouncedSearchTerm, pathname, params, router, showSearch]);

  // Cargar filtros cuando se abre el modal
  useEffect(() => {
    if (showFiltersModal && categories.length === 0) {
      fetch('/api/filters')
        .then(res => res.json())
        .then(data => {
          setCategories(data.categories || []);
          setColonias(data.colonias || []);
        })
        .catch(err => console.error('Error loading filters:', err));
    }
  }, [showFiltersModal, categories.length]);

  // Cerrar sugerencias al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // No mostrar en páginas de admin
  if (pathname?.startsWith('/admin')) {
    return null;
  }

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    const nextParams = new URLSearchParams(params?.toString() ?? '');
    if (searchTerm.trim()) {
      nextParams.set('q', searchTerm.trim());
    } else {
      nextParams.delete('q');
    }
    nextParams.delete('p'); // Reset page
    const qs = nextParams.toString();
    const targetPath = pathname === '/' ? '/negocios' : pathname || '/negocios';
    router.push(qs ? `${targetPath}?${qs}` : targetPath);
  };
  
  // Contar filtros activos
  const activeFiltersCount = [
    params?.get('c'),
    params?.get('co'),
    params?.get('o') && params.get('o') !== 'destacado' ? params.get('o') : null
  ].filter(Boolean).length;

  return (
    <nav className={`sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm transition-transform duration-300 ${isVisible ? 'translate-y-0' : '-translate-y-full'}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-2">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group flex-shrink-0">
            <div className="relative h-10 w-10 sm:h-12 sm:w-12 transition-transform group-hover:scale-105" suppressHydrationWarning>
              <Image
                src="/images/logo.png"
                alt="Directorio Yajalón"
                fill
                sizes="48px"
                className="object-contain"
                priority
              />
            </div>
            <div className="hidden sm:block">
              <div className="text-lg font-bold text-gray-900 leading-tight">
                DIRECTORIO
              </div>
              <div className="text-sm text-gray-600">
                Yajalón
              </div>
            </div>
          </Link>

          {/* Buscador (Solo Desktop) */}
          {showSearch && (
            <div className="hidden md:flex flex-1 max-w-2xl mx-4 relative">
              <form onSubmit={handleSearchSubmit} className="w-full">
                <div className="relative flex items-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2 shadow-sm hover:shadow-md transition-shadow w-full">
                  <BsSearch className="text-gray-400 flex-shrink-0" />
                  <input
                    type="text"
                    placeholder="Buscar negocios..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setShowSuggestions(true);
                      isUserTypingRef.current = true;
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    className="flex-1 bg-transparent text-sm text-gray-700 focus:outline-none min-w-0"
                    autoComplete="off"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchTerm('');
                        setShowSuggestions(false);
                        isUserTypingRef.current = true;
                      }}
                      className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </form>
              
              {/* Autocomplete dropdown desktop */}
              {showSuggestions && searchTerm.length >= 2 && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 max-h-96 overflow-y-auto">
                  {suggestions.map((suggestion, idx) => (
                    <button
                      key={`desktop-${suggestion.type}-${suggestion.name}-${idx}`}
                      type="button"
                      onClick={() => {
                        setSearchTerm(suggestion.name);
                        setShowSuggestions(false);
                        const nextParams = new URLSearchParams(params?.toString() ?? '');
                        nextParams.set('q', suggestion.name);
                        nextParams.delete('p');
                        const targetPath = pathname === '/' ? '/negocios' : pathname || '/negocios';
                        router.push(`${targetPath}?${nextParams.toString()}`);
                      }}
                      className="w-full px-5 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl flex-shrink-0">
                          {suggestion.type === 'business' ? '🏪' : 
                           suggestion.type === 'category' ? '🏷️' :
                           suggestion.type === 'recent' ? '🕒' : '🔍'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{suggestion.name}</p>
                          {suggestion.category && (
                            <p className="text-sm text-gray-500 truncate">{suggestion.category}</p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Botón de Geolocalización (Solo Desktop) */}
          {showSearch && (
            <div className="hidden md:block flex-shrink-0">
              <GeolocationButton
                radiusKm={5}
                variant="compact"
                label=""
                className=""
              />
            </div>
          )}

          {/* Botón de Filtros (Solo Desktop) */}
          {showSearch && (
            <button
              type="button"
              onClick={() => setShowFiltersModal(true)}
              className="hidden md:inline-flex relative items-center justify-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition flex-shrink-0"
            >
              <BsFilter />
              <span className="hidden lg:inline">Filtros</span>
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white shadow-lg">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          )}

          {/* Desktop Navigation */}
          <div className={`hidden md:flex items-center gap-1 ${showSearch ? '' : 'flex-1 justify-end'}`}>
            <Link
              href="/"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname === '/'
                  ? 'bg-[#38761D] text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <BsHouseDoor className="inline mr-2" />
              Inicio
            </Link>
            <Link
              href="/negocios"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname === '/negocios'
                  ? 'bg-[#38761D] text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <BsShop className="inline mr-2" />
              Negocios
            </Link>
            <Link
              href="/favoritos"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname === '/favoritos'
                  ? 'bg-[#38761D] text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <BsHeart className="inline mr-2" />
              Favoritos
            </Link>
            
            {/* Área de Usuario/Login */}
            {user ? (
              <UserDropdown user={user} onSignOut={handleSignOut} />
            ) : (
              <button
                onClick={handleSignIn}
                className="ml-2 flex items-center gap-2 px-4 py-2 rounded-lg bg-[#38761D] text-white text-sm font-semibold hover:bg-[#2f5a1a] transition shadow-md hover:shadow-lg"
              >
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">Iniciar Sesión</span>
                <span className="sm:hidden">Entrar</span>
              </button>
            )}
          </div>

          {/* Mobile Navigation */}
          <div className="flex md:hidden items-center gap-2">
            <Link
              href="/favoritos"
              className={`p-2 rounded-lg ${
                pathname === '/favoritos'
                  ? 'bg-[#38761D] text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <BsHeart className="text-xl" />
            </Link>
            
            {/* Área de Usuario/Login Mobile */}
            {user ? (
              <UserDropdown user={user} onSignOut={handleSignOut} />
            ) : (
              <button
                onClick={handleSignIn}
                className="px-3 py-2 rounded-lg text-xs font-semibold bg-[#38761D] text-white hover:bg-[#2d5418] flex items-center gap-1"
              >
                <LogIn className="w-3 h-3" />
                Entrar
              </button>
            )}
          </div>
        </div>

        {/* Mobile Search Bar */}
        {showSearch && (
          <div className="md:hidden pb-3 pt-2 px-1">
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1 min-w-0" ref={searchRef}>
                <form onSubmit={handleSearchSubmit}>
                  <div className="relative flex items-center gap-2 rounded-full border border-gray-300 bg-white px-3 py-2 shadow-sm">
                    <BsSearch className="text-gray-400 flex-shrink-0 text-sm" />
                    <input
                      type="text"
                      placeholder="Buscar..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setShowSuggestions(true);
                        isUserTypingRef.current = true;
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      className="flex-1 bg-transparent text-sm text-gray-700 focus:outline-none min-w-0"
                      autoComplete="off"
                    />
                    {searchTerm && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchTerm('');
                          setShowSuggestions(false);
                          isUserTypingRef.current = true;
                        }}
                        className="text-gray-400 hover:text-gray-600 flex-shrink-0 text-lg"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </form>
                
                {/* Autocomplete dropdown */}
                {showSuggestions && searchTerm.length >= 2 && suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-2xl shadow-lg z-50 max-h-64 overflow-y-auto">
                    {suggestions.map((suggestion, idx) => (
                      <button
                        key={`${suggestion.type}-${suggestion.name}-${idx}`}
                        type="button"
                        onClick={() => {
                          setSearchTerm(suggestion.name);
                          setShowSuggestions(false);
                          const nextParams = new URLSearchParams(params?.toString() ?? '');
                          nextParams.set('q', suggestion.name);
                          nextParams.delete('p');
                          const targetPath = pathname === '/' ? '/negocios' : pathname || '/negocios';
                          router.push(`${targetPath}?${nextParams.toString()}`);
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl flex-shrink-0">
                            {suggestion.type === 'business' ? '🏪' : 
                             suggestion.type === 'category' ? '🏷️' :
                             suggestion.type === 'recent' ? '🕒' : '🔍'}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{suggestion.name}</p>
                            {suggestion.category && (
                              <p className="text-xs text-gray-500 truncate">{suggestion.category}</p>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex-shrink-0">
                <GeolocationButton
                  radiusKm={5}
                  variant="compact"
                  label=""
                  className=""
                />
              </div>
              
              <button
                type="button"
                onClick={() => setShowFiltersModal(true)}
                className="relative inline-flex items-center justify-center rounded-full border border-gray-200 p-2 text-gray-700 hover:bg-gray-50 transition flex-shrink-0"
              >
                <BsFilter className="text-lg" />
                {activeFiltersCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Bottom Nav */}
      <div 
        className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50"
        style={{
          transform: isVisible ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.3s ease-in-out'
        }}
      >
        <div className="grid grid-cols-3 gap-1 px-2 py-2">
          <Link
            href="/"
            className={`flex flex-col items-center gap-1 py-2 px-4 rounded-lg text-xs font-medium transition-colors ${
              pathname === '/'
                ? 'bg-[#38761D] text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <BsHouseDoor className="text-xl" />
            <span>Inicio</span>
          </Link>
          <Link
            href="/negocios"
            className={`flex flex-col items-center gap-1 py-2 px-4 rounded-lg text-xs font-medium transition-colors ${
              pathname === '/negocios'
                ? 'bg-[#38761D] text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <BsShop className="text-xl" />
            <span>Negocios</span>
          </Link>
          <Link
            href="/favoritos"
            className={`flex flex-col items-center gap-1 py-2 px-4 rounded-lg text-xs font-medium transition-colors ${
              pathname === '/favoritos'
                ? 'bg-[#38761D] text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <BsHeart className="text-xl" />
            <span>Favoritos</span>
          </Link>
        </div>
      </div>

      {/* Modal de Filtros */}
      {showFiltersModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50" onClick={() => setShowFiltersModal(false)}>
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-lg max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Filtros</h2>
              <button
                type="button"
                onClick={() => setShowFiltersModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Categoría
                </label>
                <select
                  value={params?.get('c') || ''}
                  onChange={(e) => {
                    const nextParams = new URLSearchParams(params?.toString() ?? '');
                    if (e.target.value) {
                      nextParams.set('c', e.target.value);
                    } else {
                      nextParams.delete('c');
                    }
                    nextParams.delete('p');
                    router.push(`${pathname}?${nextParams.toString()}`);
                  }}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Todas las categorías</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Colonia
                </label>
                <select
                  value={params?.get('co') || ''}
                  onChange={(e) => {
                    const nextParams = new URLSearchParams(params?.toString() ?? '');
                    if (e.target.value) {
                      nextParams.set('co', e.target.value);
                    } else {
                      nextParams.delete('co');
                    }
                    nextParams.delete('p');
                    router.push(`${pathname}?${nextParams.toString()}`);
                  }}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Todas las colonias</option>
                  {colonias.map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Ordenar por
                </label>
                <select
                  value={params?.get('o') || 'destacado'}
                  onChange={(e) => {
                    const nextParams = new URLSearchParams(params?.toString() ?? '');
                    if (e.target.value && e.target.value !== 'destacado') {
                      nextParams.set('o', e.target.value);
                    } else {
                      nextParams.delete('o');
                    }
                    nextParams.delete('p');
                    router.push(`${pathname}?${nextParams.toString()}`);
                  }}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="destacado">Destacados</option>
                  <option value="rating">Mejor valorados</option>
                  <option value="name">Nombre (A-Z)</option>
                  <option value="recent">Más recientes</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    router.push(pathname || '/');
                    setShowFiltersModal(false);
                  }}
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition"
                >
                  Limpiar
                </button>
                <button
                  type="button"
                  onClick={() => setShowFiltersModal(false)}
                  className="flex-1 px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition"
                >
                  Aplicar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

export default function Navigation() {
  return (
    <Suspense fallback={
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="relative h-10 w-10 sm:h-12 sm:w-12">
                <Image
                  src="/images/logo.png"
                  alt="Directorio Yajalón"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </Link>
          </div>
        </div>
      </nav>
    }>
      <NavigationContent />
    </Suspense>
  );
}
