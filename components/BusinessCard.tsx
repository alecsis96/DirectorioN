'use client';

import React, { useState } from "react";
import { Heart, MessageCircle, Star } from "lucide-react";
import { FaMotorcycle } from "react-icons/fa";
import { waLink } from "../lib/helpers/contact";
import { trackCTA, trackBusinessInteraction } from "../lib/telemetry";
import type { Business, BusinessPreview } from "../types/business";
import { useFavorites } from "../context/FavoritesContext";
import { generateBusinessPlaceholder } from "../lib/placeholderGenerator";
import { asPlanInput, resolvePremiumVisualVariant } from "../lib/businessPlanVisibility";
import { resolveCardStatusChip } from "./businessCardContent";

type CardBusiness = BusinessPreview | Business;

type Props = {
  business: CardBusiness;
  onViewDetails?: (business: CardBusiness) => void;
};

type PlanVariant = "free" | "featured" | "sponsor";

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
    media: string;
    mediaSize: string;
    meta: string;
    status: {
      open: string;
      closed: string;
      dotOpen: string;
      dotClosed: string;
    };
  }
> = {
  free: {
    wrapper:
      "relative rounded-[22px] border border-gray-200 bg-white shadow-[0_2px_10px_rgba(15,23,42,0.04)] transition hover:border-gray-300 hover:shadow-[0_6px_14px_rgba(15,23,42,0.06)]",
    content: "p-3",
    title: "text-[0.98rem] sm:text-base",
    badge: "border border-gray-200 bg-gray-100 text-gray-600",
    badgeText: "Perfil basico",
    cta: "border border-gray-300 bg-transparent text-gray-700 hover:bg-gray-50",
    media: "border border-gray-200 bg-gray-50",
    mediaSize: "h-[80px] w-[80px] sm:h-[88px] sm:w-[88px]",
    meta: "text-sm font-medium text-gray-500",
    status: {
      open: "text-green-700",
      closed: "text-red-700",
      dotOpen: "bg-green-600",
      dotClosed: "bg-red-600",
    },
  },
  featured: {
    wrapper:
      "relative rounded-[24px] border border-gray-200 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(15,23,42,0.12)]",
    content: "p-4",
    title: "text-[1rem] sm:text-[1.05rem]",
    badge: "border border-gray-300 bg-white/95 text-gray-700 shadow-[0_4px_10px_rgba(15,23,42,0.06)]",
    badgeText: "Premium",
    cta: "bg-green-600 text-white shadow-[0_12px_24px_rgba(22,163,74,0.24)] hover:bg-green-700",
    media: "border border-gray-200 bg-white shadow-[0_10px_22px_rgba(15,23,42,0.1)]",
    mediaSize: "h-[92px] w-[92px] sm:h-[100px] sm:w-[100px]",
    meta: "text-sm font-medium text-gray-500",
    status: {
      open: "text-green-700",
      closed: "text-red-700",
      dotOpen: "bg-green-600",
      dotClosed: "bg-red-600",
    },
  },
  sponsor: {
    wrapper:
      "relative rounded-[26px] border border-gray-200 bg-white shadow-[0_14px_32px_rgba(15,23,42,0.1)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(15,23,42,0.14)]",
    content: "p-4 sm:p-5",
    title: "text-[1.02rem] sm:text-[1.08rem]",
    badge: "border border-gray-300 bg-white/95 text-gray-800 shadow-[0_4px_12px_rgba(15,23,42,0.08)]",
    badgeText: "Premium",
    cta: "bg-green-600 text-white shadow-[0_12px_24px_rgba(22,163,74,0.28)] hover:bg-green-700",
    media: "border border-gray-200 bg-white shadow-[0_12px_24px_rgba(15,23,42,0.12)]",
    mediaSize: "h-[96px] w-[96px] sm:h-[106px] sm:w-[106px]",
    meta: "text-sm font-medium text-gray-500",
    status: {
      open: "text-green-700",
      closed: "text-red-700",
      dotOpen: "bg-green-600",
      dotClosed: "bg-red-600",
    },
  },
};

function getBusinessImage(business: CardBusiness) {
  return (
    ("logoUrl" in business && business.logoUrl) ||
    ("image1" in business && business.image1) ||
    ("coverUrl" in business && business.coverUrl) ||
    generateBusinessPlaceholder(business.name || "Negocio", business.category)
  );
}

function getFallbackLogo(business: CardBusiness, isPremium: boolean) {
  return (
    ("logoUrl" in business && business.logoUrl) ||
    ("image1" in business && business.image1) ||
    (isPremium ? "/images/default-premium-logo.svg" : PLACEHOLDER_LOGO)
  );
}

const BusinessCard: React.FC<Props> = ({ business, onViewDetails }) => {
  const businessId = business?.id || (business as any)?.businessId || undefined;
  const planInput = asPlanInput({
    plan: "plan" in business ? business.plan : undefined,
    featured: "featured" in business ? business.featured : undefined,
  });
  const plan = ("plan" in business || "featured" in business) ? resolvePremiumVisualVariant(planInput) : "free";
  const styles = CARD_STYLES[plan];
  const isPremium = plan !== "free";
  const imageSrc = getBusinessImage(business) || getFallbackLogo(business, isPremium);
  const whatsappHref = business.WhatsApp ? waLink(business.WhatsApp) : "";
  const statusChip = resolveCardStatusChip(business);
  const { favorites, addFavorite, removeFavorite } = useFavorites();
  const isFavorite = businessId ? favorites.includes(businessId) : false;
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);
  const isInteractive = Boolean(onViewDetails);
  const isClosed = statusChip?.tone === "closed";
  const hasEnvio = business.hasEnvio === true;
  const reviewCount = Number((business as any).reviewCount || 0);
  const showSponsorSocialProof = plan === "sponsor" && typeof business.rating === "number" && Number(business.rating) > 0 && reviewCount > 0;
  const sponsorSocialProof = showSponsorSocialProof
    ? `(${Number(business.rating).toFixed(1)} - ${reviewCount} reseñas)`
    : null;

  const handleViewDetails = () => {
    if (!onViewDetails) return;

    trackBusinessInteraction("business_card_clicked", businessId || "", business.name, business.category);
    onViewDetails(business);
  };

  const handleFavoriteToggle = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (!businessId || isTogglingFavorite) return;

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

  const handleCardActivate = () => {
    if (!isInteractive) return;
    handleViewDetails();
  };

  const handleCardKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (!isInteractive) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleViewDetails();
    }
  };

  return (
    <article
      className={`${styles.wrapper} ${
        isInteractive
          ? "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/60 focus-visible:ring-offset-2 active:scale-[0.995]"
          : ""
      }`}
      onClick={handleCardActivate}
      onKeyDown={handleCardKeyDown}
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      aria-label={isInteractive ? `Abrir detalle de ${business.name}` : undefined}
    >
      <button
        type="button"
        onClick={handleFavoriteToggle}
        disabled={isTogglingFavorite}
        className={`absolute right-3 top-3 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/95 shadow-lg transition sm:h-10 sm:w-10 ${
          isTogglingFavorite ? "scale-95 opacity-70" : "hover:scale-105"
        }`}
        aria-label={isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
      >
        <Heart className={`h-4 w-4 ${isFavorite ? "fill-red-500 text-red-500" : "text-slate-400"}`} />
      </button>

      <div className={`flex items-start gap-3 ${styles.content}`}>
        <div className={`relative shrink-0 ${isPremium ? "pt-6" : "pt-2"}`}>
          {isPremium ? (
            <span
              className={`absolute left-0 top-0 z-10 inline-flex rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] ${styles.badge}`}
            >
              {styles.badgeText}
            </span>
          ) : null}

          <div className={`relative overflow-hidden rounded-[18px] ${styles.media} ${styles.mediaSize} ${isPremium ? "mt-1" : ""}`}>
            <img src={imageSrc} alt={`Imagen de ${business.name}`} className="h-full w-full object-cover object-center" />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className={`${isPremium ? "mt-0.5" : "mt-2.5"} flex items-start`}>
            <h3 className={`min-w-0 flex-1 font-bold tracking-tight text-gray-900 ${styles.title}`}>
              <span className="line-clamp-2">{business.name}</span>
            </h3>
          </div>

          {(business.category || business.colonia) ? (
            <div className={`mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 ${styles.meta}`}>
              {business.category ? <span className="line-clamp-1">{business.category}</span> : null}
              {business.category && business.colonia ? <span className="text-gray-300">•</span> : null}
              {business.colonia ? <span className="line-clamp-1">{business.colonia}</span> : null}
            </div>
          ) : null}

          {showSponsorSocialProof ? (
            <div className="mt-2.5 flex items-center gap-2 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star key={index} className="h-4 w-4 fill-orange-400 text-orange-400" />
                ))}
              </div>
              <span className="font-medium text-gray-500">{sponsorSocialProof}</span>
            </div>
          ) : null}

          {statusChip || hasEnvio ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {statusChip ? (
                <span
                  className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${
                    statusChip.tone === "open" ? styles.status.open : styles.status.closed
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      statusChip.tone === "open" ? styles.status.dotOpen : styles.status.dotClosed
                    }`}
                  />
                  {statusChip.label}
                </span>
              ) : null}
              {hasEnvio ? (
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                    isPremium
                      ? "border-orange-200 bg-orange-50 text-orange-600"
                      : "border-gray-200 bg-gray-100 text-gray-600"
                  }`}
                >
                  <FaMotorcycle className="h-3.5 w-3.5" />
                  Envio
                </span>
              ) : null}
            </div>
          ) : null}

          <div className="mt-4">
            {whatsappHref && !isClosed ? (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex h-10 w-full items-center justify-center gap-2 rounded-2xl px-3 text-[13px] font-semibold transition sm:h-10 sm:text-sm ${styles.cta}`}
                aria-label={`Enviar mensaje por WhatsApp a ${business.name}`}
                onClick={(event) => {
                  event.stopPropagation();
                  trackCTA("whatsapp", businessId || "", business.name);
                }}
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </a>
            ) : whatsappHref && isClosed ? (
              <button
                type="button"
                disabled
                className="inline-flex h-10 w-full cursor-default items-center justify-center gap-2 rounded-2xl bg-gray-200 px-3 text-[13px] font-semibold text-gray-500 sm:h-10 sm:text-sm"
                aria-label={`Negocio cerrado: ${business.name}`}
                onClick={(event) => event.stopPropagation()}
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
};

export default React.memo(BusinessCard);
