import Link from "next/link";
import { ArrowRight, MessageCircle, Phone, Star } from "lucide-react";
import { generateBusinessPlaceholder } from "../../lib/placeholderGenerator";
import { normalizeDigits, waLink } from "../../lib/helpers/contact";
import { CATEGORIES, resolveCategory } from "../../lib/categoriesCatalog";
import { getVisibleTierBadgeLabel } from "../../lib/businessPlanVisibility";
import type { BusinessPreview } from "../../types/business";
import { resolveCardHighlight, resolveCardStatusChip } from "../businessCardContent";

type Props = {
  business: BusinessPreview;
  variant: "free" | "featured" | "sponsor";
};

function getBusinessImage(business: BusinessPreview) {
  return (
    business.coverUrl ||
    business.logoUrl ||
    business.image1 ||
    generateBusinessPlaceholder(business.name, business.category)
  );
}

function getCategoryIcon(business: BusinessPreview) {
  const resolved = resolveCategory(business.categoryId || business.categoryName || business.category);
  const category = CATEGORIES.find((item) => item.id === resolved.categoryId);

  return category?.icon ?? "🏪";
}

const CARD_STYLES = {
  free: {
    wrapper: "rounded-[26px] border border-slate-200 bg-slate-50/70 shadow-[0_8px_22px_rgba(15,23,42,0.05)] transition hover:border-slate-300 hover:shadow-[0_12px_28px_rgba(15,23,42,0.08)]",
    content: "p-4 sm:p-5",
    title: "text-base sm:text-lg",
    badge: "border border-slate-200 bg-slate-50 text-slate-500",
    primaryCta: "border border-slate-300 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-100",
    showCover: false,
  },
  featured: {
    wrapper: "overflow-hidden rounded-[28px] border border-[#d8c27b] bg-[#fffdf8] shadow-[0_20px_60px_rgba(109,85,28,0.12)] transition hover:-translate-y-1 hover:shadow-xl",
    content: "p-4 sm:p-5",
    title: "text-xl sm:text-2xl",
    badge: "bg-[#f3e2a7] text-[#6d551c]",
    primaryCta: "bg-[#1d2a3b] text-white hover:bg-[#121d2b]",
    showCover: true,
  },
  sponsor: {
    wrapper: "overflow-hidden rounded-[32px] border border-[#c79425] bg-[linear-gradient(180deg,#fffaf0_0%,#fff3d8_30%,#ffffff_100%)] shadow-[0_30px_100px_rgba(108,74,17,0.22)] ring-1 ring-[#f4dd98]/80 transition hover:-translate-y-1 hover:shadow-[0_38px_110px_rgba(108,74,17,0.28)]",
    content: "p-4 sm:p-5 lg:p-6",
    title: "text-[1.35rem] sm:text-[1.6rem] lg:text-[1.9rem]",
    badge: "bg-[#7a4b00] text-white shadow-[0_8px_20px_rgba(122,75,0,0.24)]",
    primaryCta: "bg-[#0f7a47] text-white shadow-[0_12px_26px_rgba(15,122,71,0.24)] hover:bg-[#0b6238]",
    showCover: true,
  },
} as const;

export default function HomeBusinessCard({ business, variant }: Props) {
  const styles = CARD_STYLES[variant];
  const imageSrc = getBusinessImage(business);
  const detailHref = `/negocios/${business.id}`;
  const whatsappHref = business.WhatsApp ? waLink(business.WhatsApp) : null;
  const callHref = business.phone ? `tel:${normalizeDigits(business.phone)}` : null;
  const ratingValue = typeof business.rating === "number" && Number.isFinite(business.rating) ? business.rating : 0;
  const statusChip = resolveCardStatusChip(business);
  const highlight = resolveCardHighlight(business, variant);
  const highlightClasses =
    highlight.kind === "promo"
      ? variant === "sponsor"
        ? "border border-[#d5b15a] bg-[#fff1cc] text-[#6f4b10]"
        : variant === "featured"
          ? "border border-[#e4cf8d] bg-[#fff8e7] text-[#7b5a16]"
          : "border border-[#f2d2b8] bg-[#fff3e8] text-[#a84f0f]"
      : highlight.kind === "neutral"
        ? variant === "sponsor"
          ? "border border-[#e4c56f] bg-[#fff8e7] text-[#6f4b10]"
          : "border border-slate-200 bg-slate-50 text-slate-700"
        : highlight.kind === "status"
          ? statusChip?.tone === "open"
            ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border border-red-200 bg-red-50 text-red-700"
          : "border border-slate-200 bg-white text-slate-700";
  const showSecondaryDetails = Boolean(whatsappHref);
  const actionGridClass = showSecondaryDetails
    ? callHref
      ? "grid-cols-[minmax(0,1fr)_44px_44px]"
      : "grid-cols-[minmax(0,1fr)_44px]"
    : callHref
      ? "grid-cols-[minmax(0,1fr)_44px]"
      : "grid-cols-1";

  return (
    <article className={styles.wrapper}>
      {styles.showCover ? (
        <div className={`relative overflow-hidden ${variant === "sponsor" ? "h-44 sm:h-64" : "h-36 sm:h-52"}`}>
          <img src={imageSrc} alt={business.name} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/20 to-transparent" />
          <div className="absolute left-4 top-4">
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${styles.badge}`}>
              {getVisibleTierBadgeLabel(business)}
            </span>
          </div>
          {highlight.isPromo ? (
            <div className="absolute bottom-4 left-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-[#8f5b14]">
              Promo activa
            </div>
          ) : null}
        </div>
      ) : null}

      <div className={styles.content}>
        <div className="flex items-start gap-3 sm:gap-4">
          {variant === "free" ? (
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-[#eef4ef] text-lg sm:h-14 sm:w-14 sm:text-2xl">
              {getCategoryIcon(business)}
            </div>
          ) : (
            <img
              src={business.logoUrl || business.image1 || imageSrc}
              alt={business.name}
              className={`rounded-2xl border border-white/40 object-cover shadow-sm ${variant === "sponsor" ? "h-12 w-12 sm:h-16 sm:w-16" : "h-10 w-10 sm:h-14 sm:w-14"}`}
            />
          )}

          <div className="min-w-0 flex-1">
            {variant === "free" ? (
              <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] sm:px-3 sm:text-[11px] ${styles.badge}`}>
                Perfil base
              </span>
            ) : null}
            <h3 className={`mt-2 font-serif font-semibold tracking-tight text-slate-950 sm:mt-3 ${styles.title}`}>
              {business.name}
            </h3>
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-slate-600 sm:mt-3 sm:gap-2 sm:text-xs">
              <span className="rounded-full bg-[#eef4ef] px-2.5 py-1 sm:px-3">{business.category}</span>
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
          <div className={`mt-3 rounded-[20px] px-3 py-2.5 sm:mt-4 ${highlightClasses}`}>
            {highlight.label ? (
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-80">
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

        <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] font-medium sm:mt-4 sm:gap-2 sm:text-xs">
          {statusChip && highlight.kind !== "status" ? (
            <span
              className={`rounded-full px-2.5 py-1 sm:px-3 ${
                statusChip.tone === "open" ? "bg-[#e6f6ed] text-[#0f7a47]" : "bg-red-50 text-red-700 ring-1 ring-red-200"
              }`}
            >
              {statusChip.label}
            </span>
          ) : null}
          {business.hasEnvio ? <span className="rounded-full bg-[#fff3e8] px-2.5 py-1 text-[#a84f0f] sm:px-3">Pedidos o envio</span> : null}
        </div>

        <div className={`mt-4 grid gap-2 sm:mt-5 sm:gap-3 ${actionGridClass}`}>
          {whatsappHref ? (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex h-10 items-center justify-center gap-2 rounded-2xl px-3 text-[13px] font-semibold transition sm:h-11 sm:px-4 sm:text-sm ${styles.primaryCta}`}
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </a>
          ) : (
            <Link
              href={detailHref}
              className={`inline-flex h-10 items-center justify-center gap-2 rounded-2xl px-3 text-[13px] font-semibold transition sm:h-11 sm:px-4 sm:text-sm ${styles.primaryCta}`}
            >
              Ver negocio
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}

          {showSecondaryDetails ? (
            <Link
              href={detailHref}
              className="inline-flex h-10 w-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 sm:h-11"
              aria-label={`Ver perfil de ${business.name}`}
            >
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : null}
          {callHref ? (
            <a
              href={callHref}
              className="inline-flex h-10 w-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 sm:h-11"
              aria-label={`Llamar a ${business.name}`}
            >
              <Phone className="h-4 w-4" />
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}
