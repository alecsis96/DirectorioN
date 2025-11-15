'use client';

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { mapsLink, normalizeDigits, waLink } from "../lib/helpers/contact";
import { sendEvent } from "../lib/telemetry";
import type { Business, BusinessPreview } from "../types/business";
import { getBusinessStatus } from "./BusinessHours";
import { useFavorites } from "../context/FavoritesContext";

type CardBusiness = BusinessPreview | Business;

type Props = {
  business: CardBusiness;
};

const BusinessCard: React.FC<Props> = ({ business }) => {
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

  return (
    <article className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 flex flex-col gap-4">
      <header className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col">
            <Link
              prefetch={false}
              href={`/negocios/${business.id ?? ""}`}
              className="text-xl font-semibold text-gray-900 hover:text-[#38761D] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#38761D]"
            >
              {business.name}
            </Link>
            <p className="text-xs text-gray-500">Tap para ver detalles sin salir de esta pagina ligera.</p>
          </div>
          <div className="flex items-center gap-2">
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
              className={`rounded-full p-2 text-sm font-semibold transition ${
                isFavorite ? "text-red-500 hover:text-red-600" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {isFavorite ? "♥" : "♡"}
            </button>
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-yellow-600" aria-label={`Calificacion ${ratingValue.toFixed(1)} de 5`}>
              <StarIcon className="w-4 h-4" />
              {ratingValue.toFixed(1)}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-gray-600">
          {business.category && <span className="bg-gray-100 px-3 py-1 rounded-full">{business.category}</span>}
          {business.colonia && <span className="bg-gray-100 px-3 py-1 rounded-full">{business.colonia}</span>}
          <span
            className={`px-3 py-1 rounded-full font-semibold ${isOpen ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
            aria-live="polite"
          >
            {isOpen ? "Abierto" : "Cerrado"}
          </span>
        </div>
      </header>

      <p className="text-sm text-gray-700 flex items-center gap-2" aria-label={`Direccion ${addressText}`}>
        <LocationIcon className="w-4 h-4 text-gray-500" />
        <span className="truncate">{addressText}</span>
      </p>
      <p className="text-xs text-gray-500">
        <span className="font-semibold">Horario:</span> {hoursLabel}
      </p>

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
    </article>
  );
};

export default React.memo(BusinessCard);

type IconProps = React.SVGProps<SVGSVGElement>;

function StarIcon({ className = "w-4 h-4", ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      role="img"
      aria-hidden="true"
      className={className}
      {...props}
    >
      <path d="M10 1.5l2.4 4.9 5.4.78-3.9 3.75.92 5.32L10 13.88l-4.82 2.37.92-5.32-3.9-3.75 5.4-.78z" />
    </svg>
  );
}

function LocationIcon({ className = "w-4 h-4", ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      role="img"
      aria-hidden="true"
      className={className}
      {...props}
    >
      <path d="M10 1.75c-3.07 0-5.55 2.48-5.55 5.55 0 3.9 4.77 9.1 5.15 9.5a.5.5 0 0 0 .8 0c.38-.4 5.15-5.6 5.15-9.5 0-3.07-2.48-5.55-5.55-5.55zm0 8.03a2.48 2.48 0 1 1 0-4.96 2.48 2.48 0 0 1 0 4.96z" />
    </svg>
  );
}
