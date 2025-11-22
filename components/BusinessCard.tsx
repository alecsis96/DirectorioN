'use client';

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { BsStar, BsStarFill, BsGeoAlt } from "react-icons/bs";
import { mapsLink, normalizeDigits, waLink } from "../lib/helpers/contact";
import { sendEvent } from "../lib/telemetry";
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
      onViewDetails(business);
    }
  };

  // Determinar estilo según el plan
  const plan = (business as any).plan || 'free';
  const cardStyles = {
    sponsor: {
      border: 'border-amber-300 border-2',
      bg: 'bg-gradient-to-br from-amber-50 to-orange-50',
      shadow: 'shadow-lg shadow-amber-100',
      badge: { text: '💡 Patrocinado', style: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white' }
    },
    featured: {
      border: 'border-emerald-300 border-2',
      bg: 'bg-gradient-to-br from-emerald-50 to-green-50',
      shadow: 'shadow-md shadow-emerald-100',
      badge: { text: '✨ Destacado', style: 'bg-gradient-to-r from-emerald-500 to-green-500 text-white' }
    },
    free: {
      border: 'border-gray-200',
      bg: 'bg-white',
      shadow: 'shadow-sm',
      badge: null
    }
  };

  const currentStyle = cardStyles[plan as keyof typeof cardStyles] || cardStyles.free;

  // Obtener imagen del negocio
  const businessImage = (business as any).images?.[0]?.url || (business as any).image1 || null;

  return (
    <article className={`${currentStyle.bg} border ${currentStyle.border} rounded-2xl ${currentStyle.shadow} p-5 flex gap-4 transition-all hover:scale-[1.02] overflow-hidden`}>
      {/* Imagen del negocio */}
      {businessImage && (
        <div className="flex-shrink-0">
          <img
            src={businessImage}
            alt={business.name}
            className="w-24 h-24 object-cover rounded-xl border-2 border-gray-200"
          />
        </div>
      )}
      
      <div className="flex-1 min-w-0 flex flex-col gap-3">
        {/* Badge de plan */}
        {currentStyle.badge && (
          <div className="inline-flex self-start">
            <span className={`${currentStyle.badge.style} px-3 py-1 rounded-full text-xs font-bold shadow-md`}>
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
              className="text-xl font-semibold text-gray-900 hover:text-[#38761D] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#38761D] block"
            >
              {business.name}
            </Link>
            <p className="text-xs text-gray-500 mt-1">Tap para ver detalles sin salir de esta pagina ligera.</p>
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
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-yellow-600 whitespace-nowrap" aria-label={`Calificacion ${ratingValue.toFixed(1)} de 5`}>
              <BsStarFill className="w-4 h-4" />
              {ratingValue.toFixed(1)}
            </span>
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
                sendEvent({ t: "cta_call", p: "list", ...(businessId ? { b: businessId } : {}) });
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
                sendEvent({ t: "cta_wa", p: "list", ...(businessId ? { b: businessId } : {}) });
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
              sendEvent({ t: "cta_maps", p: "list", ...(businessId ? { b: businessId } : {}) });
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
