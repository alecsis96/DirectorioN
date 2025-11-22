'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminNavigation() {
  const pathname = usePathname();

  const navLinks = [
    { href: '/admin/applications', label: '📝 Solicitudes', icon: '📝' },
    { href: '/admin/pending-businesses', label: '🔍 Negocios en revisión', icon: '🔍' },
    { href: '/admin/businesses', label: '🏪 Negocios publicados', icon: '🏪' },
    { href: '/admin/payments', label: '💳 Pagos y suspensiones', icon: '💳' },
    { href: '/admin/reports', label: '🚨 Reportes', icon: '🚨' },
    { href: '/admin/analytics', label: '📊 Analytics', icon: '📊' },
    { href: '/admin/stats', label: '📈 Estadísticas', icon: '📈' },
  ];

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {navLinks.map((link) => {
        const isActive = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`px-4 py-2 font-semibold rounded transition ${
              isActive
                ? 'bg-[#38761D] text-white'
                : 'bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}
