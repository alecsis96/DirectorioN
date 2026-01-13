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
  const coverUrl = (business as any).coverUrl || (business as any).image1 || '/images/default-premium-cover.svg';  // Logo
  const logoUrl = (business as any).logoUrl || '/images/default-premium-logo.svg';

  // WhatsApp y teléfono
  const whatsappHref = business.WhatsApp ? `https://wa.me/${business.WhatsApp.replace(/\D/g, '')}` : '';
  const callHref = business.phone ? `tel:${business.phone.replace(/\D/g, '')}` : null;
  
  // Determinar estilo según el plan
  const cardStyles = {
    sponsor: {
      borderGradient: 'bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500',
      badge: {
        text: '👑 PATROCINADO',
        style: 'bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 text-white',
      },
    },
    featured: {
      borderGradient: 'bg-gradient-to-r from-amber-400 via-orange-400 to-amber-400',
      badge: {
        text: '🔥 DESTACADO',
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
    if (onViewDetails) {
      onViewDetails(business);
    } else if (businessId) {
      router.push(`/negocios/${businessId}`);
    }
  };

  return (
    <article
      className={`group relative overflow-hidden rounded-2xl ${
        plan === 'sponsor'
          ? 'bg-gradient-to-br from-purple-600 via-pink-500 to-red-500 p-1 shadow-2xl hover:shadow-purple-500/50'
          : plan === 'featured'
          ? 'bg-white border-2 border-blue-100 shadow-lg hover:shadow-blue-200/50 hover:-translate-y-1'
          : 'bg-white border border-gray-200 shadow-md hover:shadow-lg'
      } transition-all duration-300`}
    >
      <div className={`${plan === 'sponsor' ? 'bg-white rounded-[14px]' : ''} p-5 ${plan === 'featured' ? 'pt-8' : ''} h-full flex flex-col`}>
        {/* Badge de plan */}
        {plan === 'sponsor' && (
          <div className="absolute top-3 right-3 z-10 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
            <span>👑</span>
            PATROCINADO
          </div>
        )}
        {plan === 'featured' && (
          <div className="absolute top-0 right-0 z-10 bg-gradient-to-bl from-blue-500 to-cyan-500 text-white px-3 py-1.5 rounded-bl-xl text-[10px] font-bold tracking-wider uppercase shadow-sm">
            ✨ DESTACADO
          </div>
        )}

        <div className="flex flex-col h-full">
          {/* Imagen de portada - Solo para SPONSOR */}
          {plan === 'sponsor' && (
            <div className="mb-4 h-40 w-full overflow-hidden rounded-lg bg-gray-100 border border-gray-200 shadow-xl">
              <img 
                src={coverUrl}
                alt={`Imagen principal de ${business.name}`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
          )}

          {/* Header con Logo, Nombre y Botón de Favoritos */}
          <div className="flex items-start gap-3 mb-3">
            {plan === 'featured' ? (
              <>
                <img 
                  src={logoUrl}
                  alt={`Logo de ${business.name}`}
                  className="w-14 h-14 rounded-lg object-cover border border-gray-100 shadow-sm flex-shrink-0 bg-gray-50"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-gray-900 leading-snug group-hover:text-blue-600 transition line-clamp-2 mb-1">
                    {business.name}
                  </h3>
                  
                  {/* Rating Simplificado y Limpio (Solo Estrella + Número) */}
                  <div className="flex items-center gap-1.5 mt-1">
                    {business.rating && business.rating > 0 && (
                      <div className="flex items-center bg-yellow-50 px-2 py-0.5 rounded-md border border-yellow-100">
                        <span className="text-yellow-500 text-xs mr-1">★</span>
                        <span className="font-bold text-gray-800 text-xs leading-none pt-0.5">
                          {business.rating.toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3 min-w-0">
                <img 
                  src={logoUrl}
                  alt={`Logo de ${business.name}`}
                  className="w-10 h-10 rounded-full object-cover border-2 border-gray-200 flex-shrink-0"
                />
                <h3 className="text-xl font-bold text-gray-900 pr-2 group-hover:text-purple-600 transition truncate">
                  {business.name}
                </h3>
              </div>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (!businessId) return;
                if (isFavorite) {
                  removeFavorite(businessId);
                } else {
                  addFavorite(businessId);
                }
              }}
              aria-label={isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
              className={`text-2xl transition-colors flex-shrink-0 ${plan === 'featured' ? '-mt-1' : ''} ${ 
                isFavorite ? 'text-red-500' : plan === 'featured' ? 'text-gray-300 hover:text-red-500' : 'text-red-400 hover:text-red-500'
              }`}
            >
              {isFavorite ? '♥' : '♡'}
            </button>
          </div>

          <div className="mb-4 flex-grow">
            {plan === 'featured' ? (
              <div className="space-y-2">
                {/* Fila 1: Categoría y Delivery */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 font-medium">
                    📂 {business.category}
                  </span>
                  
                  {business.hasDelivery && (
                    <span className="px-2 py-0.5 rounded-md bg-orange-50 text-orange-700 font-medium flex items-center gap-1">
                      🚚 <span className="hidden sm:inline">Delivery</span>
                    </span>
                  )}
                </div>

                {/* Fila 2: Ubicación */}
                <div className="space-y-0.5">
                  {(business as any).colonia && (
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <span className="text-gray-400">📍</span> {(business as any).colonia}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* Tags: Categoria, Rating, Delivery */}
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded-full">
                    📂 {business.category}
                  </span>
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
                {business.address && (
                  <p className="text-sm text-gray-600 line-clamp-2">
                    📍 {business.address}
                  </p>
                )}
              </>
            )}
          </div>

          {/* Botones de acción */}
          <div className="flex flex-col gap-2">
            <button
              onClick={handleCardClick}
              className={`w-full px-4 rounded-lg font-bold text-sm transition shadow-md ${
                plan === 'featured'
                  ? 'py-2 bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200'
                  : 'py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white'
              }`}
            >
              Ver Detalles
            </button>
            <div className="grid grid-cols-3 gap-2">
              {whatsappHref && (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    e.stopPropagation();
                    trackCTA('whatsapp', businessId || '', business.name);
                  }}
                  className={`px-3 rounded-lg text-xs transition flex items-center justify-center gap-1 ${
                    plan === 'featured'
                      ? 'py-1.5 bg-green-50 text-green-700 border border-green-200 font-bold hover:bg-green-100'
                      : 'py-2 border-2 border-green-500 text-green-600 bg-transparent font-semibold hover:bg-green-50'
                  }`}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  {plan === 'featured' ? ' WhatsApp' : 'WhatsApp'}
                </a>
              )}
              {callHref && (
                <a
                  href={callHref}
                  onClick={(e) => {
                    e.stopPropagation();
                    trackCTA('call', businessId || '', business.name);
                  }}
                  className={`px-3 rounded-lg text-xs transition flex items-center justify-center gap-1 ${
                    plan === 'featured'
                      ? 'py-1.5 bg-gray-50 text-gray-700 border border-gray-200 font-bold hover:bg-gray-100'
                      : 'py-2 border-2 border-blue-500 text-blue-600 bg-transparent font-semibold hover:bg-blue-50'
                  }`}
                >
                  {plan === 'featured' ? <span>📞</span> : '📞'} Llamar
                </a>
              )}
              {(business as any).location?.lat && (business as any).location?.lng ? (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${(business as any).location.lat},${(business as any).location.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    e.stopPropagation();
                    trackCTA('maps', businessId || '', business.name);
                  }}
                  className={`px-3 rounded-lg text-xs transition flex items-center justify-center gap-1 ${
                    plan === 'featured'
                      ? 'py-1.5 bg-amber-50 text-amber-700 border border-amber-200 font-bold hover:bg-amber-100'
                      : 'py-2 border-2 border-orange-500 text-orange-600 bg-transparent font-semibold hover:bg-orange-50'
                  }`}
                >
                  <svg className={`${plan === 'featured' ? 'w-3 h-3' : 'w-4 h-4'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Como llegar
                </a>
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.address || business.name)}`, '_blank');
                    trackCTA('maps', businessId || '', business.name);
                  }}
                  className={`px-3 rounded-lg text-xs transition flex items-center justify-center gap-1 ${
                    plan === 'featured'
                      ? 'py-1.5 bg-amber-50 text-amber-700 border border-amber-200 font-bold hover:bg-amber-100'
                      : 'py-2 border-2 border-orange-500 text-orange-600 bg-transparent font-semibold hover:bg-orange-50'
                  }`}
                >
                  <svg className={`${plan === 'featured' ? 'w-3 h-3' : 'w-4 h-4'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Como llegar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};

export default React.memo(BusinessCardVertical);
