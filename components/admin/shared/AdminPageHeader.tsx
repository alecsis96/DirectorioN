import React, { ReactNode } from 'react';
import { BsArrowLeft } from 'react-icons/bs';
import Link from 'next/link';

interface AdminPageHeaderProps {
  /** Título principal de la página */
  title: string;
  
  /** Descripción o subtítulo */
  description?: string;
  
  /** Ícono a mostrar (componente React) */
  icon?: React.ComponentType<{ className?: string }>;
  
  /** Color del ícono (defaults a emerald) */
  iconColor?: 'emerald' | 'blue' | 'purple' | 'orange'  | 'red';
  
  /** Badges/counters a mostrar */
  badges?: {
    label: string;
    value: number | string;
    variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  }[];
  
  /** Acciones/botones del lado derecho */
  actions?: ReactNode;
  
  /** Texto del botón de retroceso */
  backButton?: {
    href: string;
    label: string;
  };
}

const iconBgColors = {
  emerald: 'bg-emerald-100',
  blue: 'bg-blue-100',
  purple: 'bg-purple-100',
  orange: 'bg-orange-100',
  red: 'bg-red-100',
};

const iconTextColors = {
  emerald: 'text-emerald-600',
  blue: 'text-blue-600',
  purple: 'text-purple-600',
  orange: 'text-orange-600',
  red: 'text-red-600',
};

const badgeVariants = {
  default: 'bg-gray-100 text-gray-700',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-yellow-100 text-yellow-700',
  error: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
};

/**
 * AdminPageHeader - Header consistente para páginas admin
 * 
 * @example
 * ```tsx
 * <AdminPageHeader
 *   title="Solicitudes"
 *   description="Gestionar nuevas aplicaciones"
 *   icon={BsInbox}
 *   badges={[
 *     { label: 'Nuevas', value: 12, variant: 'warning' },
 *     { label: 'Total', value: 245, variant: 'default' }
 *   ]}
 *   actions={
 *     <button className="btn-primary">Nueva solicitud</button>
 *   }
 * />
 * ```
 */
export default function AdminPageHeader({
  title,
  description,
  icon: Icon,
  iconColor = 'emerald',
  badges = [],
  actions,
  backButton,
}: AdminPageHeaderProps) {
  return (
    <div className="bg-white border-b border-gray-200 mb-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        {/* Back button (opcional) */}
        {backButton && (
          <div className="mb-3">
            <Link
              href={backButton.href}
              className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <BsArrowLeft />
              <span>{backButton.label}</span>
            </Link>
          </div>
        )}
        
        <div className="flex items-start justify-between gap-4">
          {/* Lado izquierdo: Título + descripción */}
          <div className="flex items-start gap-3 flex-1">
            {/* Ícono */}
            {Icon && (
              <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${iconBgColors[iconColor]} flex-shrink-0`}>
                <Icon className={`w-5 h-5 ${iconTextColors[iconColor]}`} />
              </div>
            )}
            
            {/* Texto */}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-gray-900 mb-1">{title}</h1>
              {description && (
                <p className="text-sm text-gray-600">{description}</p>
              )}
              
              {/* Badges/Counters */}
              {badges.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {badges.map((badge, index) => (
                    <div
                      key={index}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold ${badgeVariants[badge.variant || 'default']}`}
                    >
                      <span className="text-xs opacity-75">{badge.label}</span>
                      <span className="text-base">{badge.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Lado derecho: Acciones */}
          {actions && (
            <div className="flex items-center gap-2 flex-shrink-0">
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
