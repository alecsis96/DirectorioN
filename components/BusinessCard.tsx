'use client';

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { Star, MapPin, Phone, MessageSquare, Map } from "lucide-react";
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
  
  // Imagen de logo/negocio
  const logoUrl = (business as any).image1 || (business as any).logoUrl || 'https://via.placeholder.com/80x80?text=Logo';

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
  const plan = (business as any).plan || 'free';
  const cardStyles = {
    sponsor: {
      border: 'border-amber-400 border-[3px]',
      bg: 'bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50',
      shadow: 'shadow-2xl shadow-amber-200',
      badge: { 
        text: '💎 PATROCINADO', 
        style: 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white animate-pulse',
        glow: 'shadow-lg shadow-amber-300'
      },
      titleColor: 'text-amber-900',
      ring: 'ring-2 ring-amber-300 ring-offset-2'
    },
    featured: {
      border: 'border-emerald-400 border-[3px]',
      bg: 'bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50',
      shadow: 'shadow-xl shadow-emerald-200',
      badge: { 
        text: '✨ DESTACADO', 
        style: 'bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 text-white',
        glow: 'shadow-md shadow-emerald-300'
      },
      titleColor: 'text-emerald-900',
      ring: 'ring-2 ring-emerald-300 ring-offset-2'
    },
    free: {
      border: 'border-gray-200',
      bg: 'bg-white',
      shadow: 'shadow-sm',
      badge: null,
      titleColor: 'text-gray-900',
      ring: ''
    }
  };

  const currentStyle = cardStyles[plan as keyof typeof cardStyles] || cardStyles.free;

  return (
    <article className={`relative ${currentStyle.bg} border ${currentStyle.border} rounded-2xl ${currentStyle.shadow} ${currentStyle.ring} p-4 flex flex-row items-start gap-4 transition-all hover:scale-[1.01] hover:shadow-2xl overflow-hidden`}>
      {/* Efecto de brillo para premium */}
      {plan !== 'free' && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-10 pointer-events-none" />
      )}
      
      {/* COLUMNA IZQUIERDA: Logo */}
      <div className="flex-shrink-0 relative z-10">
        <img 
          src={logoUrl} 
          alt={`Logo de ${business.name}`}
          className="w-20 h-20 rounded-xl object-cover border-2 border-gray-200 shadow-sm"
        />
      </div>
      
      {/* COLUMNA DERECHA: Contenido */}
      <div className="flex-1 min-w-0 flex flex-col gap-2.5 relative z-10">
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
              <MessageSquare className="w-3.5 h-3.5" />
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
