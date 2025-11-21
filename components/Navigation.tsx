'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { BsHeart, BsHouseDoor, BsShop, BsPerson, BsFilter, BsSearch } from 'react-icons/bs';
import { FormEvent, useState, useEffect, Suspense } from 'react';
import { useFavorites } from '../context/FavoritesContext';
import GeolocationButton from './GeolocationButton';

function NavigationContent() {
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const { favorites } = useFavorites();
  const [searchTerm, setSearchTerm] = useState('');
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  
  // Determinar si mostrar el buscador basado en la ruta
  const showSearch = pathname === '/' || pathname === '/negocios';
  
  // Sincronizar searchTerm con URL
  useEffect(() => {
    const q = params?.get('q') || '';
    setSearchTerm(q);
  }, [params]);
  
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
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative h-10 w-10 sm:h-12 sm:w-12 transition-transform group-hover:scale-105">
              <Image
                src="/images/logo.png"
                alt="Directorio Yajalón"
                fill
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

          {/* Buscador (Desktop y Mobile) */}
          {showSearch && (
            <form onSubmit={handleSearchSubmit} className="flex-1 max-w-2xl mx-4">
              <div className="relative flex items-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2 shadow-sm hover:shadow-md transition-shadow">
                <BsSearch className="text-gray-400 flex-shrink-0" />
                <input
                  type="search"
                  placeholder="Buscar negocios..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-gray-700 focus:outline-none min-w-0"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                  >
                    ✕
                  </button>
                )}
              </div>
            </form>
          )}

          {/* Botón de Geolocalización */}
          {showSearch && (
            <div className="flex-shrink-0">
              <GeolocationButton
                radiusKm={5}
                variant="compact"
                label=""
                className=""
              />
            </div>
          )}

          {/* Botón de Filtros */}
          {showSearch && (
            <button
              type="button"
              onClick={() => setShowFiltersModal(true)}
              className="relative inline-flex items-center justify-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition flex-shrink-0"
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
            <Link
              href="/para-negocios"
              className={`ml-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                pathname === '/para-negocios'
                  ? 'bg-[#38761D] text-white'
                  : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
              }`}
            >
              <BsPerson className="inline mr-2" />
              Para Negocios
            </Link>
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
            <Link
              href="/para-negocios"
              className="px-3 py-2 rounded-lg text-xs font-semibold bg-[#38761D] text-white hover:bg-[#2d5418]"
            >
              Registrar
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
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
