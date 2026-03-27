'use client';

import CampaignHeroBanner from '../../CampaignHeroBanner';
import type { CampaignAudience, CampaignHero, CampaignInput } from '../../../types/campaign';
import type { BusinessPreview } from '../../../types/business';
import { resolveVisibleTier } from '../../../lib/businessPlanVisibility';

type Props = {
  draft: CampaignInput;
  business?: BusinessPreview;
};

function resolvePreviewTone(business?: BusinessPreview) {
  if (!business) return 'neutral' as const;
  return resolveVisibleTier(business.plan || 'free') === 'premium' ? 'premium' as const : 'neutral' as const;
}

function buildHeroPreview(draft: CampaignInput, business?: BusinessPreview): CampaignHero {
  return {
    id: 'preview',
    source: 'firestore_campaign',
    placement: 'hero',
    status: 'active',
    message: draft.description || draft.title || 'Vista previa de campana',
    promoCode: draft.promoCode || undefined,
    urgencyLabel: draft.endsAt ? 'Consulta vigencia hoy' : 'Disponible por tiempo limitado',
    title: draft.title || 'Titulo de campana',
    subtitle: draft.subtitle || undefined,
    badgeLabel: draft.badge || 'PROMO',
    ctaType: draft.ctaType,
    ctaLabel: draft.ctaLabel || 'Ver promo',
    ctaValue: draft.ctaValue || undefined,
    imageUrl: draft.mobileImageUrl || draft.imageUrl || business?.coverUrl || business?.logoUrl || business?.image1 || null,
    tone: resolvePreviewTone(business),
    priority: draft.priority,
    isActive: draft.isActive,
    startsAt: draft.startsAt,
    endsAt: draft.endsAt,
    updatedAt: new Date().toISOString(),
    business,
  };
}

function OffersPreviewCard({
  title,
  subtitle,
  badge,
  promoCode,
  imageUrl,
  audience,
}: {
  title: string;
  subtitle?: string;
  badge?: string;
  promoCode?: string;
  imageUrl?: string | null;
  audience: CampaignAudience;
}) {
  return (
    <article className="overflow-hidden rounded-3xl border border-amber-200 bg-[linear-gradient(135deg,#fffdf3_0%,#fff4d4_100%)] shadow-[0_18px_44px_rgba(120,88,18,0.12)]">
      <div className="relative aspect-[1.2/1] bg-amber-100">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="h-full w-full object-cover object-center" />
        ) : (
          <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_top,#fde68a,transparent_55%),linear-gradient(135deg,#fff6d6_0%,#fde68a_100%)] text-amber-950">
            <span className="rounded-full bg-white/70 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em]">
              Oferta activa
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-slate-950/10 to-transparent" />
        <div className="absolute left-3 top-3 inline-flex items-center rounded-full bg-white/90 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-800">
          {badge || 'OFERTA'}
        </div>
        <div className="absolute inset-x-0 bottom-0 p-4 text-white">
          <h3 className="line-clamp-2 text-lg font-semibold leading-tight">{title || 'Titulo de oferta'}</h3>
          {subtitle ? <p className="mt-1 line-clamp-2 text-sm text-white/85">{subtitle}</p> : null}
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          {promoCode ? (
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">Codigo {promoCode}</p>
          ) : null}
          <p className="text-xs text-slate-500">Audiencia: {audience === 'all' ? 'Todos' : audience}</p>
        </div>
        <div className="inline-flex h-10 items-center justify-center rounded-2xl bg-[#0f7a47] px-4 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(15,122,71,0.18)]">
          CTA principal
        </div>
      </div>
    </article>
  );
}

export default function CampaignPreview({ draft, business }: Props) {
  const title = draft.title.trim();
  const subtitle = draft.subtitle?.trim();
  const imageUrl = draft.mobileImageUrl?.trim() || draft.imageUrl?.trim() || business?.coverUrl || business?.logoUrl || business?.image1 || null;

  return (
    <div className="rounded-[28px] border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Preview</p>
          <h3 className="text-lg font-semibold text-gray-900">Como se veria la campana</h3>
        </div>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
          {draft.placement === 'hero_banner' ? 'Hero banner' : 'Offers carousel'}
        </span>
      </div>

      {draft.placement === 'hero_banner' ? (
        <div className="pointer-events-none">
          <CampaignHeroBanner campaign={buildHeroPreview(draft, business)} className="mb-0" />
        </div>
      ) : (
        <OffersPreviewCard
          title={title || 'Titulo de oferta'}
          subtitle={subtitle || undefined}
          badge={draft.badge || undefined}
          promoCode={draft.promoCode || undefined}
          imageUrl={imageUrl}
          audience={draft.audience}
        />
      )}
    </div>
  );
}
