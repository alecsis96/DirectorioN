import Link from "next/link";
import { ArrowRight, MessageCircle, Store, Tag } from "lucide-react";
import { waLink } from "../../lib/helpers/contact";
import { generateBusinessPlaceholder } from "../../lib/placeholderGenerator";
import type { HomePromotion } from "../../lib/homePage";

type Props = {
  promotion: HomePromotion;
};

function getPromotionImage(promotion: HomePromotion) {
  return (
    promotion.business.coverUrl ||
    promotion.business.logoUrl ||
    promotion.business.image1 ||
    generateBusinessPlaceholder(promotion.business.name, promotion.business.category)
  );
}

export default function HomePromotionCard({ promotion }: Props) {
  const businessHref = `/negocios/${promotion.business.id}`;
  const whatsappHref = promotion.business.WhatsApp ? waLink(promotion.business.WhatsApp) : null;
  const imageSrc = getPromotionImage(promotion);
  const isSponsor = promotion.business.plan === "sponsor";

  return (
    <article
      className={`overflow-hidden rounded-[28px] border bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl ${
        isSponsor ? "border-[#e2c16c]" : "border-[#dbe7de]"
      }`}
    >
      <div className="relative h-52 overflow-hidden bg-slate-100">
        <img src={imageSrc} alt={promotion.business.name} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/15 to-transparent" />
        <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-white/92 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
          <Tag className="h-3.5 w-3.5" />
          Promocion activa
        </div>
        <div className="absolute bottom-4 left-4 right-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#f8e7b5]">
            {promotion.urgencyLabel}
          </p>
          <h3 className="mt-2 font-serif text-2xl font-semibold tracking-tight text-white">
            {promotion.business.name}
          </h3>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/85">{promotion.message}</p>
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-600">
          <span className="rounded-full bg-[#eef4ef] px-3 py-1">{promotion.business.category}</span>
          {promotion.business.colonia ? <span className="rounded-full bg-slate-100 px-3 py-1">{promotion.business.colonia}</span> : null}
          {promotion.promoCode ? <span className="rounded-full bg-[#f7efe0] px-3 py-1 text-[#8f5b14]">Codigo: {promotion.promoCode}</span> : null}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          {whatsappHref ? (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#0f7a47] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#0b6238]"
            >
              <MessageCircle className="h-4 w-4" />
              Pedir por WhatsApp
            </a>
          ) : null}
          <Link
            href={businessHref}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <Store className="h-4 w-4" />
            Ver negocio
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}
