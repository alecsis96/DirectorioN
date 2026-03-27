'use client';

import Link from 'next/link';
import { ArrowRight, MessageCircle } from 'lucide-react';

import { buildCampaignWhatsAppMessage } from '../lib/campaigns';
import { normalizeDigits } from '../lib/helpers/contact';
import { trackBusinessInteraction, trackCTA } from '../lib/telemetry';
import type { CampaignHero } from '../types/campaign';
import type { BusinessPreview } from '../types/business';

type Props = {
  campaign: CampaignHero;
  onOpenBusiness?: (business: BusinessPreview) => void;
};

export default function CampaignOfferCard({ campaign, onOpenBusiness }: Props) {
  const business = campaign.business;
  const promoCode = campaign.promoCode?.trim();
  const imageUrl = campaign.imageUrl?.trim();
  const businessName = business?.name || '';
  const whatsappMessage = buildCampaignWhatsAppMessage(campaign);
  const whatsappHref =
    campaign.ctaType === 'whatsapp' && business?.WhatsApp
      ? `https://wa.me/${normalizeDigits(business.WhatsApp)}?text=${encodeURIComponent(whatsappMessage)}`
      : null;

  const handleBusinessOpen = () => {
    if (!business) return;
    trackBusinessInteraction('business_card_clicked', business.id, business.name, business.category, {
      surface: 'campaign_offers',
      placement: 'carousel',
    });
    onOpenBusiness?.(business);
  };

  const cardToneClasses =
    campaign.tone === 'premium'
      ? 'border-amber-200 bg-[linear-gradient(155deg,#fff9ea_0%,#fff0c5_58%,#f5d984_100%)] shadow-[0_16px_32px_rgba(120,88,18,0.14)]'
      : 'border-emerald-200 bg-[linear-gradient(155deg,#f2fff8_0%,#d8f7e5_56%,#b6e9cb_100%)] shadow-[0_16px_30px_rgba(16,118,82,0.12)]';

  const ctaClasses =
    campaign.tone === 'premium'
      ? 'bg-[#0f7a47] text-white shadow-[0_10px_22px_rgba(15,122,71,0.28)] hover:bg-[#0b6238]'
      : 'bg-emerald-600 text-white shadow-[0_10px_22px_rgba(5,150,105,0.22)] hover:bg-emerald-700';

  return (
    <article
      className={`group relative flex min-h-[226px] snap-start flex-col overflow-hidden rounded-[28px] border ${cardToneClasses} p-3.5 transition-transform duration-200 hover:-translate-y-0.5 sm:min-h-[236px]`}
    >
      {imageUrl ? (
        <>
          <img
            src={imageUrl}
            alt=""
            loading="lazy"
            className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center opacity-22"
            aria-hidden="true"
          />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.28),rgba(255,255,255,0.88)_55%,rgba(255,255,255,0.97)_100%)]" />
        </>
      ) : (
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 ${
            campaign.tone === 'premium'
              ? 'bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.58),transparent_42%)]'
              : 'bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.42),transparent_42%)]'
          }`}
        />
      )}

      <div className="relative flex h-full flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="inline-flex items-center rounded-full bg-white/88 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-800 shadow-sm">
            {campaign.badgeLabel || 'HOY'}
          </div>
          {promoCode ? (
            <div className="rounded-full bg-slate-950/8 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-800">
              {promoCode}
            </div>
          ) : null}
        </div>

        <div className="mt-4 flex-1">
          <h3 className="line-clamp-2 text-[1.08rem] font-semibold leading-tight text-slate-950">
            {campaign.title}
          </h3>

          {businessName ? (
            <p className="mt-2 line-clamp-1 text-xs font-medium uppercase tracking-[0.12em] text-slate-700/80">
              {businessName}
            </p>
          ) : null}
        </div>

        <div className="mt-4 flex items-end justify-between gap-3">
          {whatsappHref ? (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex h-10 min-w-[148px] items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold transition ${ctaClasses}`}
              onClick={() => {
                if (business?.id) {
                  trackCTA('whatsapp', business.id, business.name);
                }
              }}
            >
              <MessageCircle className="h-4 w-4" />
              {campaign.ctaLabel}
            </a>
          ) : campaign.ctaType === 'business' && business && onOpenBusiness ? (
            <button
              type="button"
              onClick={handleBusinessOpen}
              className={`inline-flex h-10 min-w-[148px] items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold transition ${ctaClasses}`}
            >
              Ver promo
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : campaign.ctaType === 'business' && business ? (
            <Link
              href={`/negocios/${business.id}`}
              className={`inline-flex h-10 min-w-[148px] items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold transition ${ctaClasses}`}
            >
              Ver promo
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : campaign.ctaType === 'internal' && campaign.ctaValue ? (
            <Link
              href={campaign.ctaValue}
              className={`inline-flex h-10 min-w-[148px] items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold transition ${ctaClasses}`}
            >
              Ver promo
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : campaign.ctaType === 'external' && campaign.ctaValue ? (
            <a
              href={campaign.ctaValue}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex h-10 min-w-[148px] items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold transition ${ctaClasses}`}
            >
              Ver promo
              <ArrowRight className="h-4 w-4" />
            </a>
          ) : (
            <div className="h-10" />
          )}

          <div className="text-right">
            <p className="text-[11px] font-medium text-slate-700/80">{campaign.urgencyLabel}</p>
          </div>
        </div>
      </div>
    </article>
  );
}
