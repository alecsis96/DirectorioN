'use client';

import React, { useState } from "react";
import { ArrowRight, Heart, MessageCircle } from "lucide-react";
import { waLink } from "../lib/helpers/contact";
import { trackCTA, trackBusinessInteraction } from "../lib/telemetry";
import type { Business, BusinessPreview } from "../types/business";
import { useFavorites } from "../context/FavoritesContext";
import { generateBusinessPlaceholder } from "../lib/placeholderGenerator";
import { asPlanInput, getVisibleTierBadgeLabel, resolvePremiumVisualVariant } from "../lib/businessPlanVisibility";
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
  }
> = {
  free: {
    wrapper:
      "relative rounded-[22px] border border-slate-200 bg-white shadow-[0_2px_10px_rgba(15,23,42,0.04)] transition hover:border-slate-300 hover:shadow-[0_6px_14px_rgba(15,23,42,0.06)]",
    content: "p-3",
    title: "text-[0.98rem] sm:text-base",
    badge: "border border-slate-200 bg-slate-50 text-slate-500",
    badgeText: "Perfil base",
    cta: "border border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50",
    media: "border border-slate-200 bg-slate-50",
    mediaSize: "h-[80px] w-[80px] sm:h-[88px] sm:w-[88px]",
  },
  featured: {
    wrapper:
      "relative rounded-[24px] border border-[#d8c27b] bg-[#fffdfa] shadow-[0_10px_28px_rgba(109,85,28,0.10)] ring-1 ring-[#f6e6b1]/70 transition hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(109,85,28,0.14)]",
    content: "p-3",
    title: "text-[1rem] sm:text-[1.05rem]",
    badge: "bg-[#f3e2a7] text-[#6d551c] shadow-[0_4px_12px_rgba(109,85,28,0.14)]",
    badgeText: "Premium",
    cta: "bg-[#1a2638] text-white shadow-[0_10px_22px_rgba(26,38,56,0.16)] hover:bg-[#121c2b]",
    media: "border border-[#ead7a0] bg-[#fff8e7] shadow-[0_8px_20px_rgba(109,85,28,0.10)]",
    mediaSize: "h-[86px] w-[86px] sm:h-[94px] sm:w-[94px]",
  },
  sponsor: {
    wrapper:
      "relative rounded-[26px] border border-[#c79425] bg-[linear-gradient(180deg,#fffbf2_0%,#fff4dd_100%)] shadow-[0_16px_42px_rgba(108,74,17,0.16)] ring-1 ring-[#f4dd98]/80 transition hover:-translate-y-0.5 hover:shadow-[0_20px_48px_rgba(108,74,17,0.2)]",
    content: "p-3",
    title: "text-[1.02rem] sm:text-[1.08rem]",
    badge: "bg-[#7a4b00] text-white shadow-[0_8px_18px_rgba(122,75,0,0.24)]",
    badgeText: "Premium",
    cta: "bg-[#0f7a47] text-white shadow-[0_12px_24px_rgba(15,122,71,0.22)] hover:bg-[#0b6238]",
    media: "border border-[#d6b052] bg-[#fff7e8] shadow-[0_10px_24px_rgba(122,75,0,0.14)]",
    mediaSize: "h-[88px] w-[88px] sm:h-[96px] sm:w-[96px]",
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
          ? "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 active:scale-[0.995]"
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
        <div className={`relative shrink-0 overflow-hidden rounded-[18px] ${styles.media} ${styles.mediaSize}`}>
          <img src={imageSrc} alt={`Imagen de ${business.name}`} className="h-full w-full object-cover object-center" />
          {isPremium ? <div className="absolute inset-0 bg-gradient-to-t from-slate-950/10 via-transparent to-white/5" /> : null}
        </div>

        <div className="min-w-0 flex-1">
          <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${styles.badge}`}>
            {isPremium ? styles.badgeText : getVisibleTierBadgeLabel(planInput)}
          </span>

          <div className="mt-1.5 flex items-start gap-2">
            <h3 className={`min-w-0 flex-1 font-serif font-semibold tracking-tight text-slate-950 ${styles.title}`}>
              <span className="line-clamp-2">{business.name}</span>
            </h3>
            {isInteractive ? (
              <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center text-slate-300">
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            ) : null}
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-slate-600">
            {business.category ? <span className="line-clamp-1 rounded-full bg-[#eef4ef] px-2.5 py-1">{business.category}</span> : null}
            {business.colonia ? <span className="line-clamp-1 rounded-full bg-slate-100 px-2.5 py-1">{business.colonia}</span> : null}
          </div>

          {statusChip ? (
            <div className="mt-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  statusChip.tone === "open"
                    ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                    : "bg-red-50 text-red-700 ring-1 ring-red-200"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${statusChip.tone === "open" ? "bg-emerald-500" : "bg-red-500"}`} />
                {statusChip.label}
              </span>
            </div>
          ) : null}

          <div className="mt-2.5">
            {whatsappHref ? (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex h-9 w-full items-center justify-center gap-2 rounded-2xl px-3 text-[13px] font-semibold transition sm:h-10 sm:text-sm ${styles.cta}`}
                aria-label={`Enviar mensaje por WhatsApp a ${business.name}`}
                onClick={(event) => {
                  event.stopPropagation();
                  trackCTA("whatsapp", businessId || "", business.name);
                }}
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
};

export default React.memo(BusinessCard);
