'use client';

import React, { useEffect, useState } from "react";
import { Star, MapPin, Phone, Map } from "lucide-react";
import { mapsLink, normalizeDigits, waLink } from "../lib/helpers/contact";
import { trackCTA, trackBusinessInteraction } from "../lib/telemetry";
import type { Business, BusinessPreview } from "../types/business";
import { getBusinessStatus } from "./BusinessHours";
import { useFavorites } from "../context/FavoritesContext";

type CardBusiness = BusinessPreview | Business;

type Props = {
  business: CardBusiness;
  onViewDetails?: (business: CardBusiness) => void;
};

const BusinessCard: React.FC<Props> = ({ business, onViewDetails }) => {
  // Type-safe extraction de propiedades - asegurar que business.id siempre esté disponible
  const businessId = business?.id || (business as any)?.businessId || undefined;
  
  const ratingValue = Number.isFinite(Number(business.rating)) ? Number(business.rating) : 0;
  const [isOpen, setIsOpen] = useState(business.isOpen === "si");
  const [hoursLabel, setHoursLabel] = useState<string>(() => business.hours ? "Actualizando horario..." : "Horario no disponible");
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);
  const addressText = business.address || "Sin direccion";
  const mapsHref = mapsLink(undefined, undefined, business.address || business.name);
  const callHref = business.phone ? `tel:${normalizeDigits(business.phone)}` : null;
  const whatsappHref = business.WhatsApp ? waLink(business.WhatsApp) : "";
  const { favorites, addFavorite, removeFavorite } = useFavorites();
  const isFavorite = businessId ? favorites.includes(businessId) : false;
  
  // Type-safe extraction con verificación de propiedad
  const plan = ('plan' in business && typeof business.plan === 'string' ? business.plan : 'free') as 'free' | 'featured' | 'sponsor';
  const isPremium = plan !== 'free';
  
  // Verificar si es negocio nuevo (< 30 días)
  const isNew = (() => {
    const created = (business as any).createdAt;
    if (!created) return false;
    const createdDate = created.toDate ? created.toDate() : new Date(created);
    const daysDiff = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff <= 30;
  })();
  
  // v2: Helper para obtener banner/cover (premium only)
  const getBannerUrl = (biz: CardBusiness): string | null => {
    if (plan === 'free') return null;
    return ('coverUrl' in biz && typeof biz.coverUrl === 'string' ? biz.coverUrl : null) || null;
  };
  
  const bannerUrl = getBannerUrl(business);
  
  // Imagen de logo/negocio - priorizar logoUrl sobre image1, usar placeholder premium si aplica
  const logoUrl =
    ('logoUrl' in business && typeof business.logoUrl === 'string' ? business.logoUrl : null) ||
    ('image1' in business && typeof business.image1 === 'string' ? business.image1 : null) ||
    (isPremium
      ? '/images/default-premium-logo.svg'
      : 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80"%3E%3Crect fill="%23f0f0f0" width="80" height="80"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14" fill="%23999"%3ELogo%3C/text%3E%3C/svg%3E');

  useEffect(() => {
    const schedule = business.hours;
    if (!schedule) {
      setHoursLabel("Horario no disponible");
      return;
    }
    const updateStatus = () => {
      const status = getBusinessStatus(schedule);
      setIsOpen(status.isOpen);
      if (status.isOpen && status.closesAt) {
        setHoursLabel(`Cierra a las ${status.closesAt}`);
      } else if (!status.isOpen && status.opensAt) {
        setHoursLabel(`Abre ${status.opensAt}`);
      } else {
        setHoursLabel("Horario disponible");
      }
    };
    updateStatus();
    const timer = setInterval(updateStatus, 60_000);
    return () => clearInterval(timer);
  }, [business.hours]);

  const handleClick = (e: React.MouseEvent) => {
    // v2: Solo manejar click explícito en botón "Ver detalles", no en todo el card
    if (onViewDetails) {
      trackBusinessInteraction(
        'business_card_clicked',
        businessId || '',
        business.name,
        business.category
      );
      onViewDetails(business);
    }
  };

  const handleFavoriteToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!businessId || isTogglingFavorite) {
      console.log('[BusinessCard] Favorite toggle blocked:', { businessId, isTogglingFavorite });
      return;
    }

    console.log('[BusinessCard] Toggle favorite:', businessId, 'isFavorite:', isFavorite);
    setIsTogglingFavorite(true);

    try {
      if (isFavorite) {
        removeFavorite(businessId);
      } else {
        addFavorite(businessId);
      }
      
      // Pequeño delay para feedback visual
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error('[BusinessCard] Error toggling favorite:', error);
    } finally {
      setIsTogglingFavorite(false);
    }
  };

  // Mapeo de categorías a iconos/emojis
  const getCategoryIcon = (category: string | undefined): string => {
    if (!category) return '🏢';
    
    const categoryIcons: Record<string, string> = {
      'Restaurante': '🍽️',
      'Comida Rápida': '🍔',
      'Cafetería': '☕',
      'Bar': '🍺',
      'Panadería': '🥖',
      'Supermercado': '🛒',
      'Tienda': '🏪',
      'Ropa': '👔',
      'Zapatos': '👞',
      'Joyería': '💍',
      'Electrónica': '📱',
      'Ferretería': '🔨',
      'Farmacia': '💊',
      'Hospital': '🏥',
      'Clínica': '⚕️',
      'Dentista': '🦷',
      'Gimnasio': '💪',
      'Spa': '💆',
      'Salón de Belleza': '💇',
      'Barbería': '💈',
      'Taller': '🔧',
      'Mecánico': '🚗',
      'Gasolinera': '⛽',
      'Hotel': '🏨',
      'Educación': '📚',
      'Escuela': '🎓',
      'Librería': '📖',
      'Papelería': '📝',
      'Floristería': '💐',
      'Mascotas': '🐾',
      'Veterinaria': '🐕',
      'Banco': '🏦',
      'Seguros': '🛡️',
      'Inmobiliaria': '🏠',
      'Construcción': '🏗️',
      'Lavandería': '🧺',
      'Fotografía': '📷',
      'Imprenta': '🖨️',
      'Transporte': '🚚',
      'Turismo': '✈️',
      'Entretenimiento': '🎭',
      'Cine': '🎬',
      'Deportes': '⚽',
      'Música': '🎵',
      'Arte': '🎨',
      'Otro': '🏢'
    };

    return categoryIcons[category] || '🏢';
  };

  // Determinar estilo según el plan
  const cardStyles = {
    sponsor: {
      border: 'border-[3px]',
      borderGradient: 'bg-gradient-to-r from-yellow-500 via-pink-500 to-red-500',
      bg: 'bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50',
      shadow: 'shadow-xl shadow-purple-200 hover:shadow-purple-400/50',
      badge: { 
        text: '👑 PATROCINADO', 
        style: 'bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 text-white animate-pulse',
        glow: 'shadow-lg shadow-purple-300'
      },
      titleColor: 'text-purple-900',
      ring: 'ring-4 ring-purple-500 ring-offset-2'
    },
    featured: {
      border: 'border-[3px]',
      borderGradient: 'bg-gradient-to-r from-amber-400 via-orange-400 to-amber-400',
      bg: 'bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50',
      shadow: 'shadow-xl shadow-amber-300 hover:shadow-amber-500/50',
      badge: { 
        text: '🔥 DESTACADO', 
        style: 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white',
        glow: 'shadow-md shadow-amber-400'
      },
      titleColor: 'text-amber-900',
      ring: 'ring-2 ring-amber-300 ring-offset-2'
    },
    free: {
      border: 'border',
      borderGradient: 'bg-gray-100',
      bg: 'bg-white',
      shadow: 'shadow-none',
      badge: null,
      titleColor: 'text-gray-800',
      ring: ''
    }
  };

  const currentStyle = cardStyles[plan as keyof typeof cardStyles] || cardStyles.free;

  return (
    <article 
      className={`relative rounded-2xl transition-all hover:scale-[1.01] hover:shadow-2xl overflow-hidden ${plan !== 'free' ? 'border-2' : 'border'} ${plan === 'sponsor' ? 'border-purple-400' : plan === 'featured' ? 'border-amber-400' : 'border-gray-200'} bg-white`}
    >
      {/* v2: Banner superior (120px fijos) - SOLO patrocinados (tienen coverUrl) */}
      {plan === 'sponsor' && (
        <div className="relative h-30 w-full overflow-hidden">
          <img 
            src={bannerUrl || '/images/default-premium-cover.svg'} 
            alt="" 
            className="w-full h-30 object-cover object-center"
          />
          {/* v2: Badge dentro del banner */}
          {currentStyle.badge && (
            <div className="absolute top-2 left-2">
              <span className={`${currentStyle.badge.style} ${currentStyle.badge.glow} px-3 py-1 rounded-full text-[10px] font-extrabold tracking-wide uppercase shadow-lg`}>
                {currentStyle.badge.text}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Botón de favoritos mejorado */}
      <button
        type="button"
        onClick={handleFavoriteToggle}
        disabled={isTogglingFavorite}
        className={`absolute ${plan === 'sponsor' ? 'top-32' : 'top-2'} right-2 w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-lg transition-all duration-200 cursor-pointer z-20 ${
          isTogglingFavorite ? 'scale-90 opacity-70' : 'hover:scale-110 active:scale-95'
        }`}
        aria-label={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
      >
        <span 
          className={`text-2xl transition-all duration-200 ${
            isFavorite ? 'text-red-500 animate-pulse' : 'text-gray-400'
          }`}
        >
          {isFavorite ? "♥" : "♡"}
        </span>
      </button>

      {/* v2: Contenido de la tarjeta */}
      <div 
        onClick={plan === 'free' ? handleClick : undefined}
        className="relative bg-white rounded-b-xl p-4 flex flex-col gap-3 ${plan === 'free' ? 'cursor-pointer' : ''}"
      >
          {/* Efecto de brillo para premium */}
          {plan !== 'free' && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-10 pointer-events-none" />
          )}
          
          {/* v2: FILA SUPERIOR: Logo/Avatar + Nombre + Info (Mobile-first) */}
          <div className="flex items-start gap-3 relative z-10">
            {/* v2: Logo/Avatar - Premium 48px mobile-first, Free mantiene 64px */}
            {plan !== 'free' ? (
              <div className="flex-shrink-0">
                <img 
                  src={logoUrl} 
                  alt={`Logo de ${business.name}`}
                  className="w-12 h-12 rounded-xl object-cover border-2 border-gray-200 shadow-sm"
                />
              </div>
            ) : (
              <div className="flex-shrink-0">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 border-2 border-gray-300 shadow-sm flex items-center justify-center text-2xl">
                  {getCategoryIcon(business.category)}
                </div>
              </div>
            )}
            
            {/* Contenido al lado del icono */}
            <div className="flex-1 min-w-0 flex flex-col gap-1">
              {/* v2: Badge NUEVO (no duplicar badge de plan que ahora está en banner) */}
              {isNew && (
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-gradient-to-r from-orange-500 to-red-500 text-white text-[9px] font-extrabold tracking-wide uppercase rounded-full shadow-md animate-pulse w-fit">
                  🆕 NUEVO
                </span>
              )}
              
              {/* v2: Badge de plan - free en header, featured también (sponsor en banner) */}
              {(plan === 'free' || plan === 'featured') && currentStyle.badge && (
                <span className={`${currentStyle.badge.style} ${currentStyle.badge.glow} px-2 py-0.5 rounded-full text-[9px] font-extrabold tracking-wide uppercase w-fit`}>
                  {currentStyle.badge.text}
                </span>
              )}
              
              {/* Nombre */}
              <h3 className={`text-base font-bold ${currentStyle.titleColor} hover:text-[#38761D] transition-colors line-clamp-1`}>
                {business.name}
              </h3>
              
              {/* Categoría y Colonia */}
              <div className="flex flex-wrap gap-1 text-xs text-gray-600">
                {business.category && <span className="bg-gray-100 px-2 py-0.5 rounded-full">{business.category}</span>}
                {business.colonia && <span className="bg-gray-100 px-2 py-0.5 rounded-full">{business.colonia}</span>}
              </div>
              
              {/* v2: Rating y Estado en línea - Ocultar métricas vacías */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* v2: Solo mostrar rating si existe y es > 0 */}
                {ratingValue > 0 && (
                  <div className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
                    <span className="text-sm font-bold text-yellow-600">
                      {ratingValue.toFixed(1)}
                    </span>
                    {/* v2: Solo mostrar reviewCount si existe y es > 0 */}
                    {'reviewCount' in business && typeof business.reviewCount === 'number' && business.reviewCount > 0 && (
                      <span className="text-xs text-gray-500">
                        ({business.reviewCount})
                      </span>
                    )}
                  </div>
                )}
                
                {/* v2: Estado siempre visible (información clave) */}
                <div className="flex items-center gap-1.5">
                  <span className={`px-2 py-0.5 rounded-full font-semibold text-xs ${isOpen ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {isOpen ? "🟢 Abierto" : "🔴 Cerrado"}
                  </span>
                  {hoursLabel !== "Horario no disponible" && (
                    <span className="text-xs text-gray-500">
                      {hoursLabel}
                    </span>
                  )}
                </div>
                
                {/* v2: Delivery badge solo si está activo */}
                {business.hasEnvio && (
                  <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 text-xs">
                    🚚 Envío
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {/* FILA INFERIOR: Dirección y Botones */}
          <div className="flex flex-col gap-2 relative z-10">
            {/* Ubicación */}
            <p className="text-xs text-gray-700 flex items-center gap-1.5 line-clamp-1">
              <MapPin className="w-3 h-3 text-gray-500 flex-shrink-0" />
              <span className="truncate">{addressText}</span>
            </p>

            {/* v2: CTA Principal - Ver detalles (solo premium, free usa onClick en contenedor) */}
            {plan !== 'free' && (
              <button
                onClick={handleClick}
                className="w-full py-3 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 transition-all shadow-md hover:shadow-lg active:scale-98"
              >
                Ver detalles
              </button>
            )}

            {/* v2: Botones de acción - Discretos para free, touch-friendly para premium */}
            <div className="flex flex-wrap gap-1.5 text-xs font-semibold">
              {whatsappHref && (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center justify-center gap-1 px-3 py-2.5 ${plan === 'free' ? 'min-h-[36px]' : 'min-h-[44px]'} rounded-lg ${plan === 'free' ? 'border border-gray-300 text-gray-700 hover:bg-gray-50' : 'border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50'} transition bg-transparent flex-1`}
                  aria-label={`Enviar mensaje por WhatsApp a ${business.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    trackCTA('whatsapp', businessId || '', business.name);
                  }}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  <span className="hidden sm:inline">WhatsApp</span>
                </a>
              )}
              {callHref && (
                <a
                  href={callHref}
                  className={`inline-flex items-center justify-center gap-1 px-3 py-2.5 ${plan === 'free' ? 'min-h-[36px]' : 'min-h-[44px]'} rounded-lg ${plan === 'free' ? 'border border-gray-300 text-gray-700 hover:bg-gray-50' : 'border-2 border-blue-500 text-blue-600 hover:bg-blue-50'} transition bg-transparent flex-1`}
                  aria-label={`Llamar a ${business.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    trackCTA('call', businessId || '', business.name);
                  }}
                >
                  <Phone className="w-4 h-4" />
                  <span className="hidden sm:inline">Llamar</span>
                </a>
              )}
              <a
                href={mapsHref}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center justify-center gap-1 px-3 py-2.5 ${plan === 'free' ? 'min-h-[36px]' : 'min-h-[44px]'} rounded-lg ${plan === 'free' ? 'border border-gray-300 text-gray-700 hover:bg-gray-50' : 'border-2 border-orange-500 text-orange-600 hover:bg-orange-50'} transition bg-transparent flex-1`}
                aria-label="Como llegar en Google Maps"
                onClick={(e) => {
                  e.stopPropagation();
                  trackCTA('maps', businessId || '', business.name);
                }}
              >
                <Map className="w-4 h-4" />
                <span className="hidden sm:inline">Cómo llegar</span>
              </a>
            </div>
          </div>
      </div>
      </article>
  );
};

export default React.memo(BusinessCard);
