'use client';

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { BsStar, BsStarFill, BsGeoAlt } from "react-icons/bs";
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
        text: '👑 PATROCINADO', 
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
        text: '⭐ DESTACADO', 
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
    <article className={`relative ${currentStyle.bg} border ${currentStyle.border} rounded-2xl ${currentStyle.shadow} ${currentStyle.ring} p-5 flex gap-4 transition-all hover:scale-[1.02] hover:shadow-2xl overflow-hidden`}>
      {/* Efecto de brillo para premium */}
      {plan !== 'free' && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-10 pointer-events-none" />
      )}
      
      <div className="flex-1 min-w-0 flex flex-col gap-3 relative z-10">
        {/* Badge de plan */}
        {currentStyle.badge && (
          <div className="inline-flex self-start">
            <span className={`${currentStyle.badge.style} ${currentStyle.badge.glow} px-4 py-1.5 rounded-full text-xs font-extrabold tracking-wide uppercase`}>
              {currentStyle.badge.text}
            </span>
          </div>
        )}
        
        {/* Header con título, favorito y rating */}
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <Link
              prefetch={false}
              href={`/negocios/${business.id ?? ""}`}
              onClick={handleClick}
              className={`text-xl font-bold ${currentStyle.titleColor} hover:text-[#38761D] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#38761D] block transition-colors`}
            >
              {business.name}
            </Link>
            <p className="text-xs text-gray-500 mt-1">Tap en el titulo para ver detalles.</p>
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
              className={`rounded-full p-2 text-lg font-semibold transition ${
                isFavorite ? "text-red-500 hover:text-red-600" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {isFavorite ? "♥" : "♡"}
            </button>
            {ratingValue > 0 && (
              <div className="flex flex-col items-end">
                <span className="inline-flex items-center gap-1 text-sm font-bold text-yellow-600 whitespace-nowrap" aria-label={`Calificacion ${ratingValue.toFixed(1)} de 5`}>
                  <BsStarFill className="w-4 h-4" />
                  {ratingValue.toFixed(1)}
                </span>
                {(business as any).reviewCount > 0 && (
                  <span className="text-xs text-gray-500">
                    {(business as any).reviewCount} {(business as any).reviewCount === 1 ? 'reseña' : 'reseñas'}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Tags y estado */}
        <div className="flex flex-wrap gap-2 text-xs text-gray-600">
          {business.category && <span className="bg-gray-100 px-3 py-1 rounded-full">{business.category}</span>}
          {business.colonia && <span className="bg-gray-100 px-3 py-1 rounded-full">{business.colonia}</span>}
          <span
            className={`px-3 py-1 rounded-full font-semibold ${isOpen ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
            aria-live="polite"
          >
            {isOpen ? "Abierto" : "Cerrado"}
          </span>
          {business.hasDelivery && (
            <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full font-semibold flex items-center gap-1">
              🚚 Delivery
            </span>
          )}
        </div>

        {/* Ubicación */}
        <p className="text-sm text-gray-700 flex items-center gap-2" aria-label={`Direccion ${addressText}`}>
          <BsGeoAlt className="w-4 h-4 text-gray-500 flex-shrink-0" />
          <span className="truncate">{addressText}</span>
        </p>
        
        {/* Horario */}
        <p className="text-xs text-gray-500">
          <span className="font-semibold">Horario:</span> {hoursLabel}
        </p>

        {/* Botones de acción */}
        <div className="flex flex-wrap gap-2 text-sm font-semibold">
          {callHref && (
            <a
              href={callHref}
              className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-green-50 text-green-800 hover:bg-green-100 transition"
              aria-label={`Llamar a ${business.name}`}
              onClick={() => {
                trackCTA('call', businessId || '', business.name);
              }}
            >
              Llamar
            </a>
          )}
          {whatsappHref && (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-green-100 text-green-900 hover:bg-green-200 transition"
              aria-label={`Enviar mensaje por WhatsApp a ${business.name}`}
              onClick={() => {
                trackCTA('whatsapp', businessId || '', business.name);
              }}
            >
              WhatsApp
            </a>
          )}
          <a
            href={mapsHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
            aria-label="Como llegar en Google Maps"
            onClick={() => {
              trackCTA('maps', businessId || '', business.name);
            }}
          >
            Como llegar
          </a>
        </div>
      </div>
    </article>
  );
};

export default React.memo(BusinessCard);
