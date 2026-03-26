import Link from "next/link";
import { ArrowRight, MessageCircle, Tag } from "lucide-react";
import { waLink } from "../../lib/helpers/contact";
import { generateBusinessPlaceholder } from "../../lib/placeholderGenerator";
import type { HomePromotion } from "../../lib/homePage";

type Props = {
  promotion: HomePromotion;
};

function getPromoImage(promotion: HomePromotion) {
  return (
    promotion.business.coverUrl ||
    promotion.business.logoUrl ||
    promotion.business.image1 ||
    generateBusinessPlaceholder(promotion.business.name, promotion.business.category)
  );
}

export default function HomePromoSpotlight({ promotion }: Props) {
  const businessHref = `/negocios/${promotion.business.id}`;
  const whatsappHref = promotion.business.WhatsApp ? waLink(promotion.business.WhatsApp) : null;
  const imageSrc = getPromoImage(promotion);

  return (
    <article className="overflow-hidden rounded-[32px] border border-[#d9c58f] bg-[linear-gradient(180deg,#fff8ea_0%,#ffffff_100%)] shadow-[0_28px_90px_rgba(108,74,17,0.14)]">
      <div className="relative h-72 overflow-hidden">
        <img src={imageSrc} alt={promotion.business.name} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/25 to-transparent" />
        <div className="absolute left-5 top-5 inline-flex items-center gap-2 rounded-full bg-white/92 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#8f5b14]">
          <Tag className="h-3.5 w-3.5" />
          Promo activa hoy
        </div>
        <div className="absolute bottom-5 left-5 right-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#f8e7b5]">{promotion.urgencyLabel}</p>
          <h3 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-white">{promotion.business.name}</h3>
          <p className="mt-3 max-w-xl text-sm leading-6 text-white/85">{promotion.message}</p>
        </div>
      </div>

      <div className="flex flex-col gap-4 p-6">
        <div className="flex flex-wrap gap-2 text-xs font-medium text-slate-600">
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
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-[18px] bg-[#0f7a47] px-5 py-4 text-sm font-semibold text-white transition hover:bg-[#0b6238]"
            >
              <MessageCircle className="h-4 w-4" />
              Pedir por WhatsApp
            </a>
          ) : null}
          <Link
            href={businessHref}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-[18px] border border-slate-200 px-5 py-4 text-sm font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Ver negocio
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}
