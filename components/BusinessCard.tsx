'use client';

import React, { useState } from "react";
import { ArrowRight, Heart, MessageCircle, Phone, Star } from "lucide-react";
import { normalizeDigits, waLink } from "../lib/helpers/contact";
import { trackCTA, trackBusinessInteraction } from "../lib/telemetry";
import type { Business, BusinessPreview } from "../types/business";
import { useFavorites } from "../context/FavoritesContext";
import { CATEGORIES, resolveCategory } from "../lib/categoriesCatalog";
import { generateBusinessPlaceholder } from "../lib/placeholderGenerator";
import { asPlanInput, getVisibleTierBadgeLabel, resolvePremiumVisualVariant } from "../lib/businessPlanVisibility";
import { resolveCardHighlight, resolveCardStatusChip } from "./businessCardContent";

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
    showCover: boolean;
  }
> = {
  free: {
    wrapper:
      "relative overflow-hidden rounded-[26px] border border-slate-200 bg-slate-50/70 shadow-[0_8px_22px_rgba(15,23,42,0.05)] transition hover:border-slate-300 hover:shadow-[0_12px_28px_rgba(15,23,42,0.08)]",
    content: "p-3.5 sm:p-4",
    title: "text-base sm:text-lg",
    badge: "border border-slate-200 bg-slate-50 text-slate-500",
    badgeText: "Perfil base",
    cta: "border border-slate-300 bg-white text-slate-800 hover:bg-slate-100",
    showCover: false,
  },
  featured: {
    wrapper:
      "relative overflow-hidden rounded-[30px] border border-[#d8c27b] bg-[#fffdf8] shadow-[0_20px_60px_rgba(109,85,28,0.12)] transition hover:-translate-y-1 hover:shadow-xl",
    content: "p-3.5 sm:p-4",
    title: "text-lg sm:text-xl",
    badge: "bg-[#f3e2a7] text-[#6d551c]",
    badgeText: "Premium",
    cta: "bg-[#1d2a3b] text-white hover:bg-[#121d2b]",
    showCover: true,
  },
  sponsor: {
    wrapper:
      "relative overflow-hidden rounded-[32px] border border-[#c79425] bg-[linear-gradient(180deg,#fffaf0_0%,#fff3d8_26%,#ffffff_100%)] shadow-[0_30px_100px_rgba(108,74,17,0.22)] ring-1 ring-[#f4dd98]/80 transition hover:-translate-y-1 hover:shadow-[0_38px_110px_rgba(108,74,17,0.28)]",
    content: "p-3.5 sm:p-4 lg:p-5",
    title: "text-[1.05rem] sm:text-[1.2rem] lg:text-[1.35rem]",
    badge: "bg-[#7a4b00] text-white shadow-[0_8px_20px_rgba(122,75,0,0.24)]",
    badgeText: "Premium",
    cta: "bg-[#0f7a47] text-white shadow-[0_12px_26px_rgba(15,122,71,0.24)] hover:bg-[#0b6238]",
    showCover: true,
  },
};

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

const BusinessCard: React.FC<Props> = ({ business, onViewDetails }) => {
  const businessId = business?.id || (business as any)?.businessId || undefined;
  const planInput = asPlanInput({
    plan: "plan" in business ? business.plan : undefined,
    featured: "featured" in business ? business.featured : undefined,
  });
  const plan = ("plan" in business || "featured" in business) ? resolvePremiumVisualVariant(planInput) : "free";
  const styles = CARD_STYLES[plan];
  const isPremium = plan !== "free";
  const imageSrc = getBusinessImage(business);
  const logoSrc = getLogoImage(business, isPremium);
  const categoryIcon = getCategoryIcon(business);
  const ratingValue = Number.isFinite(Number(business.rating)) ? Number(business.rating) : 0;
  const callHref = business.phone ? `tel:${normalizeDigits(business.phone)}` : null;
  const whatsappHref = business.WhatsApp ? waLink(business.WhatsApp) : "";
  const highlight = resolveCardHighlight(business, plan);
  const statusChip = resolveCardStatusChip(business);
  const { favorites, addFavorite, removeFavorite } = useFavorites();
  const isFavorite = businessId ? favorites.includes(businessId) : false;
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);

  const highlightClasses =
    highlight.kind === "promo"
      ? plan === "sponsor"
        ? "border border-[#d5b15a] bg-[#fff1cc] text-[#6f4b10]"
        : plan === "featured"
          ? "border border-[#e4cf8d] bg-[#fff8e7] text-[#7b5a16]"
          : "border border-[#f2d2b8] bg-[#fff3e8] text-[#a84f0f]"
      : highlight.kind === "neutral"
        ? plan === "sponsor"
          ? "border border-[#e4c56f] bg-[#fff8e7] text-[#6f4b10]"
          : "border border-slate-200 bg-slate-50 text-slate-700"
        : highlight.kind === "status"
          ? statusChip?.tone === "open"
            ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border border-red-200 bg-red-50 text-red-700"
          : "border border-slate-200 bg-white text-slate-700";
  const showSecondaryDetails = Boolean(whatsappHref);
  const mediaWidthClass =
    plan === "sponsor"
      ? "w-[118px] sm:w-[148px] lg:w-[180px]"
      : plan === "featured"
        ? "w-[104px] sm:w-[136px] lg:w-[164px]"
        : "w-[88px] sm:w-[112px]";
  const mediaHeightClass =
    plan === "sponsor"
      ? "min-h-[172px] sm:min-h-[188px]"
      : plan === "featured"
        ? "min-h-[164px] sm:min-h-[180px]"
        : "min-h-[156px] sm:min-h-[168px]";
  const actionGridClass = showSecondaryDetails
    ? callHref
      ? "grid-cols-[minmax(0,1fr)_44px_44px]"
      : "grid-cols-[minmax(0,1fr)_44px]"
    : callHref
      ? "grid-cols-[minmax(0,1fr)_44px]"
      : "grid-cols-1";

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
        className={`absolute right-3 top-3 z-30 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/95 shadow-lg transition sm:right-4 sm:top-4 sm:h-11 sm:w-11 ${
          isTogglingFavorite ? "scale-95 opacity-70" : "hover:scale-105"
        }`}
        aria-label={isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
      >
        <Heart className={`h-4 w-4 sm:h-5 sm:w-5 ${isFavorite ? "fill-red-500 text-red-500" : "text-slate-400"}`} />
      </button>

      <div className={`flex ${mediaHeightClass}`}>
        <div className={`relative shrink-0 overflow-hidden border-r border-black/5 ${mediaWidthClass}`}>
          <img src={imageSrc} alt={`Imagen de ${business.name}`} className="h-full w-full object-cover" />
          {isPremium ? (
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/15 to-transparent" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/15 via-transparent to-white/15" />
          )}

          <div className="absolute left-2 top-2 right-2 flex flex-wrap gap-1.5">
            <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${styles.badge}`}>
              {isPremium ? styles.badgeText : getVisibleTierBadgeLabel(planInput)}
            </span>
            {highlight.isPromo ? (
              <span className="inline-flex rounded-full bg-white/92 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8f5b14]">
                Promo
              </span>
            ) : null}
          </div>
        </div>

        <div className={`flex min-w-0 flex-1 flex-col ${styles.content}`}>
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-start gap-3">
              {isPremium ? (
                <img
                  src={logoSrc}
                  alt={`Logo de ${business.name}`}
                  className={`rounded-2xl border border-white/50 object-cover shadow-sm ${plan === "sponsor" ? "h-10 w-10 sm:h-12 sm:w-12" : "h-9 w-9 sm:h-11 sm:w-11"}`}
                />
              ) : (
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl bg-[#eef4ef] text-base sm:h-10 sm:w-10 sm:text-lg">
                  {categoryIcon}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <h3 className={`font-serif font-semibold tracking-tight text-slate-950 ${styles.title}`}>
                  <span className="line-clamp-2">{business.name}</span>
                </h3>

                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-slate-600 sm:gap-2 sm:text-xs">
                  {business.category ? <span className="rounded-full bg-[#eef4ef] px-2.5 py-1 sm:px-3">{business.category}</span> : null}
                  {business.colonia ? <span className="rounded-full bg-slate-100 px-2.5 py-1 sm:px-3">{business.colonia}</span> : null}
                  {ratingValue > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#fbf4e6] px-2.5 py-1 text-[#8f5b14] sm:px-3">
                      <Star className="h-3 w-3 fill-current sm:h-3.5 sm:w-3.5" />
                      {ratingValue.toFixed(1)}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            {highlight.kind !== "none" ? (
              <div className={`mt-3 rounded-[18px] px-3 py-2.5 ${highlightClasses}`}>
                {highlight.label ? (
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] opacity-80">
                    {highlight.label}
                  </p>
                ) : null}
                {highlight.text ? (
                  <p className="mt-1 line-clamp-2 text-[13px] leading-5 sm:text-sm">
                    {highlight.text}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] font-medium sm:gap-2 sm:text-xs">
              {statusChip && highlight.kind !== "status" ? (
                <span className={`rounded-full px-2.5 py-1 sm:px-3 ${statusChip.tone === "open" ? "bg-[#e6f6ed] text-[#0f7a47]" : "bg-red-50 text-red-700 ring-1 ring-red-200"}`}>
                  {statusChip.label}
                </span>
              ) : null}
              {business.hasEnvio ? <span className="rounded-full bg-[#fff3e8] px-2.5 py-1 text-[#a84f0f] sm:px-3">Pedidos o envio</span> : null}
            </div>
          </div>

          <div className={`mt-4 grid gap-2 ${actionGridClass}`}>
            {whatsappHref ? (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex h-10 items-center justify-center gap-2 rounded-2xl px-3 text-[13px] font-semibold transition sm:h-11 sm:px-4 sm:text-sm ${styles.cta}`}
                aria-label={`Enviar mensaje por WhatsApp a ${business.name}`}
                onClick={(event) => {
                  event.stopPropagation();
                  trackCTA("whatsapp", businessId || "", business.name);
                }}
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </a>
            ) : (
              <button
                type="button"
                onClick={handleViewDetails}
                className={`inline-flex h-10 items-center justify-center gap-2 rounded-2xl px-3 text-[13px] font-semibold transition sm:h-11 sm:px-4 sm:text-sm ${styles.cta}`}
              >
                Ver perfil
                <ArrowRight className="h-4 w-4" />
              </button>
            )}

            {showSecondaryDetails ? (
              <button
                type="button"
                onClick={handleViewDetails}
                className="inline-flex h-10 w-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 sm:h-11"
                aria-label={`Ver perfil de ${business.name}`}
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : null}
            {callHref ? (
              <a
                href={callHref}
                className="inline-flex h-10 w-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 sm:h-11"
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
