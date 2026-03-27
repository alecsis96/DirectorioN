'use client';

import { ArrowRight, MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { generateBusinessPlaceholder } from "../../lib/placeholderGenerator";
import { waLink } from "../../lib/helpers/contact";
import { CATEGORIES, resolveCategory } from "../../lib/categoriesCatalog";
import { getVisibleTierBadgeLabel } from "../../lib/businessPlanVisibility";
import type { BusinessPreview } from "../../types/business";
import { resolveCardStatusChip } from "../businessCardContent";

type Props = {
  business: BusinessPreview;
  variant: "free" | "featured" | "sponsor";
  onViewDetails?: (business: BusinessPreview) => void;
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
    wrapper: "rounded-[24px] border border-slate-200 bg-slate-50/65 shadow-[0_4px_14px_rgba(15,23,42,0.04)] transition hover:border-slate-300 hover:shadow-[0_8px_18px_rgba(15,23,42,0.06)]",
    content: "p-3.5 sm:p-4",
    title: "text-base sm:text-lg",
    badge: "border border-slate-200 bg-slate-50 text-slate-500",
    primaryCta: "border border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white",
    showCover: false,
  },
  featured: {
    wrapper: "overflow-hidden rounded-[28px] border border-[#d8c27b] bg-[#fffdf8] shadow-[0_18px_44px_rgba(109,85,28,0.14)] ring-1 ring-[#f6e6b1]/70 transition hover:-translate-y-1 hover:shadow-[0_22px_52px_rgba(109,85,28,0.18)]",
    content: "p-3.5 sm:p-4",
    title: "text-lg sm:text-xl",
    badge: "bg-[#f3e2a7] text-[#6d551c] shadow-[0_6px_16px_rgba(109,85,28,0.16)]",
    primaryCta: "bg-[#162235] text-white shadow-[0_10px_22px_rgba(22,34,53,0.16)] hover:bg-[#0f1928]",
    showCover: true,
  },
  sponsor: {
    wrapper: "overflow-hidden rounded-[32px] border border-[#c79425] bg-[linear-gradient(180deg,#fffaf0_0%,#fff3d8_24%,#ffffff_100%)] shadow-[0_24px_70px_rgba(108,74,17,0.22)] ring-1 ring-[#f4dd98] transition hover:-translate-y-1 hover:shadow-[0_32px_84px_rgba(108,74,17,0.28)]",
    content: "p-3.5 sm:p-4 lg:p-5",
    title: "text-[1.12rem] sm:text-[1.3rem] lg:text-[1.5rem]",
    badge: "bg-[#7a4b00] text-white shadow-[0_10px_22px_rgba(122,75,0,0.26)]",
    primaryCta: "bg-[#0f7a47] text-white shadow-[0_14px_28px_rgba(15,122,71,0.26)] hover:bg-[#0b6238]",
    showCover: true,
  },
} as const;

export default function HomeBusinessCard({ business, variant, onViewDetails }: Props) {
  const router = useRouter();
  const styles = CARD_STYLES[variant];
  const imageSrc = getBusinessImage(business);
  const detailHref = `/negocios/${business.id}`;
  const whatsappHref = business.WhatsApp ? waLink(business.WhatsApp) : null;
  const statusChip = resolveCardStatusChip(business);
  const isInteractive = true;

  const handleOpenDetails = () => {
    if (onViewDetails) {
      onViewDetails(business);
      return;
    }

    router.push(detailHref);
  };

  const handleCardKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleOpenDetails();
    }
  };

  return (
    <article
      className={`${styles.wrapper} cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 active:scale-[0.995]`}
      onClick={handleOpenDetails}
      onKeyDown={handleCardKeyDown}
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      aria-label={`Abrir detalle de ${business.name}`}
    >
      {styles.showCover ? (
          <div className={`relative overflow-hidden ${variant === "sponsor" ? "h-32 sm:h-44" : "h-28 sm:h-36"}`}>
          <img src={imageSrc} alt={business.name} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-slate-950/10 to-transparent" />
            <div className="absolute left-3 top-3 sm:left-4 sm:top-4">
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${styles.badge}`}>
                {getVisibleTierBadgeLabel(business)}
              </span>
            </div>
        </div>
      ) : null}

      <div className={styles.content}>
        <div className="flex items-start gap-3">
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
            <div className="mt-1.5 flex items-start gap-2">
              <h3 className={`min-w-0 flex-1 font-serif font-semibold tracking-tight text-slate-950 ${styles.title}`}>
                <span className="line-clamp-1">{business.name}</span>
              </h3>
              <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center text-slate-300">
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-slate-600 sm:text-xs">
              <span className="rounded-full bg-[#eef4ef] px-2.5 py-1 sm:px-3">{business.category}</span>
              {business.colonia ? <span className="rounded-full bg-slate-100 px-2.5 py-1 sm:px-3">{business.colonia}</span> : null}
            </div>
          </div>
        </div>

        {statusChip ? (
          <div className="mt-2.5">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold sm:px-3 ${
                statusChip.tone === "open" ? "bg-[#e6f6ed] text-[#0f7a47] ring-1 ring-emerald-200" : "bg-red-50 text-red-700 ring-1 ring-red-200"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${statusChip.tone === "open" ? "bg-emerald-500" : "bg-red-500"}`} />
              {statusChip.label}
            </span>
          </div>
        ) : null}

        <div className="mt-3">
          {whatsappHref ? (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex h-9 w-full items-center justify-center gap-2 rounded-2xl px-3 text-[13px] font-semibold transition sm:h-10 sm:px-4 sm:text-sm ${styles.primaryCta}`}
              onClick={(event) => {
                event.stopPropagation();
              }}
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}
