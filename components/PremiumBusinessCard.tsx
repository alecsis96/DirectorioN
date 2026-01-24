'use client';

import { useFavorites } from '../context/FavoritesContext';
import type { BusinessPreview } from '../types/business';

interface PremiumBusinessCardProps {
  business: BusinessPreview;
  onViewDetails: (business: BusinessPreview) => void;
  variant?: 'sponsor' | 'featured';
}

/**
 * PremiumBusinessCard - Tarjeta premium con imagen/portada grande
 * Diseño único para negocios patrocinados y destacados
 * Incluye: portada grande, logo, badges, acciones (WhatsApp, llamar, ubicación)
 */
export default function PremiumBusinessCard({ 
  business, 
  onViewDetails,
  variant = 'sponsor'
}: PremiumBusinessCardProps) {
  const { favorites, addFavorite, removeFavorite } = useFavorites();
  const isFavorite = favorites.includes(business.id);

  // Configuración de estilos según variante
  const styles = {
    sponsor: {
      borderGradient: 'bg-gradient-to-br from-purple-600 via-pink-500 to-red-500',
      badgeBg: 'bg-gradient-to-r from-purple-600 to-pink-600',
      badgeText: '👑 PATROCINADO',
      categoryBg: 'bg-purple-100 text-purple-800',
      buttonBg: 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700',
      titleHover: 'group-hover:text-purple-600',
      shadow: 'hover:shadow-purple-500/50'
    },
    featured: {
      borderGradient: 'bg-gradient-to-br from-blue-500 via-cyan-500 to-blue-500',
      badgeBg: 'bg-gradient-to-r from-blue-500 to-cyan-500',
      badgeText: '⭐ DESTACADO',
      categoryBg: 'bg-blue-100 text-blue-800',
      buttonBg: 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700',
      titleHover: 'group-hover:text-blue-600',
      shadow: 'hover:shadow-blue-500/50'
    }
  };

  const currentStyle = styles[variant];

  const handleFavoriteToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFavorite) {
      removeFavorite(business.id);
    } else {
      addFavorite(business.id);
    }
  };

  return (
    <div
      className={`
        group relative overflow-hidden rounded-2xl 
        ${currentStyle.borderGradient}
        p-1 shadow-2xl ${currentStyle.shadow} transition-all duration-300
        w-[85%] md:w-auto
        flex-shrink-0 md:flex-shrink
        snap-center md:snap-align-none
      `}
    >
      <div className="bg-white rounded-[14px] p-5 h-full">
        {/* Badge Premium */}
        <div className={`absolute top-3 right-3 z-10 ${currentStyle.badgeBg} text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1`}>
          {currentStyle.badgeText}
        </div>
        
        <div className="flex flex-col h-full">
          {/* PORTADA/COVER - Imagen grande distintiva */}
          <div className="mb-4 h-40 w-full overflow-hidden rounded-lg bg-gray-100 border border-gray-200 shadow-xl">
            <img 
              src={
                business.coverUrl ||
                business.image1 ||
                '/images/default-premium-cover.svg'
              }
              alt={`Imagen principal de ${business.name}`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </div>

          {/* Header: Logo + Nombre + Favorito */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3 min-w-0">
              <img 
                src={
                  business.logoUrl ||
                  business.image1 ||
                  '/images/default-premium-logo.svg'
                }
                alt={`Logo de ${business.name}`}
                className="w-10 h-10 rounded-full object-cover border-2 border-gray-200 flex-shrink-0"
              />
              <h3 className={`text-xl font-bold text-gray-900 pr-2 ${currentStyle.titleHover} transition truncate`}>
                {business.name}
              </h3>
            </div>
            <button
              onClick={handleFavoriteToggle}
              aria-label={isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
              className={`text-2xl transition-colors flex-shrink-0 ${ 
                isFavorite ? 'text-red-500' : 'text-red-400 hover:text-red-500'
              }`}
            >
              {isFavorite ? '♥' : '♡'}
            </button>
          </div>

          <div className="mb-4 flex-grow">
            {/* Tags: Categoria, Rating, Delivery */}
            <div className="flex flex-wrap gap-2 mb-3">
              <span className={`inline-flex items-center gap-1 px-2 py-1 ${currentStyle.categoryBg} text-xs font-semibold rounded-full`}>
                📂 {business.category}
              </span>
              {business.rating && business.rating > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">
                  ⭐ {business.rating.toFixed(1)}
                </span>
              )}
              {business.hasEnvio && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-800 text-xs font-semibold rounded-full">
                  🚚 Envío
                </span>
              )}
            </div>
            {business.address && (
              <p className="text-sm text-gray-600 line-clamp-2">
                📍 {business.address}
              </p>
            )}
          </div>

          {/* Botones de acción */}
          <div className="flex flex-col gap-2">
            <button
              onClick={() => onViewDetails(business)}
              className={`w-full ${currentStyle.buttonBg} text-white px-4 py-3 rounded-lg font-bold text-sm transition shadow-md`}
            >
              Ver Detalles
            </button>
            <div className="grid grid-cols-3 gap-2">
              {business.WhatsApp && (
                <a
                  href={`https://wa.me/${business.WhatsApp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border-2 border-green-500 text-green-600 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-green-50 transition bg-transparent flex items-center justify-center gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  WhatsApp
                </a>
              )}
              {business.phone && (
                <a
                  href={`tel:${business.phone.replace(/\D/g, '')}`}
                  className="border-2 border-blue-500 text-blue-600 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-blue-50 transition bg-transparent flex items-center justify-center gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  📞 Llamar
                </a>
              )}
              {(business.location?.lat && business.location?.lng) && (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${business.location.lat},${business.location.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border-2 border-orange-500 text-orange-600 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-orange-50 transition bg-transparent flex items-center justify-center gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Como llegar
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
