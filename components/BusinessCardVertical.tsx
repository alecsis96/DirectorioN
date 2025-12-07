'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import type { Business, BusinessPreview } from '../types/business';
import { useFavorites } from '../context/FavoritesContext';
import { trackCTA } from '../lib/telemetry';

type CardBusiness = BusinessPreview | Business;

type Props = {
  business: CardBusiness;
  onViewDetails?: (business: CardBusiness) => void;
};

const BusinessCardVertical: React.FC<Props> = ({ business, onViewDetails }) => {
  const router = useRouter();
  const businessId = typeof (business as any).id === 'string' ? (business as any).id : undefined;
  const { favorites, addFavorite, removeFavorite } = useFavorites();
  const isFavorite = businessId ? favorites.includes(businessId) : false;
  const plan = (business as any).plan || 'free';
  const isPremium = plan !== 'free';

  // Imagen de portada
  const coverUrl = (business as any).coverUrl || (business as any).image1 || '/images/default-premium-cover.svg';
  
  // Logo
  const logoUrl = (business as any).logoUrl || '/images/default-premium-logo.svg';

  // WhatsApp y teléfono
  const whatsappHref = business.WhatsApp ? `https://wa.me/${business.WhatsApp.replace(/\D/g, '')}` : '';
  const callHref = business.phone ? `tel:${business.phone.replace(/\D/g, '')}` : null;
  
  // Determinar estilo según el plan
  const cardStyles = {
    sponsor: {
      borderGradient: 'bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500',
      badge: {
        text: '👑 SPONSOR',
        style: 'bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 text-white',
      },
    },
    featured: {
      borderGradient: 'bg-gradient-to-r from-amber-400 via-orange-400 to-amber-400',
      badge: {
        text: '🔥 PATROCINADO',
        style: 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white',
      },
    },
    free: {
      borderGradient: 'bg-gray-200',
      badge: null,
    },
  };

  const currentStyle = cardStyles[plan as keyof typeof cardStyles] || cardStyles.free;

  const handleCardClick = () => {
    if (businessId) {
      router.push(`/negocios/${businessId}`);
    }
  };

  const handleFavoriteToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    console.log('[BusinessCardVertical] Favorite clicked!', { businessId, isFavorite });
    if (!businessId) return;
    
    if (isFavorite) {
      removeFavorite(businessId);
    } else {
      addFavorite(businessId);
    }
  };

  return (
    <article
      className={`block relative rounded-2xl transition-all hover:scale-[1.02] hover:shadow-2xl overflow-hidden ${isPremium ? 'p-[4px]' : 'p-[1px]'} ${currentStyle.borderGradient}`}
    >
      {/* Contenedor interior */}
      <div className="relative bg-white rounded-xl overflow-hidden flex flex-col h-full">
        {/* Badge de plan */}
        {currentStyle.badge && (
          <div className="absolute top-3 right-3 z-10">
            <span className={`${currentStyle.badge.style} px-3 py-1 rounded-full text-[10px] font-extrabold tracking-wide uppercase shadow-lg`}>
              {currentStyle.badge.text}
            </span>
          </div>
        )}

        {/* Imagen de portada - SOLO para PATROCINADO */}
        {plan === 'sponsor' && (
          <div 
            onClick={handleCardClick}
            className="h-40 w-full overflow-hidden bg-gray-100 border-b border-gray-200 cursor-pointer"
          >
            <img 
              src={coverUrl}
              alt={`Imagen de ${business.name}`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </div>
        )}

        {/* Contenido */}
        <div className="p-4 flex flex-col flex-grow">
          {/* Header con Logo y Nombre */}
          <div className="flex items-start justify-between gap-3 mb-3 relative">
            <div className="flex items-center gap-3 min-w-0 flex-1 pr-12">
              <img 
                onClick={handleCardClick}
                src={logoUrl}
                alt={`Logo de ${business.name}`}
                className={`${plan === 'sponsor' ? 'w-10 h-10' : 'w-16 h-16'} rounded-full object-cover border-2 border-gray-200 flex-shrink-0 cursor-pointer`}
              />
              <h3 
                onClick={handleCardClick}
                className="text-lg font-bold text-gray-900 hover:text-purple-600 transition truncate cursor-pointer"
              >
                {business.name}
              </h3>
            </div>
            {/* Botón de favoritos - ABSOLUTAMENTE POSICIONADO */}
            <div className="absolute top-0 right-0 w-12 h-12" style={{ zIndex: 99999, pointerEvents: 'auto' }}>
              <button
                onClickCapture={handleFavoriteToggle}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                aria-label={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                className={`w-full h-full flex items-center justify-center rounded-full text-2xl transition-colors touch-manipulation ${
                  isFavorite ? 'text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100' : 'text-gray-400 hover:text-red-400 bg-gray-50 hover:bg-gray-100'
                }`}
              >
                {isFavorite ? '♥' : '♡'}
              </button>
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-3">
            {business.category && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded-full">
                📂 {business.category}
              </span>
            )}
            {business.rating && business.rating > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">
                ⭐ {business.rating.toFixed(1)}
              </span>
            )}
            {business.hasDelivery && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-800 text-xs font-semibold rounded-full">
                🚚 Delivery
              </span>
            )}
          </div>

          {/* Dirección */}
          {business.address && (
            <p className="text-sm text-gray-600 line-clamp-2 mb-4 flex-grow">
              📍 {business.address}
            </p>
          )}

          {/* Botones de acción */}
          <div className="flex flex-col gap-2 mt-auto">
            <button
              type="button"
              onClick={handleCardClick}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-3 rounded-lg font-bold text-sm hover:from-purple-700 hover:to-pink-700 transition shadow-md text-center"
            >
              Ver Detalles
            </button>
            <div className="grid grid-cols-3 gap-2">
              {whatsappHref && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    window.open(whatsappHref, '_blank');
                    trackCTA('whatsapp', businessId || '', business.name);
                  }}
                  className="border-2 border-emerald-500 text-emerald-600 bg-transparent px-3 py-2 rounded-lg text-xs font-semibold hover:bg-emerald-50 transition flex items-center justify-center gap-1"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  <span className="hidden sm:inline">WhatsApp</span>
                </button>
              )}
              {callHref && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    window.location.href = callHref;
                    trackCTA('call', businessId || '', business.name);
                  }}
                  className="border-2 border-blue-500 text-blue-600 bg-transparent px-3 py-2 rounded-lg text-xs font-semibold hover:bg-blue-50 transition flex items-center justify-center gap-1"
                >
                  📞 <span className="hidden sm:inline">Llamar</span>
                </button>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.address || business.name)}`, '_blank');
                  trackCTA('maps', businessId || '', business.name);
                }}
                className="border-2 border-orange-500 text-orange-600 bg-transparent px-3 py-2 rounded-lg text-xs font-semibold hover:bg-orange-50 transition flex items-center justify-center gap-1"
              >
                🗺️ <span className="hidden sm:inline">Mapa</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};

export default React.memo(BusinessCardVertical);
