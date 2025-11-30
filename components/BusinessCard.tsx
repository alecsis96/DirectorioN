'use client';

import Link from "next/link";
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
  const businessId = typeof (business as any).id === "string" ? (business as any).id : undefined;
  const ratingValue = Number.isFinite(Number(business.rating)) ? Number(business.rating) : 0;
  const [isOpen, setIsOpen] = useState(business.isOpen === "si");
  const [hoursLabel, setHoursLabel] = useState<string>(() => business.hours ? "Actualizando horario..." : "Horario no disponible");
  const addressText = business.address || "Sin direccion";
  const mapsHref = mapsLink(undefined, undefined, business.address || business.name);
  const callHref = business.phone ? `tel:${normalizeDigits(business.phone)}` : null;
  const whatsappHref = business.WhatsApp ? waLink(business.WhatsApp) : "";
  const { favorites, addFavorite, removeFavorite } = useFavorites();
  const isFavorite = businessId ? favorites.includes(businessId) : false;
  
  const plan = (business as any).plan || 'free';
  const isPremium = plan !== 'free';
  // Imagen de logo/negocio - priorizar logoUrl sobre image1, usar placeholder premium si aplica
  const logoUrl =
    (business as any).logoUrl ||
    (business as any).image1 ||
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
    if (onViewDetails) {
      e.preventDefault();
      trackBusinessInteraction(
        'business_card_clicked',
        businessId || '',
        business.name,
        business.category
      );
      onViewDetails(business);
    }
  };

  // Determinar estilo según el plan
  const cardStyles = {
    sponsor: {
      border: 'border-amber-400 border-[3px]',
      bg: 'bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50',
      shadow: 'shadow-2xl shadow-amber-200 hover:shadow-amber-400/50',
      badge: { 
        text: '💎 PATROCINADO', 
        style: 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white animate-pulse',
        glow: 'shadow-lg shadow-amber-300'
      },
      titleColor: 'text-amber-900',
      ring: 'ring-4 ring-amber-500 ring-offset-2'
    },
    featured: {
      border: 'border-blue-500 border-[4px]',
      bg: 'bg-white',
      shadow: 'shadow-xl shadow-blue-300 hover:shadow-blue-500/50',
      badge: { 
        text: '✨ DESTACADO', 
        style: 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white',
        glow: 'shadow-md shadow-blue-400'
      },
      titleColor: 'text-blue-900',
      ring: 'ring-2 ring-blue-300 ring-offset-2'
    },
    free: {
      border: 'border-gray-100 border',
      bg: 'bg-white',
      shadow: 'shadow-none',
      badge: null,
      titleColor: 'text-gray-800',
      ring: ''
    }
  };

  const currentStyle = cardStyles[plan as keyof typeof cardStyles] || cardStyles.free;

  return (
    <article className={`relative ${currentStyle.bg} border ${currentStyle.border} rounded-2xl ${currentStyle.shadow} ${currentStyle.ring} p-4 flex flex-row items-start gap-4 transition-all hover:scale-[1.01] hover:shadow-2xl overflow-hidden`} suppressHydrationWarning>
      {/* Efecto de brillo para premium */}
      {plan !== 'free' && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-10 pointer-events-none" />
      )}
      
      {/* COLUMNA IZQUIERDA: Logo - SOLO para planes premium */}
      {plan !== 'free' && (
        <div className="flex-shrink-0 relative z-10" suppressHydrationWarning>
          <img 
            src={logoUrl} 
            alt={`Logo de ${business.name}`}
            className="w-20 h-20 rounded-xl object-cover border-2 border-gray-200 shadow-sm"
          />
        </div>
      )}
      
      {/* COLUMNA DERECHA: Contenido */}
      <div className="flex-1 min-w-0 flex flex-col gap-2.5 relative z-10" suppressHydrationWarning>
        {/* Badge de plan */}
        {currentStyle.badge && (
          <div className="inline-flex self-start">
            <span className={`${currentStyle.badge.style} ${currentStyle.badge.glow} px-3 py-1 rounded-full text-[10px] font-extrabold tracking-wide uppercase`}>
              {currentStyle.badge.text}
            </span>
          </div>
        )}
        
        {/* Header con título, favorito y rating */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <Link
              prefetch={false}
              href={`/negocios/${business.id ?? ""}`}
              onClick={handleClick}
              className={`text-lg font-bold ${currentStyle.titleColor} hover:text-[#38761D] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#38761D] block transition-colors line-clamp-1`}
            >
              {business.name}
            </Link>
            <p className="text-[10px] text-gray-500 mt-0.5">Tap para ver detalles</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              aria-label={isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
              onClick={() => {
                if (!businessId) return;
                if (isFavorite) {
                  removeFavorite(businessId);
                } else {
                  addFavorite(businessId);
                }
              }}
              className={`rounded-full p-1.5 text-base font-semibold transition ${
                isFavorite ? "text-red-500 hover:text-red-600" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {isFavorite ? "♥" : "♡"}
            </button>
          </div>
        </div>
        
        {/* Rating prominente */}
        {ratingValue > 0 && (
          <div className="flex items-center gap-1.5">
            <Star className="w-5 h-5 fill-yellow-500 text-yellow-500" />
            <span className="text-xl font-bold text-yellow-600" aria-label={`Calificacion ${ratingValue.toFixed(1)} de 5`}>
              {ratingValue.toFixed(1)}
            </span>
            {(business as any).reviewCount > 0 && (
              <span className="text-xs text-gray-500 ml-1">
                ({(business as any).reviewCount} {(business as any).reviewCount === 1 ? 'reseña' : 'reseñas'})
              </span>
            )}
          </div>
        )}
        
        {/* Tags y estado */}
        <div className="flex flex-wrap gap-1.5 text-xs text-gray-600">
          {business.category && <span className="bg-gray-100 px-2.5 py-0.5 rounded-full">{business.category}</span>}
          {business.colonia && <span className="bg-gray-100 px-2.5 py-0.5 rounded-full">{business.colonia}</span>}
          <span
            className={`px-2.5 py-0.5 rounded-full font-semibold ${isOpen ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
            aria-live="polite"
          >
            {isOpen ? "Abierto" : "Cerrado"}
          </span>
          {business.hasDelivery && (
            <span className="bg-orange-100 text-orange-700 px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
              🚚 Delivery
            </span>
          )}

          {/* NUEVO: Rango de Precios (Solo para planes de pago) */}
          {plan !== 'free' && (business as any).priceRange && (
            <span className="bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
              💰 {(business as any).priceRange}
            </span>
          )}
        </div>

        {/* Ubicación */}
        <p className="text-xs text-gray-700 flex items-center gap-1.5 line-clamp-1" aria-label={`Direccion ${addressText}`}>
          <MapPin className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
          <span className="truncate">{addressText}</span>
        </p>
        
        {/* Horario */}
        <p className="text-xs text-gray-500">
          <span className="font-semibold">Horario:</span> {hoursLabel}
        </p>

        {/* Botones de acción - JERARQUÍA VISUAL */}
        <div className="flex flex-wrap gap-2 text-xs font-semibold mt-1">
          {whatsappHref && (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition shadow-sm"
              aria-label={`Enviar mensaje por WhatsApp a ${business.name}`}
              onClick={() => {
                trackCTA('whatsapp', businessId || '', business.name);
              }}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                    </svg>
              WhatsApp
            </a>
          )}
          {callHref && (
            <a
              href={callHref}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
              aria-label={`Llamar a ${business.name}`}
              onClick={() => {
                trackCTA('call', businessId || '', business.name);
              }}
            >
              <Phone className="w-3.5 h-3.5" />
              Llamar
            </a>
          )}
          <a
            href={mapsHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
            aria-label="Como llegar en Google Maps"
            onClick={() => {
              trackCTA('maps', businessId || '', business.name);
            }}
          >
            <Map className="w-3.5 h-3.5" />
            Como llegar
          </a>
        </div>
      </div>
    </article>
  );
};

export default React.memo(BusinessCard);
