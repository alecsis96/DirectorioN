'use client';
/**
 * AdminFab - Floating Action Button contextual para Admin
 * 
 * Muestra acciones específicas según la ruta actual:
 * - /admin/businesses: Botón "+ Crear negocio"
 * - /admin/solicitudes: Acceso rápido a crear alta asistida
 * - Otras rutas: Oculto (no hay acción clara)
 * 
 * NO ES NAVEGACIÓN - Solo acciones contextuales
 */
import { usePathname, useRouter } from 'next/navigation';
import { BsPlus, BsPencil } from 'react-icons/bs';

export default function AdminFab() {
  const pathname = usePathname();
  const router = useRouter();

  // Determinar acción según ruta
  const getFabAction = () => {
    // /admin/businesses/* → Crear nuevo negocio
    if (pathname?.startsWith('/admin/businesses')) {
      return {
        label: 'Crear negocio',
        icon: BsPlus,
        onClick: () => router.push('/admin/businesses/nuevo'),
        ariaLabel: 'Crear nuevo negocio',
      };
    }
    
    // /admin/solicitudes/* → Crear alta asistida
    if (pathname?.startsWith('/admin/solicitudes')) {
      return {
        label: 'Alta asistida',
        icon: BsPencil,
        onClick: () => router.push('/admin/alta-asistida'),
        ariaLabel: 'Crear alta asistida',
      };
    }
    
    // No hay acción contextual para esta ruta
    return null;
  };

  const action = getFabAction();

  // Si no hay acción, no mostrar FAB
  if (!action) {
    return null;
  }

  const Icon = action.icon;

  return (
    <button
      onClick={action.onClick}
      aria-label={action.ariaLabel}
      className="
        fixed bottom-6 right-6 z-40
        flex items-center gap-3
        bg-emerald-600 hover:bg-emerald-700
        text-white font-semibold
        rounded-full shadow-lg
        px-5 py-3.5
        transition-all duration-200
        hover:scale-105 active:scale-95
        hover:shadow-xl
        group
      "
    >
      <Icon className="text-xl flex-shrink-0" />
      <span className="text-sm hidden sm:inline-block">
        {action.label}
      </span>
    </button>
  );
}
