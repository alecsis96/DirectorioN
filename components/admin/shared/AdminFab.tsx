'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { BsMegaphone, BsPencilSquare, BsPlus, BsShop, BsX } from 'react-icons/bs';

const FAB_ACTIONS = [
  {
    label: 'Crear campaña',
    icon: BsMegaphone,
    href: '/admin/campaigns',
    color: 'bg-amber-500 hover:bg-amber-600',
  },
  {
    label: 'Crear negocio',
    icon: BsShop,
    href: '/admin/businesses/nuevo',
    color: 'bg-blue-600 hover:bg-blue-700',
  },
  {
    label: 'Alta asistida',
    icon: BsPencilSquare,
    href: '/admin/alta-asistida',
    color: 'bg-emerald-600 hover:bg-emerald-700',
  },
] as const;

export default function AdminFab() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  if (!pathname?.startsWith('/admin')) return null;

  return (
    <div className="fixed right-6 bottom-6 z-40 flex flex-col items-end gap-3">
      {isOpen
        ? FAB_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.href}
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  router.push(action.href);
                }}
                className={`inline-flex items-center gap-3 rounded-full px-4 py-3 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-[1.02] ${action.color}`}
              >
                <Icon className="text-base" />
                <span>{action.label}</span>
              </button>
            );
          })
        : null}

      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-label={isOpen ? 'Cerrar acciones rápidas' : 'Abrir acciones rápidas'}
        className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-white shadow-[0_18px_40px_rgba(15,23,42,0.28)] transition hover:bg-slate-800"
      >
        {isOpen ? <BsX className="text-2xl" /> : <BsPlus className="text-2xl" />}
      </button>
    </div>
  );
}
