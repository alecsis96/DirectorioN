'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ComponentType } from 'react';
import {
  BsBarChart,
  BsBoxSeam,
  BsBug,
  BsChevronDown,
  BsChevronRight,
  BsExclamationTriangle,
  BsFileText,
  BsGraphUp,
  BsInbox,
  BsList,
  BsMegaphone,
  BsPencilSquare,
  BsSearch,
  BsShop,
  BsStar,
  BsX,
} from 'react-icons/bs';

type NavItem =
  | {
      section: true;
      label: string;
    }
  | {
      href: string;
      label: string;
      icon: ComponentType<{ className?: string }>;
      description: string;
    };

export default function AdminSidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [legacyExpanded, setLegacyExpanded] = useState(false);

  const showLegacy = process.env.NEXT_PUBLIC_SHOW_LEGACY_ADMIN === 'true';
  const showDebug = process.env.NODE_ENV === 'development';

  const navItems: NavItem[] = [
    { section: true, label: 'Principal' },
    { href: '/admin', label: 'Inbox', icon: BsInbox, description: 'Pendientes y urgencias' },
    { href: '/admin/solicitudes', label: 'Solicitudes', icon: BsFileText, description: 'Revision y decisiones' },
    { href: '/admin/campaigns', label: 'Campaigns', icon: BsMegaphone, description: 'Hero y ofertas activas' },
    { href: '/admin/businesses', label: 'Negocios', icon: BsShop, description: 'Lista y acciones clave' },
    { href: '/admin/alta-asistida', label: 'Alta asistida', icon: BsPencilSquare, description: 'Alta guiada' },
    { section: true, label: 'Secundario' },
    { href: '/admin/payments', label: 'Pagos', icon: BsBoxSeam, description: 'Cobros y vencimientos' },
    { href: '/admin/reports', label: 'Reportes', icon: BsExclamationTriangle, description: 'Incidencias y denuncias' },
    { href: '/admin/analytics', label: 'Analytics', icon: BsBarChart, description: 'Uso y comportamiento' },
    { href: '/admin/stats', label: 'Stats', icon: BsGraphUp, description: 'Metricas globales' },
    { href: '/admin/reviews', label: 'Resenas', icon: BsStar, description: 'Moderacion' },
  ];

  const legacyItems = [
    { href: '/admin/applications', label: 'Applications', icon: BsFileText, description: 'Sistema antiguo' },
    { href: '/admin/pending-businesses', label: 'Pendientes legacy', icon: BsSearch, description: 'Revision vieja' },
  ];

  const debugItems = showDebug
    ? [{ href: '/admin/debug', label: 'Debug', icon: BsBug, description: 'Herramientas dev' }]
    : [];

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed left-4 top-4 z-50 rounded-lg bg-emerald-600 p-2.5 text-white shadow-lg transition-colors hover:bg-emerald-700 lg:hidden"
        aria-label="Abrir menu admin"
      >
        {isOpen ? <BsX className="h-6 w-6" /> : <BsList className="h-6 w-6" />}
      </button>

      {isOpen ? <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setIsOpen(false)} /> : null}

      <nav
        className={`fixed left-0 top-0 z-40 h-full w-64 overflow-y-auto border-r border-gray-200 bg-white transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="border-b border-gray-200 p-5">
          <h2 className="text-lg font-bold text-gray-900">Admin Panel</h2>
          <p className="mt-1 text-xs text-gray-500">Operacion diaria</p>
        </div>

        <ul className="space-y-1 p-3 pb-24">
          {navItems.map((item, index) => {
            if ('section' in item) {
              return (
                <li key={`section-${index}`} className="px-3 pb-2 pt-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">{item.label}</span>
                </li>
              );
            }

            const navItem = item;
            const Icon = navItem.icon;
            const isActive = pathname === navItem.href || pathname?.startsWith(navItem.href + '/');

            return (
              <li key={navItem.href}>
                <Link
                  href={navItem.href}
                  onClick={() => setIsOpen(false)}
                  className={`group flex items-start gap-3 rounded-lg px-3 py-2.5 transition-all ${
                    isActive ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-700 hover:bg-gray-50 hover:text-emerald-600'
                  }`}
                >
                  <Icon
                    className={`mt-0.5 flex-shrink-0 text-lg ${
                      isActive ? 'text-white' : 'text-gray-400 group-hover:text-emerald-600'
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className={`text-sm font-semibold ${isActive ? 'text-white' : 'text-gray-900'}`}>{navItem.label}</div>
                    <div className={`text-xs ${isActive ? 'text-emerald-100' : 'text-gray-500'}`}>{navItem.description}</div>
                  </div>
                </Link>
              </li>
            );
          })}

          {showLegacy ? (
            <>
              <li className="px-3 pb-2 pt-4">
                <button
                  onClick={() => setLegacyExpanded(!legacyExpanded)}
                  className="flex w-full items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-400 transition-colors hover:text-gray-600"
                >
                  {legacyExpanded ? <BsChevronDown className="text-sm" /> : <BsChevronRight className="text-sm" />}
                  <span>Legacy</span>
                </button>
              </li>

              {legacyExpanded
                ? legacyItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');

                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setIsOpen(false)}
                          className={`group flex items-start gap-3 rounded-lg px-3 py-2.5 transition-all ${
                            isActive ? 'bg-gray-200 text-gray-900' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                          }`}
                        >
                          <Icon
                            className={`mt-0.5 flex-shrink-0 text-lg ${
                              isActive ? 'text-gray-600' : 'text-gray-400 group-hover:text-gray-600'
                            }`}
                          />
                          <div className="min-w-0 flex-1">
                            <div className={`text-sm font-semibold ${isActive ? 'text-gray-900' : 'text-gray-600'}`}>
                              {item.label}
                            </div>
                            <div className={`text-xs ${isActive ? 'text-gray-600' : 'text-gray-400'}`}>{item.description}</div>
                          </div>
                        </Link>
                      </li>
                    );
                  })
                : null}
            </>
          ) : null}

          {showDebug && debugItems.length > 0 ? (
            <>
              <li className="px-3 pb-2 pt-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-orange-500">
                  <BsBug className="text-sm" />
                  <span>Debug</span>
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
                      className={`group flex items-start gap-3 rounded-lg px-3 py-2.5 transition-all ${
                        isActive ? 'border-l-2 border-orange-500 bg-orange-100 text-orange-900' : 'text-orange-600 hover:bg-orange-50'
                      }`}
                    >
                      <Icon
                        className={`mt-0.5 flex-shrink-0 text-lg ${
                          isActive ? 'text-orange-600' : 'text-orange-400 group-hover:text-orange-600'
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className={`text-sm font-semibold ${isActive ? 'text-orange-900' : 'text-orange-700'}`}>
                          {item.label}
                        </div>
                        <div className={`text-xs ${isActive ? 'text-orange-700' : 'text-orange-500'}`}>{item.description}</div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </>
          ) : null}
        </ul>

        <div className="absolute bottom-0 left-0 right-0 border-t border-gray-200 bg-gray-50 p-4">
          <Link href="/" className="flex items-center gap-2 text-sm text-gray-600 transition hover:text-gray-900">
            <span aria-hidden="true">←</span>
            <span>Volver al sitio</span>
          </Link>
        </div>
      </nav>
    </>
  );
}
