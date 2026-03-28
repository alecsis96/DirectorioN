'use client';

import { MessageCircle } from "lucide-react";
import { FaMotorcycle } from "react-icons/fa";
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
    wrapper: "rounded-[24px] border border-gray-200 bg-white shadow-[0_4px_14px_rgba(15,23,42,0.04)] transition hover:border-gray-300 hover:shadow-[0_8px_18px_rgba(15,23,42,0.06)]",
    content: "p-3.5 sm:p-4",
    title: "text-base sm:text-lg",
    badge: "border border-gray-200 bg-gray-100 text-gray-600",
    primaryCta: "border border-gray-300 bg-transparent text-gray-700 hover:bg-gray-50",
    showCover: false,
  },
  featured: {
    wrapper: "overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-[0_14px_30px_rgba(15,23,42,0.08)] transition hover:-translate-y-1 hover:shadow-[0_18px_36px_rgba(15,23,42,0.12)]",
    content: "p-3.5 sm:p-4",
    title: "text-lg sm:text-xl",
    badge: "border border-gray-300 bg-white/95 text-gray-700 shadow-[0_4px_10px_rgba(15,23,42,0.06)]",
    primaryCta: "bg-green-600 text-white shadow-[0_12px_24px_rgba(22,163,74,0.24)] hover:bg-green-700",
    showCover: true,
  },
  sponsor: {
    wrapper: "overflow-hidden rounded-[32px] border border-gray-200 bg-white shadow-[0_18px_42px_rgba(15,23,42,0.1)] transition hover:-translate-y-1 hover:shadow-[0_22px_50px_rgba(15,23,42,0.14)]",
    content: "p-3.5 sm:p-4 lg:p-5",
    title: "text-[1.12rem] sm:text-[1.3rem] lg:text-[1.5rem]",
    badge: "border border-gray-300 bg-white/95 text-gray-800 shadow-[0_4px_12px_rgba(15,23,42,0.08)]",
    primaryCta: "bg-green-600 text-white shadow-[0_14px_28px_rgba(22,163,74,0.28)] hover:bg-green-700",
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
  const hasEnvio = business.hasEnvio === true;
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
      className={`${styles.wrapper} cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/60 focus-visible:ring-offset-2 active:scale-[0.995]`}
      onClick={handleOpenDetails}
      onKeyDown={handleCardKeyDown}
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      aria-label={`Abrir detalle de ${business.name}`}
    >
      {styles.showCover ? (
          <div className={`relative overflow-hidden ${variant === "sponsor" ? "h-[7.5rem] sm:h-[9.5rem]" : "h-[6.75rem] sm:h-[8.5rem]"}`}>
          <img src={imageSrc} alt={business.name} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/5 via-transparent to-transparent" />
            <div className="absolute left-3 top-3 sm:left-4 sm:top-4">
              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${styles.badge}`}>
                {getVisibleTierBadgeLabel(business)}
              </span>
            </div>
        </div>
      ) : null}

      <div className={styles.content}>
        <div className="flex items-start gap-3">
          {variant === "free" ? (
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-gray-100 text-lg sm:h-14 sm:w-14 sm:text-2xl">
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
            <div className="mt-1.5 flex items-start gap-2">
              <h3 className={`min-w-0 flex-1 font-bold tracking-tight text-gray-900 ${styles.title}`}>
                <span className="line-clamp-1">{business.name}</span>
              </h3>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium text-gray-500">
              {business.category ? <span className="line-clamp-1">{business.category}</span> : null}
              {business.category && business.colonia ? <span className="text-gray-300">•</span> : null}
              {business.colonia ? <span className="line-clamp-1">{business.colonia}</span> : null}
            </div>
          </div>
        </div>

        {statusChip || hasEnvio ? (
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {statusChip ? (
              <span
                className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${
                  statusChip.tone === "open" ? "text-green-700" : "text-red-700"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${statusChip.tone === "open" ? "bg-green-600" : "bg-red-600"}`} />
                {statusChip.label}
              </span>
            ) : null}
            {hasEnvio ? (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                  variant === "free"
                    ? "border-gray-200 bg-gray-100 text-gray-600"
                    : "border-orange-200 bg-orange-50 text-orange-600"
                }`}
              >
                <FaMotorcycle className="h-3.5 w-3.5" />
                Envio
              </span>
            ) : null}
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
