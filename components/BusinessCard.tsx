'use client';

import React, { useEffect, useState } from "react";
import { ArrowRight, Heart, MapPin, MessageCircle, Phone, Star } from "lucide-react";
import { mapsLink, normalizeDigits, waLink } from "../lib/helpers/contact";
import { trackCTA, trackBusinessInteraction } from "../lib/telemetry";
import type { Business, BusinessPreview } from "../types/business";
import { getBusinessStatus } from "./BusinessHours";
import { useFavorites } from "../context/FavoritesContext";
import { CATEGORIES, resolveCategory } from "../lib/categoriesCatalog";
import { generateBusinessPlaceholder } from "../lib/placeholderGenerator";

type CardBusiness = BusinessPreview | Business;

type Props = {
  business: CardBusiness;
  onViewDetails?: (business: CardBusiness) => void;
};

type PlanVariant = "free" | "featured" | "sponsor";

type StatusChip =
  | {
      tone: "open" | "neutral";
      label: string;
    }
  | null;

const PLACEHOLDER_LOGO =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80"%3E%3Crect fill="%23f4f4f5" width="80" height="80"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14" fill="%23999"%3ELogo%3C/text%3E%3C/svg%3E';

const CARD_STYLES: Record<
  PlanVariant,
  {
    wrapper: string;
    content: string;
    title: string;
    badge: string;
    badgeText: string;
    cta: string;
    showCover: boolean;
  }
> = {
  free: {
    wrapper:
      "relative rounded-[28px] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg",
    content: "p-5",
    title: "text-xl",
    badge: "border border-slate-200 bg-white text-slate-600",
    badgeText: "Perfil base",
    cta: "border border-[#0f7a47] text-[#0f7a47] hover:bg-[#eef7f1]",
    showCover: false,
  },
  featured: {
    wrapper:
      "relative overflow-hidden rounded-[30px] border border-[#d8c27b] bg-white shadow-[0_20px_60px_rgba(109,85,28,0.12)] transition hover:-translate-y-1 hover:shadow-xl",
    content: "p-5",
    title: "text-2xl",
    badge: "bg-[#f3e2a7] text-[#6d551c]",
    badgeText: "Destacado",
    cta: "bg-[#1d2a3b] text-white hover:bg-[#121d2b]",
    showCover: true,
  },
  sponsor: {
    wrapper:
      "relative overflow-hidden rounded-[32px] border border-[#d5b15a] bg-[linear-gradient(180deg,#fffaf0_0%,#ffffff_100%)] shadow-[0_28px_90px_rgba(108,74,17,0.18)] transition hover:-translate-y-1 hover:shadow-[0_34px_100px_rgba(108,74,17,0.22)]",
    content: "p-6",
    title: "text-[1.9rem]",
    badge: "bg-[#8f5b14] text-white",
    badgeText: "Patrocinado",
    cta: "bg-[#0f7a47] text-white hover:bg-[#0b6238]",
    showCover: true,
  },
};

function normalizePlan(plan?: string): PlanVariant {
  if (plan === "sponsor" || plan === "patrocinado") return "sponsor";
  if (plan === "featured" || plan === "destacado") return "featured";
  return "free";
}

function getBusinessImage(business: CardBusiness) {
  return (
    ("coverUrl" in business && business.coverUrl) ||
    ("logoUrl" in business && business.logoUrl) ||
    ("image1" in business && business.image1) ||
    generateBusinessPlaceholder(business.name || "Negocio", business.category)
  );
}

function getLogoImage(business: CardBusiness, isPremium: boolean) {
  return (
    ("logoUrl" in business && business.logoUrl) ||
    ("image1" in business && business.image1) ||
    (isPremium ? "/images/default-premium-logo.svg" : PLACEHOLDER_LOGO)
  );
}

function getCategoryIcon(business: CardBusiness) {
  const resolved = resolveCategory(
    ("categoryId" in business && business.categoryId) || ("categoryName" in business && business.categoryName) || business.category
  );
  const category = CATEGORIES.find((item) => item.id === resolved.categoryId);

  return category?.icon ?? "🏪";
}

function buildStatusChip(business: CardBusiness): StatusChip {
  const hasStructuredHours = Boolean("horarios" in business && business.horarios && Object.keys(business.horarios).length > 0);
  const hasHoursText = Boolean(business.hours && business.hours.trim().length > 0);

  if (!hasStructuredHours && !hasHoursText) {
    return null;
  }

  if (hasHoursText && business.hours) {
    const status = getBusinessStatus(business.hours);

    return status.isOpen
      ? { tone: "open", label: `Abierto ahora - cierra ${status.closesAt}` }
      : { tone: "neutral", label: `Horario visible${status.opensAt ? ` - ${status.opensAt}` : ""}` };
  }

  return {
    tone: "neutral",
    label: "Horario confirmado",
  };
}

const BusinessCard: React.FC<Props> = ({ business, onViewDetails }) => {
  const businessId = business?.id || (business as any)?.businessId || undefined;
  const plan = normalizePlan("plan" in business ? business.plan : undefined);
  const styles = CARD_STYLES[plan];
  const isPremium = plan !== "free";
  const imageSrc = getBusinessImage(business);
  const logoSrc = getLogoImage(business, isPremium);
  const categoryIcon = getCategoryIcon(business);
  const ratingValue = Number.isFinite(Number(business.rating)) ? Number(business.rating) : 0;
  const addressText = business.address || "Ubicacion disponible en el perfil";
  const mapsHref = mapsLink(undefined, undefined, business.address || business.name);
  const callHref = business.phone ? `tel:${normalizeDigits(business.phone)}` : null;
  const whatsappHref = business.WhatsApp ? waLink(business.WhatsApp) : "";
  const promoText =
    "promocionesActivas" in business && typeof business.promocionesActivas === "string" && business.promocionesActivas.trim().length > 0
      ? business.promocionesActivas.trim()
      : "";
  const statusChip = buildStatusChip(business);
  const { favorites, addFavorite, removeFavorite } = useFavorites();
  const isFavorite = businessId ? favorites.includes(businessId) : false;
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);
  const [isOpenNow, setIsOpenNow] = useState(statusChip?.tone === "open");

  useEffect(() => {
    if (!business.hours) {
      setIsOpenNow(false);
      return;
    }

    const updateStatus = () => {
      const status = getBusinessStatus(business.hours as string);
      setIsOpenNow(status.isOpen);
    };

    updateStatus();
    const timer = setInterval(updateStatus, 60_000);
    return () => clearInterval(timer);
  }, [business.hours]);

  const handleViewDetails = () => {
    if (!onViewDetails) return;

    trackBusinessInteraction("business_card_clicked", businessId || "", business.name, business.category);
    onViewDetails(business);
  };

  const handleFavoriteToggle = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (!businessId || isTogglingFavorite) {
      return;
    }

    setIsTogglingFavorite(true);

    try {
      if (isFavorite) {
        removeFavorite(businessId);
      } else {
        addFavorite(businessId);
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    } finally {
      setIsTogglingFavorite(false);
    }
  };

  return (
    <article className={styles.wrapper}>
      <button
        type="button"
        onClick={handleFavoriteToggle}
        disabled={isTogglingFavorite}
        className={`absolute right-4 top-4 z-30 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/95 shadow-lg transition ${
          isTogglingFavorite ? "scale-95 opacity-70" : "hover:scale-105"
        }`}
        aria-label={isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
      >
        <Heart className={`h-5 w-5 ${isFavorite ? "fill-red-500 text-red-500" : "text-slate-400"}`} />
      </button>

      {styles.showCover ? (
        <div className={`relative overflow-hidden ${plan === "sponsor" ? "h-64" : "h-52"}`}>
          <img src={imageSrc} alt={`Imagen de ${business.name}`} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/20 to-transparent" />
          <div className="absolute left-4 top-4 flex flex-wrap gap-2">
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${styles.badge}`}>
              {styles.badgeText}
            </span>
            {promoText ? (
              <span className="inline-flex rounded-full bg-white/92 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#8f5b14]">
                Promo activa
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className={styles.content}>
        <div className="flex items-start gap-4">
          {isPremium ? (
            <img
              src={logoSrc}
              alt={`Logo de ${business.name}`}
              className={`rounded-2xl border border-white/50 object-cover shadow-sm ${plan === "sponsor" ? "h-16 w-16" : "h-14 w-14"}`}
            />
          ) : (
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-[#eef4ef] text-2xl">
              {categoryIcon}
            </div>
          )}

          <div className="min-w-0 flex-1">
            {!isPremium ? (
              <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${styles.badge}`}>
                {styles.badgeText}
              </span>
            ) : null}

            <h3 className={`mt-3 font-serif font-semibold tracking-tight text-slate-950 ${styles.title}`}>{business.name}</h3>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-600">
              {business.category ? <span className="rounded-full bg-[#eef4ef] px-3 py-1">{business.category}</span> : null}
              {business.colonia ? <span className="rounded-full bg-slate-100 px-3 py-1">{business.colonia}</span> : null}
              {ratingValue > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#fbf4e6] px-3 py-1 text-[#8f5b14]">
                  <Star className="h-3.5 w-3.5 fill-current" />
                  {ratingValue.toFixed(1)}
                </span>
              ) : null}
              {promoText && !isPremium ? (
                <span className="rounded-full bg-[#fff3e8] px-3 py-1 text-[#a84f0f]">Promo activa</span>
              ) : null}
            </div>
          </div>
        </div>

        {business.description ? (
          <p className={`mt-4 text-sm leading-6 text-slate-600 ${isPremium ? "line-clamp-3" : "line-clamp-2"}`}>{business.description}</p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium">
          {statusChip ? (
            <span className={`rounded-full px-3 py-1 ${statusChip.tone === "open" || isOpenNow ? "bg-[#e6f6ed] text-[#0f7a47]" : "bg-slate-100 text-slate-600"}`}>
              {statusChip.label}
            </span>
          ) : null}
          {business.WhatsApp ? <span className="rounded-full bg-[#eef7f1] px-3 py-1 text-[#0f7a47]">Contacto rapido por WhatsApp</span> : null}
          {business.hasEnvio ? <span className="rounded-full bg-[#fff3e8] px-3 py-1 text-[#a84f0f]">Acepta pedidos o envio</span> : null}
        </div>

        <a
          href={mapsHref}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 text-sm text-slate-600 transition hover:text-slate-900"
        >
          <MapPin className="h-4 w-4" />
          <span className="line-clamp-1">{addressText}</span>
        </a>

        <div className={`mt-5 flex flex-col gap-3 ${plan === "sponsor" ? "sm:flex-row" : ""}`}>
          {whatsappHref ? (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition ${styles.cta}`}
              aria-label={`Enviar mensaje por WhatsApp a ${business.name}`}
              onClick={(event) => {
                event.stopPropagation();
                trackCTA("whatsapp", businessId || "", business.name);
              }}
            >
              <MessageCircle className="h-4 w-4" />
              {plan === "sponsor" ? "Abrir WhatsApp" : "Contactar por WhatsApp"}
            </a>
          ) : (
            <button
              type="button"
              onClick={handleViewDetails}
              className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition ${styles.cta}`}
            >
              Ver perfil
              <ArrowRight className="h-4 w-4" />
            </button>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleViewDetails}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Ver detalles
            </button>
            {callHref ? (
              <a
                href={callHref}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-4 py-3 text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                aria-label={`Llamar a ${business.name}`}
                onClick={(event) => {
                  event.stopPropagation();
                  trackCTA("call", businessId || "", business.name);
                }}
              >
                <Phone className="h-4 w-4" />
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
};

export default React.memo(BusinessCard);
