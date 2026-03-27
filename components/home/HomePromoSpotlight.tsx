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
      <div className="relative h-60 overflow-hidden sm:h-72">
        <img src={imageSrc} alt={promotion.business.name} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/25 to-transparent" />
        <div className="absolute left-5 top-5 inline-flex items-center gap-2 rounded-full bg-white/92 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#8f5b14]">
          <Tag className="h-3.5 w-3.5" />
          Promo activa hoy
        </div>
        <div className="absolute bottom-5 left-5 right-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#f8e7b5]">{promotion.urgencyLabel}</p>
          <h3 className="mt-3 text-[1.7rem] font-bold tracking-tight text-white sm:text-3xl">{promotion.business.name}</h3>
          <p className="mt-3 max-w-xl text-[13px] leading-5 text-white/85 sm:text-sm sm:leading-6">{promotion.message}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 p-5 sm:gap-4 sm:p-6">
        <div className="flex flex-wrap gap-2 text-[11px] font-medium text-slate-600 sm:text-xs">
          <span className="rounded-full bg-[#eef4ef] px-2.5 py-1 sm:px-3">{promotion.business.category}</span>
          {promotion.business.colonia ? <span className="rounded-full bg-slate-100 px-2.5 py-1 sm:px-3">{promotion.business.colonia}</span> : null}
          {promotion.promoCode ? <span className="rounded-full bg-[#f7efe0] px-2.5 py-1 text-[#8f5b14] sm:px-3">Codigo: {promotion.promoCode}</span> : null}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
          {whatsappHref ? (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-[18px] bg-[#0f7a47] px-5 text-sm font-semibold text-white transition hover:bg-[#0b6238] sm:h-auto sm:py-4"
            >
              <MessageCircle className="h-4 w-4" />
              Enviar WhatsApp
            </a>
          ) : null}
          <Link
            href={businessHref}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-[18px] border border-slate-200 px-5 text-sm font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-slate-50 sm:h-auto sm:py-4"
          >
            Ver negocio
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}
