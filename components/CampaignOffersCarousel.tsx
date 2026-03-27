'use client';

import type { CampaignHero } from '../types/campaign';
import type { BusinessPreview } from '../types/business';
import CampaignOfferCard from './CampaignOfferCard';

type Props = {
  campaigns: CampaignHero[];
  onOpenBusiness?: (business: BusinessPreview) => void;
  className?: string;
};

export default function CampaignOffersCarousel({
  campaigns,
  onOpenBusiness,
  className = '',
}: Props) {
  if (!campaigns.length) return null;

  return (
    <section className={`mb-8 ${className}`}>
      <div className="mb-3 flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-600">Ofertas activas</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">Promos para pedir mas rapido</h2>
        </div>
        <p className="hidden text-sm text-slate-500 sm:block">Desliza y toca para abrir la promo</p>
      </div>

      <div className="-mx-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:px-0">
        <div className="flex snap-x snap-mandatory gap-3 sm:gap-4">
          {campaigns.map((campaign) => (
            <div key={campaign.id} className="w-[84vw] max-w-[290px] flex-none sm:w-[290px]">
              <CampaignOfferCard campaign={campaign} onOpenBusiness={onOpenBusiness} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
