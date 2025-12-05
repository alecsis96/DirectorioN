'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { 
  BsClipboardCheck, 
  BsSearch, 
  BsShop, 
  BsCreditCard, 
  BsExclamationTriangle,
  BsBarChart,
  BsStar,
  BsGraphUp,
  BsHouseDoor,
  BsList,
  BsX
} from 'react-icons/bs';

type AdminNavigationProps = {
  variant?: 'sidebar' | 'horizontal';
};

export default function AdminNavigation({ variant = 'horizontal' }: AdminNavigationProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const navLinks = [
    { href: '/admin/applications', label: 'Solicitudes iniciales', icon: BsClipboardCheck, description: 'Nuevas aplicaciones', emoji: '📋' },
    { href: '/admin/pending-businesses', label: 'Negocios en revisión', icon: BsSearch, description: 'Pendientes de aprobar', emoji: '🔍' },
    { href: '/admin/businesses', label: 'Negocios publicados', icon: BsShop, description: 'Activos en el sitio', emoji: '🏪' },
    { href: '/admin/payments', label: 'Pagos y suspensiones', icon: BsCreditCard, description: 'Gestión financiera', emoji: '💳' },
    { href: '/admin/reports', label: 'Reportes', icon: BsExclamationTriangle, description: 'Denuncias de usuarios', emoji: '🚨' },
    { href: '/admin/analytics', label: 'Analytics', icon: BsBarChart, description: 'Análisis de datos', emoji: '📊' },
    { href: '/admin/reviews', label: 'Reseñas', icon: BsStar, description: 'Moderación de reseñas', emoji: '⭐' },
    { href: '/admin/stats', label: 'Estadísticas', icon: BsGraphUp, description: 'Métricas del sistema', emoji: '📈' },
  ];

  if (variant === 'sidebar') {
    return (
      <>
        {/* Hamburger Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="fixed top-4 left-4 z-50 lg:hidden bg-[#38761D] text-white rounded-lg p-2.5 shadow-lg hover:bg-[#2d5a15] transition-colors"
          aria-label="Toggle menu"
        >
          {isOpen ? (
            <BsX className="w-6 h-6" />
          ) : (
            <BsList className="w-6 h-6" />
          )}
        </button>

        {/* Overlay */}
        {isOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setIsOpen(false)}
          />
        )}

        {/* Sidebar */}
        <nav
          className={`
            fixed lg:sticky top-0 lg:top-4 left-0 h-screen lg:h-fit w-72 lg:w-full
            bg-white border border-gray-200 rounded-none lg:rounded-2xl shadow-xl lg:shadow-sm
            p-4 sm:p-5 z-40 transition-transform duration-300 ease-in-out overflow-y-auto
            ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
        >
          <div className="mb-4 pb-4 border-b border-gray-200">
            <h2 className="text-xs sm:text-sm font-semibold text-gray-900 uppercase tracking-wider">Panel Admin</h2>
          </div>
          
          <ul className="space-y-1">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`
                      flex items-start gap-2 sm:gap-3 px-2 sm:px-3 py-2 sm:py-2.5 rounded-lg transition-all group
                      ${isActive 
                        ? 'bg-[#38761D] text-white shadow-sm' 
                        : 'text-gray-700 hover:bg-gray-50 hover:text-[#38761D]'
                      }
                    `}
                  >
                    <Icon 
                      className={`
                        flex-shrink-0 mt-0.5 text-base sm:text-lg
                        ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-[#38761D]'}
                      `} 
                    />
                    <div className="flex-1 min-w-0">
                      <div className={`
                        text-xs sm:text-sm font-medium truncate
                        ${isActive ? 'text-white' : 'text-gray-900'}
                      `}>
                        {item.label}
                      </div>
                      <div className={`
                        text-[10px] sm:text-xs truncate
                        ${isActive ? 'text-white/80' : 'text-gray-500 group-hover:text-gray-600'}
                      `}>
                        {item.description}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="mt-4 pt-4 border-t border-gray-200">
            <Link
              href="/"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 px-2 sm:px-3 py-2 text-xs sm:text-sm text-gray-600 hover:text-[#38761D] transition-colors rounded-lg hover:bg-gray-50"
            >
              <BsHouseDoor className="flex-shrink-0" />
              <span>Volver al sitio</span>
            </Link>
          </div>
        </nav>
      </>
    );
  }

  // Horizontal variant (original)
  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {navLinks.map((link) => {
        const isActive = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded transition ${
              isActive
                ? 'bg-[#38761D] text-white'
                : 'bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span className="sm:hidden">{link.emoji}</span>
            <span className="hidden sm:inline">{link.emoji} {link.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
