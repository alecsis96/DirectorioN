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
      <div className="relative h-40 overflow-hidden bg-slate-100 sm:h-52">
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
          <h3 className="mt-2 font-serif text-xl font-semibold tracking-tight text-white sm:text-2xl">
            {promotion.business.name}
          </h3>
          <p className="mt-2 line-clamp-2 text-[13px] leading-5 text-white/85 sm:text-sm sm:leading-6">{promotion.message}</p>
        </div>
      </div>

      <div className="space-y-3 p-4 sm:space-y-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-slate-600 sm:text-xs">
          <span className="rounded-full bg-[#eef4ef] px-2.5 py-1 sm:px-3">{promotion.business.category}</span>
          {promotion.business.colonia ? <span className="rounded-full bg-slate-100 px-2.5 py-1 sm:px-3">{promotion.business.colonia}</span> : null}
          {promotion.promoCode ? <span className="rounded-full bg-[#f7efe0] px-2.5 py-1 text-[#8f5b14] sm:px-3">Codigo: {promotion.promoCode}</span> : null}
        </div>

        <div className="grid gap-2 sm:flex sm:flex-row sm:gap-3">
          {whatsappHref ? (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#0f7a47] px-4 text-[13px] font-semibold text-white transition hover:bg-[#0b6238] sm:h-auto sm:py-3 sm:text-sm"
            >
              <MessageCircle className="h-4 w-4" />
              Enviar WhatsApp
            </a>
          ) : null}
          <Link
            href={businessHref}
            className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 text-[13px] font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-slate-50 sm:h-auto sm:py-3 sm:text-sm"
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
