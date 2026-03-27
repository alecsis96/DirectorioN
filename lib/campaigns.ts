import type { Business, BusinessPreview } from "../types/business";
import { pickBusinessPreview } from "../types/business";
import type { CampaignHero, CampaignPlacement, CampaignPreview } from "../types/campaign";
import { asPlanInput, getLegacyPlanPriority, resolveVisibleTier } from "./businessPlanVisibility";

const PROMO_CODE_REGEX = /(?:codigo|code)\s*[:\-]?\s*([A-Z0-9-]{3,})/i;

function asText(value: unknown): string {
  if (typeof value !== "string") return "";

  return value.replace(/\s+/g, " ").replace(/[|]+/g, " ").trim();
}

function asDateValue(value: unknown): number | null {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return value.getTime();
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function getCampaignBadgeLabel(message: string): string {
  const lowerMessage = message.toLowerCase();

  if (/(fin de semana|weekend)/.test(lowerMessage)) return "FIN DE SEMANA";
  if (/(nuevo|nueva|estrena|estreno)/.test(lowerMessage)) return "NUEVO";
  if (/(hoy|solo hoy|aprovecha hoy)/.test(lowerMessage)) return "HOY";

  return "PROMO";
}

function getCampaignSubtitle(business: BusinessPreview): string {
  const parts = [business.name, business.colonia].filter(Boolean);

  return parts.join(" · ");
}

function isCampaignCurrentlyActive(campaign: Pick<CampaignHero, "isActive" | "startsAt" | "endsAt">, now = Date.now()): boolean {
  if (campaign.isActive === false) return false;

  const startsAt = asDateValue(campaign.startsAt);
  const endsAt = asDateValue(campaign.endsAt);

  if (startsAt && now < startsAt) return false;
  if (endsAt && now > endsAt) return false;

  return true;
}

function compareCampaignPriority(left: CampaignHero, right: CampaignHero): number {
  if (left.priority !== right.priority) {
    return right.priority - left.priority;
  }

  const leftUpdated = asDateValue(left.updatedAt) ?? 0;
  const rightUpdated = asDateValue(right.updatedAt) ?? 0;

  return rightUpdated - leftUpdated;
}

export function getBusinessPromotionMessage(business: Pick<Business | BusinessPreview, "promocionesActivas">): string {
  return asText(business.promocionesActivas);
}

export function getCampaignUrgencyLabel(message: string): string {
  const lowerMessage = message.toLowerCase();

  if (/(solo|hoy|ultima|ultimos|vigente|hasta|aprovecha)/.test(lowerMessage)) {
    return "Consulta vigencia hoy";
  }

  return "Pregunta disponibilidad por WhatsApp";
}

export function resolveBusinessCampaign(
  business: Pick<Business | BusinessPreview, "promocionesActivas">,
  placement: CampaignPlacement = "card"
): CampaignPreview | null {
  const message = getBusinessPromotionMessage(business);

  if (!message) return null;

  const promoCodeMatch = message.match(PROMO_CODE_REGEX);

  return {
    source: "business_promotion",
    placement,
    status: "active",
    message,
    promoCode: promoCodeMatch?.[1],
    urgencyLabel: getCampaignUrgencyLabel(message),
  };
}

export function buildCampaignWhatsAppMessage(campaign: Pick<CampaignHero, "title" | "promoCode" | "business">): string {
  const businessName = campaign.business?.name?.trim();
  const promoReference = campaign.promoCode ? ` la promo ${campaign.promoCode}` : " la promo";
  const businessReference = businessName ? ` de ${businessName}` : "";

  return `Hola, vi${promoReference}${businessReference} en YajaGon y quiero más información.`;
}

export function resolveBusinessHeroCampaign(business: Business | BusinessPreview): CampaignHero | null {
  const preview = "ownerEmail" in business ? pickBusinessPreview(business as Business) : (business as BusinessPreview);
  const campaign = resolveBusinessCampaign(business, "hero");

  if (!campaign) return null;

  const priority = getLegacyPlanPriority(asPlanInput(business)) * 10 + (preview.WhatsApp ? 3 : 0) + (preview.coverUrl ? 1 : 0);
  const tone = resolveVisibleTier(asPlanInput(business)) === "premium" ? "premium" : "neutral";

  return {
    ...campaign,
    id: `hero-${preview.id}`,
    placement: "hero",
    title: campaign.message,
    subtitle: getCampaignSubtitle(preview),
    badgeLabel: getCampaignBadgeLabel(campaign.message),
    ctaType: preview.WhatsApp ? "whatsapp" : "business",
    ctaLabel: preview.WhatsApp ? "Pedir por WhatsApp" : "Ver negocio",
    imageUrl: preview.coverUrl || preview.logoUrl || preview.image1 || null,
    tone,
    priority,
    isActive: true,
    updatedAt: "updatedAt" in business ? business.updatedAt : undefined,
    business: preview,
  };
}

export function getActiveHeroCampaign(
  campaigns: Array<CampaignHero | null | undefined>,
  now = Date.now()
): CampaignHero | null {
  return (
    campaigns
      .filter((campaign): campaign is CampaignHero => Boolean(campaign))
      .filter((campaign) => campaign.placement === "hero")
      .filter((campaign) => isCampaignCurrentlyActive(campaign, now))
      .sort(compareCampaignPriority)[0] ?? null
  );
}

export function getActiveHeroCampaignFromBusinesses(businesses: Array<Business | BusinessPreview>): CampaignHero | null {
  return getActiveHeroCampaign(businesses.map(resolveBusinessHeroCampaign));
}

export function getLegacyHeroCampaignFallback(businesses: Array<Business | BusinessPreview>): CampaignHero | null {
  return getActiveHeroCampaignFromBusinesses(businesses);
}
