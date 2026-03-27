'use client';

import Link from 'next/link';
import { ArrowRight, MessageCircle, Sparkles } from 'lucide-react';

import { buildCampaignWhatsAppMessage } from '../lib/campaigns';
import { normalizeDigits } from '../lib/helpers/contact';
import { trackBusinessInteraction, trackCTA } from '../lib/telemetry';
import type { CampaignHero } from '../types/campaign';
import type { BusinessPreview } from '../types/business';

type Props = {
  campaign: CampaignHero;
  onOpenBusiness?: (business: BusinessPreview) => void;
  className?: string;
};

export default function CampaignHeroBanner({ campaign, onOpenBusiness, className = '' }: Props) {
  const business = campaign.business;
  const isPremiumTone = campaign.tone === 'premium';
  const badgeLabel = campaign.badgeLabel || 'PROMO';
  const promoCode = campaign.promoCode?.trim();
  const imageUrl = campaign.imageUrl?.trim();
  const businessId = business?.id || '';
  const businessName = business?.name || campaign.title;
  const whatsappMessage = buildCampaignWhatsAppMessage(campaign);
  const whatsappHref =
    campaign.ctaType === 'whatsapp' && business?.WhatsApp
      ? `https://wa.me/${normalizeDigits(business.WhatsApp)}?text=${encodeURIComponent(whatsappMessage)}`
      : null;

  const toneClasses = isPremiumTone
    ? 'border-[#c89624] bg-[linear-gradient(135deg,#fff6df_0%,#f8dc9a_54%,#f2c96b_100%)] shadow-[0_24px_56px_rgba(122,75,0,0.24)] ring-1 ring-[#efcf72]'
    : 'border-emerald-300 bg-[linear-gradient(135deg,#dcf7e9_0%,#b8ebc8_54%,#8fd8aa_100%)] shadow-[0_22px_50px_rgba(15,118,110,0.18)] ring-1 ring-emerald-200';

  const ctaBaseClass =
    'inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold transition sm:w-auto';
  const ctaPrimaryClass =
    'border border-[#0a5c35] bg-[#0f7a47] text-white shadow-[0_14px_30px_rgba(15,122,71,0.32)] hover:bg-[#0b6238]';

  const handleBusinessOpen = () => {
    if (!business) return;
    trackBusinessInteraction('business_card_clicked', business.id, business.name, business.category, {
      surface: 'campaign_hero',
      placement: 'hero',
    });
    onOpenBusiness?.(business);
  };

  return (
    <section className={`mb-6 ${className}`}>
      <article className={`relative overflow-hidden rounded-[30px] border ${toneClasses}`}>
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 ${
            isPremiumTone
              ? 'bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.54),transparent_46%)]'
              : 'bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.42),transparent_44%)]'
          }`}
        />

        {imageUrl ? (
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-28 sm:block sm:w-36">
            <img src={imageUrl} alt="" className="h-full w-full object-cover object-center opacity-90" aria-hidden="true" />
            <div className="absolute inset-0 bg-gradient-to-l from-slate-950/10 via-white/40 to-transparent" />
          </div>
        ) : null}

        <div className="relative flex min-h-[176px] flex-col justify-between gap-4 p-4 sm:min-h-[164px] sm:flex-row sm:items-center sm:gap-6 sm:p-5">
          <div className="min-w-0 flex-1 sm:max-w-[70%]">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/85 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-800 shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              {badgeLabel}
            </div>

            <h2 className="mt-3 text-[1.35rem] font-serif font-semibold leading-tight text-slate-950 sm:text-[1.65rem]">
              <span className="line-clamp-2">{campaign.title}</span>
            </h2>

            {campaign.subtitle ? (
              <p className="mt-2 max-w-[28rem] line-clamp-2 text-sm leading-5 text-slate-800/90">
                {campaign.subtitle}
              </p>
            ) : null}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {promoCode ? (
                <span className="inline-flex items-center rounded-full border border-slate-300/80 bg-white/85 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-800 shadow-sm">
                  Codigo {promoCode}
                </span>
              ) : null}
              <span className="inline-flex items-center rounded-full bg-slate-950/8 px-3 py-1 text-xs font-medium text-slate-800">
                {campaign.urgencyLabel}
              </span>
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[220px] sm:items-end">
            {whatsappHref ? (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className={`${ctaBaseClass} ${ctaPrimaryClass}`}
                onClick={() => {
                  if (businessId) {
                    trackCTA('whatsapp', businessId, businessName);
                  }
                }}
              >
                <MessageCircle className="h-4 w-4" />
                {campaign.ctaLabel}
              </a>
            ) : campaign.ctaType === 'business' && business && onOpenBusiness ? (
              <button type="button" className={`${ctaBaseClass} ${ctaPrimaryClass}`} onClick={handleBusinessOpen}>
                Ver promo
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : campaign.ctaType === 'business' && business ? (
              <Link href={`/negocios/${business.id}`} className={`${ctaBaseClass} ${ctaPrimaryClass}`}>
                Ver promo
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : campaign.ctaType === 'internal' && campaign.ctaValue ? (
              <Link href={campaign.ctaValue} className={`${ctaBaseClass} ${ctaPrimaryClass}`}>
                Ver promo
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : campaign.ctaType === 'external' && campaign.ctaValue ? (
              <a
                href={campaign.ctaValue}
                target="_blank"
                rel="noopener noreferrer"
                className={`${ctaBaseClass} ${ctaPrimaryClass}`}
              >
                Ver promo
                <ArrowRight className="h-4 w-4" />
              </a>
            ) : null}
          </div>
        </div>
      </article>
    </section>
  );
}
