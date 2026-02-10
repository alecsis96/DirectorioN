'use client';
/**
 * Navegación flotante rápida para admin (móvil-friendly)
 * Botón flotante que despliega menú con todas las páginas admin
 */
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminQuickNav() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const navLinks = [
    { href: '/admin/solicitudes', label: 'Solicitudes', icon: '📥', description: 'Sistema nuevo' },
    { href: '/admin/applications', label: 'Aplicaciones', icon: '📋', description: 'Iniciales' },
    { href: '/admin/pending-businesses', label: 'En Revisión', icon: '🔍', description: 'Pendientes' },
    { href: '/admin/businesses', label: 'Negocios', icon: '🏪', description: 'Publicados' },
    { href: '/admin/payments', label: 'Pagos', icon: '💳', description: 'Financiero' },
    { href: '/admin/reports', label: 'Reportes', icon: '🚨', description: 'Denuncias' },
    { href: '/admin/reviews', label: 'Reseñas', icon: '⭐', description: 'Moderación' },
    { href: '/admin/analytics', label: 'Analytics', icon: '📊', description: 'Datos' },
    { href: '/admin/stats', label: 'Estadísticas', icon: '📈', description: 'Métricas' },
  ];

  return (
    <>
      {/* Botón flotante */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 bg-[#38761D] text-white rounded-full p-4 shadow-lg hover:bg-[#2d5a15] transition-all hover:scale-110 active:scale-95"
        aria-label="Admin menu"
      >
        {isOpen ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm"
        />
      )}

      {/* Menu desplegable */}
      <div
        className={`fixed bottom-24 right-6 z-50 w-72 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden transition-all duration-300 ${
          isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4 pointer-events-none'
        }`}
      >
        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-[#38761D] to-[#2d5a15]">
          <h3 className="text-white font-bold text-lg">Panel Admin</h3>
          <p className="text-white/80 text-xs">Navegación rápida</p>
        </div>

        <div className="max-h-[70vh] overflow-y-auto">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition ${
                  isActive ? 'bg-green-50 border-l-4 border-[#38761D]' : ''
                }`}
              >
                <span className="text-2xl flex-shrink-0">{link.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className={`font-semibold text-sm ${isActive ? 'text-[#38761D]' : 'text-gray-900'}`}>
                    {link.label}
                  </div>
                  <div className="text-xs text-gray-500 truncate">{link.description}</div>
                </div>
                {isActive && (
                  <span className="text-[#38761D] text-xs font-bold">●</span>
                )}
              </Link>
            );
          })}
        </div>

        <div className="p-3 border-t border-gray-200 bg-gray-50">
          <Link
            href="/"
            onClick={() => setIsOpen(false)}
            className="flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition"
          >
            <span>←</span>
            <span>Volver al Sitio</span>
          </Link>
        </div>
      </div>
    </>
  );
}
