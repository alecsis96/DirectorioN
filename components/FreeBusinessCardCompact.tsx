/**
 * FreeBusinessCardCompact - DEPRECATED / NO SE USA
 * ==================================================
 * Este componente fue eliminado del proyecto el 2026-01-24 como parte de la
 * unificación de diseño de tarjetas.
 * 
 * MOTIVO DEL DEPRECATION:
 * - Causaba inconsistencia visual: diferentes cards al buscar/filtrar vs vista normal
 * - Lógica duplicada con BusinessCard
 * - BusinessCard ya maneja todos los planes con estilos diferenciados internamente
 * 
 * REEMPLAZO:
 * - Usar BusinessCard para TODOS los planes (sponsor, featured, free)
 * - BusinessCard aplica automáticamente los estilos según business.plan
 * 
 * ESTE ARCHIVO SE MANTIENE SOLO COMO REFERENCIA HISTÓRICA
 * NO IMPORTAR NI USAR EN CÓDIGO NUEVO
 */

'use client';

import { useFavorites } from '../context/FavoritesContext';
import { getBusinessStatus } from './BusinessHours';
import type { BusinessPreview } from '../types/business';

interface FreeBusinessCardCompactProps {
  business: BusinessPreview;
  onViewDetails: (business: BusinessPreview) => void;
}

/**
 * Tarjeta compacta para negocios gratuitos - Optimizada para móvil
 * Diseño más pequeño y enfocado en la acción (WhatsApp)
 */
export default function FreeBusinessCardCompact({ business, onViewDetails }: FreeBusinessCardCompactProps) {
  const { favorites, addFavorite, removeFavorite } = useFavorites();
  const isFavorite = favorites.includes(business.id);
  
  // Calcular estado del negocio
  const now = new Date();
  const status = business.hours ? getBusinessStatus(business.hours, now) : { isOpen: false };
  const isOpen = status.isOpen;

  // Verificar si es un plan premium para mostrar el logo
  const isPremium = business.plan === 'destacado' || business.plan === 'patrocinado';

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow p-4">
      <div className="flex gap-3">
        {/* Logo o placeholder - SOLO para planes destacado/patrocinado */}
        {isPremium && (
          <div className="flex-shrink-0">
            {business.logoUrl || business.image1 ? (
              <img
                src={business.logoUrl || business.image1 || ''}
                alt={business.name}
                className="w-16 h-16 rounded-lg object-cover border border-gray-200"
              />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center border border-gray-200">
                <span className="text-2xl">🏪</span>
              </div>
            )}
          </div>
        )}

        {/* Contenido principal */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          {/* Header */}
          <div>
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="text-base font-bold text-gray-900 truncate flex-1">
                {business.name}
              </h3>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (isFavorite) removeFavorite(business.id);
                  else addFavorite(business.id);
                }}
                aria-label={isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
                className={`flex-shrink-0 text-xl transition-colors ${
                  isFavorite ? 'text-red-500' : 'text-gray-400 hover:text-red-500'
                }`}
              >
                {isFavorite ? '♥' : '♡'}
              </button>
            </div>

            {/* Categoría y Estado */}
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {business.category && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                  📂 {business.category}
                </span>
              )}
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  isOpen
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {isOpen ? '● Abierto' : '● Cerrado'}
              </span>
              {business.rating && business.rating > 0 && (
                <span className="text-xs text-yellow-600 font-semibold">
                  ⭐ {business.rating.toFixed(1)}
                </span>
              )}
            </div>

            {/* Dirección compacta */}
            {business.address && (
              <p className="text-xs text-gray-600 truncate">
                📍 {business.address}
              </p>
            )}
          </div>

          {/* Botones de acción compactos */}
          <div className="flex gap-2 mt-2">
            {/* WhatsApp - CTA principal */}
            {business.WhatsApp && (
              <a
                href={`https://wa.me/${business.WhatsApp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex-1 bg-green-500 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-green-600 transition flex items-center justify-center gap-1.5"
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                <span className="hidden xs:inline">WhatsApp</span>
                <span className="xs:hidden">Chat</span>
              </a>
            )}

            {/* Botones secundarios - iconos más pequeños */}
            <div className="flex gap-1.5">
              {business.phone && (
                <a
                  href={`tel:${business.phone.replace(/\D/g, '')}`}
                  onClick={(e) => e.stopPropagation()}
                  className="w-10 h-10 flex items-center justify-center border-2 border-blue-500 text-blue-600 rounded-lg hover:bg-blue-50 transition"
                  aria-label="Llamar"
                >
                  <span className="text-lg">📞</span>
                </a>
              )}
              {business.location?.lat && business.location?.lng && (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${business.location.lat},${business.location.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="w-10 h-10 flex items-center justify-center border-2 border-orange-500 text-orange-600 rounded-lg hover:bg-orange-50 transition"
                  aria-label="Cómo llegar"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </a>
              )}
              <button
                onClick={() => onViewDetails(business)}
                className="w-10 h-10 flex items-center justify-center border-2 border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition"
                aria-label="Ver detalles"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
