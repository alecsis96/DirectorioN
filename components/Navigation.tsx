'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { BsHeart, BsHouseDoor, BsShop, BsPerson } from 'react-icons/bs';

export default function Navigation() {
  const pathname = usePathname();
  
  // No mostrar en páginas de admin
  if (pathname?.startsWith('/admin')) {
    return null;
  }

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

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
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
