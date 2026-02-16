'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  BsInbox,
  BsFileText,
  BsShop,
  BsCreditCard,
  BsStar,
  BsBarChart,
  BsList,
  BsX,
  BsExclamationTriangle,
  BsGraphUp,
  BsSearch,
  BsChevronDown,
  BsChevronRight,
  BsPencilSquare,
  BsBoxSeam,
  BsShieldCheck,
  BsBug,
} from 'react-icons/bs';

export default function AdminSidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [legacyExpanded, setLegacyExpanded] = useState(false);
  
  // Feature flags
  const showLegacy = process.env.NEXT_PUBLIC_SHOW_LEGACY_ADMIN === 'true';
  const showDebug = process.env.NODE_ENV === 'development';

  const navItems = [
    // ========== OPERATIONS (Operaciones principales) ==========
    { 
      section: true,
      label: 'OPERACIONES',
      icon: BsBoxSeam,
    },
    { 
      href: '/admin/solicitudes', 
      label: 'Solicitudes', 
      icon: BsInbox,
      description: 'Nuevas aplicaciones'
    },
    { 
      href: '/admin/alta-asistida', 
      label: 'Alta Asistida', 
      icon: BsPencilSquare,
      description: 'Crear manual'
    },
    
    // ========== INVENTORY (Gestión de inventario) ==========
    { 
      section: true,
      label: 'INVENTARIO',
      icon: BsShop,
    },
    { 
      href: '/admin/businesses', 
      label: 'Negocios', 
      icon: BsShop,
      description: 'Todos publicados'
    },
    
    // ========== MODERATION (Moderación de contenido) ==========
    { 
      section: true,
      label: 'MODERACIÓN',
      icon: BsShieldCheck,
    },
    { 
      href: '/admin/reviews', 
      label: 'Reseñas', 
      icon: BsStar,
      description: 'Moderación'
    },
    { 
      href: '/admin/reports', 
      label: 'Reportes', 
      icon: BsExclamationTriangle,
      description: 'Denuncias'
    },
    
    // ========== FINANCE (Finanzas) ==========
    { 
      section: true,
      label: 'FINANZAS',
      icon: BsCreditCard,
    },
    { 
      href: '/admin/payments', 
      label: 'Pagos', 
      icon: BsCreditCard,
      description: 'Vencimientos'
    },
    
    // ========== INSIGHTS (Datos y análisis) ==========
    { 
      section: true,
      label: 'ANÁLISIS',
      icon: BsGraphUp,
    },
    { 
      href: '/admin/analytics', 
      label: 'Analytics', 
      icon: BsBarChart,
      description: 'Métricas'
    },
    { 
      href: '/admin/stats', 
      label: 'Estadísticas', 
      icon: BsGraphUp,
      description: 'Dashboard'
    },
  ];
  
  // Rutas legacy (ocultas por defecto)
  const legacyItems = [
    { 
      href: '/admin/applications', 
      label: 'Applications', 
      icon: BsFileText,
      description: 'Sistema antiguo'
    },
    { 
      href: '/admin/pending-businesses', 
      label: 'En Revisión', 
      icon: BsSearch,
      description: 'Pendientes old'
    },
  ];
  
  // Rutas debug (solo desarrollo)
  const debugItems = showDebug ? [
    { 
      href: '/admin/debug', 
      label: 'Debug', 
      icon: BsBug,
      description: 'Herramientas dev'
    },
  ] : [];

  return (
    <>
      {/* Mobile: Hamburger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden bg-emerald-600 text-white rounded-lg p-2.5 shadow-lg hover:bg-emerald-700 transition-colors"
        aria-label="Toggle menu"
      >
        {isOpen ? <BsX className="w-6 h-6" /> : <BsList className="w-6 h-6" />}
      </button>

      {/* Mobile: Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <nav
        className={`
          fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 z-40
          transition-transform duration-300 ease-in-out overflow-y-auto
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Header */}
        <div className="p-5 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Admin Panel</h2>
          <p className="text-xs text-gray-500 mt-1">Panel de operaciones</p>
        </div>

        {/* Navigation */}
        <ul className="p-3 space-y-1">
          {navItems.map((item, index) => {
            if (item.section) {
              return (
                <li key={`section-${index}`} className="pt-4 pb-2 px-3">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {item.label}
                  </span>
                </li>
              );
            }

            const Icon = item.icon!;
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');

            return (
              <li key={item.href}>
                <Link
                  href={item.href!}
                  onClick={() => setIsOpen(false)}
                  className={`
                    flex items-start gap-3 px-3 py-2.5 rounded-lg transition-all group
                    ${isActive 
                      ? 'bg-emerald-600 text-white shadow-sm' 
                      : 'text-gray-700 hover:bg-gray-50 hover:text-emerald-600'
                    }
                  `}
                >
                  <Icon 
                    className={`
                      flex-shrink-0 mt-0.5 text-lg
                      ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-emerald-600'}
                    `} 
                  />
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-semibold ${isActive ? 'text-white' : 'text-gray-900'}`}>
                      {item.label}
                    </div>
                    <div className={`text-xs ${isActive ? 'text-emerald-100' : 'text-gray-500'}`}>
                      {item.description}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
          
          {/* Legacy Section (Collapsible) */}
          {showLegacy && (
            <>
              <li className="pt-4 pb-2 px-3">
                <button
                  onClick={() => setLegacyExpanded(!legacyExpanded)}
                  className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-600 transition-colors w-full"
                >
                  {legacyExpanded ? <BsChevronDown className="text-sm" /> : <BsChevronRight className="text-sm" />}
                  <span>Legacy</span>
                </button>
              </li>
              
              {legacyExpanded && legacyItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={`
                        flex items-start gap-3 px-3 py-2.5 rounded-lg transition-all group
                        ${isActive 
                          ? 'bg-gray-200 text-gray-900' 
                          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                        }
                      `}
                    >
                      <Icon 
                        className={`
                          flex-shrink-0 mt-0.5 text-lg
                          ${isActive ? 'text-gray-600' : 'text-gray-400 group-hover:text-gray-600'}
                        `} 
                      />
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-semibold ${isActive ? 'text-gray-900' : 'text-gray-600'}`}>
                          {item.label}
                        </div>
                        <div className={`text-xs ${isActive ? 'text-gray-600' : 'text-gray-400'}`}>
                          {item.description}
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </>
          )}
          
          {/* Debug Section (Solo desarrollo) */}
          {showDebug && debugItems.length > 0 && (
            <>
              <li className="pt-4 pb-2 px-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-orange-500 uppercase tracking-wider">
                  <BsBug className="text-sm" />
                  <span>DEBUG</span>
                </div>
              </li>
              
              {debugItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={`
                        flex items-start gap-3 px-3 py-2.5 rounded-lg transition-all group
                        ${isActive 
                          ? 'bg-orange-100 text-orange-900 border-l-2 border-orange-500' 
                          : 'text-orange-600 hover:bg-orange-50'
                        }
                      `}
                    >
                      <Icon 
                        className={`
                          flex-shrink-0 mt-0.5 text-lg
                          ${isActive ? 'text-orange-600' : 'text-orange-400 group-hover:text-orange-600'}
                        `} 
                      />
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-semibold ${isActive ? 'text-orange-900' : 'text-orange-700'}`}>
                          {item.label}
                        </div>
                        <div className={`text-xs ${isActive ? 'text-orange-700' : 'text-orange-500'}`}>
                          {item.description}
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </>
          )}
        </ul>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-gray-50">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <span>←</span>
            <span>Volver al sitio</span>
          </Link>
        </div>
      </nav>
    </>
  );
}
