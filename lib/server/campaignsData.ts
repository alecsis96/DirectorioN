import { getAdminFirestore } from "./firebaseAdmin";
import { serializeTimestamps } from "./serializeFirestore";
import type { Business, BusinessPreview } from "../../types/business";
import { pickBusinessPreview } from "../../types/business";
import type {
  CampaignAudience,
  CampaignDisplayStatus,
  CampaignDocumentPlacement,
  CampaignHero,
  CampaignInput,
  CampaignRecord,
} from "../../types/campaign";
import { getLegacyHeroCampaignFallback as getLegacyCampaignHeroFromBusinesses } from "../campaigns";
import { asPlanInput, resolveVisibleTier } from "../businessPlanVisibility";

const CAMPAIGNS_COLLECTION = "campaigns";
const VALID_PLACEMENTS: CampaignDocumentPlacement[] = ["hero_banner", "offers_carousel"];
const VALID_AUDIENCES: CampaignAudience[] = ["all", "mobile", "desktop"];
const VALID_CTA_TYPES = ["whatsapp", "business", "internal", "external"] as const;

type ListCampaignsOptions = {
  placement?: CampaignDocumentPlacement;
  audience?: CampaignAudience;
  activeOnly?: boolean;
};

function asText(value: unknown): string {
  if (typeof value !== "string") return "";

  return value.trim();
}

function asOptionalText(value: unknown): string | undefined {
  const text = asText(value);
  return text.length ? text : undefined;
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function asBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "si") return true;
    if (normalized === "false" || normalized === "no") return false;
  }
  return fallback;
}

function toIsoString(value: unknown): string | undefined {
  const serialized = serializeTimestamps(value);
  return typeof serialized === "string" && serialized.trim() ? serialized : undefined;
}

function isValidPlacement(value: unknown): value is CampaignDocumentPlacement {
  return typeof value === "string" && VALID_PLACEMENTS.includes(value as CampaignDocumentPlacement);
}

function isValidAudience(value: unknown): value is CampaignAudience {
  return typeof value === "string" && VALID_AUDIENCES.includes(value as CampaignAudience);
}

function isValidCtaType(value: unknown): value is CampaignRecord["ctaType"] {
  return typeof value === "string" && VALID_CTA_TYPES.includes(value as CampaignRecord["ctaType"]);
}

function isWithinActiveWindow(startsAt?: string, endsAt?: string, now = Date.now()): boolean {
  const startsValue = startsAt ? Date.parse(startsAt) : NaN;
  const endsValue = endsAt ? Date.parse(endsAt) : NaN;

  if (startsAt && !Number.isFinite(startsValue)) return false;
  if (endsAt && !Number.isFinite(endsValue)) return false;
  if (Number.isFinite(startsValue) && now < startsValue) return false;
  if (Number.isFinite(endsValue) && now > endsValue) return false;

  return true;
}

export function normalizeCampaign(data: unknown, id: string): CampaignRecord | null {
  if (!data || typeof data !== "object") return null;

  const raw = data as Record<string, unknown>;
  const title = asText(raw.title);
  const placement = raw.placement;
  const ctaType = raw.ctaType;
  const startsAt = toIsoString(raw.startsAt);
  const endsAt = toIsoString(raw.endsAt);
  const priority = asNumber(raw.priority, 0);
  const startsValue = startsAt ? Date.parse(startsAt) : NaN;
  const endsValue = endsAt ? Date.parse(endsAt) : NaN;
  const businessId = asOptionalText(raw.businessId);
  const ctaValue = asOptionalText(raw.ctaValue);

  if (!title) return null;
  if (!isValidPlacement(placement)) return null;
  if (!isValidCtaType(ctaType)) return null;
  if (startsAt && !Number.isFinite(startsValue)) return null;
  if (endsAt && !Number.isFinite(endsValue)) return null;
  if (Number.isFinite(startsValue) && Number.isFinite(endsValue) && endsValue < startsValue) return null;
  if ((ctaType === "whatsapp" || ctaType === "business") && !businessId) return null;
  if ((ctaType === "internal" || ctaType === "external") && !ctaValue) return null;

  return {
    id,
    source: "firestore_campaign",
    businessId,
    title,
    subtitle: asOptionalText(raw.subtitle),
    description: asOptionalText(raw.description),
    badge: asOptionalText(raw.badge),
    promoCode: asOptionalText(raw.promoCode),
    imageUrl: asOptionalText(raw.imageUrl) ?? null,
    mobileImageUrl: asOptionalText(raw.mobileImageUrl) ?? null,
    ctaLabel: asOptionalText(raw.ctaLabel) ?? "Ver promo",
    ctaType,
    ctaValue,
    startsAt,
    endsAt,
    isActive: asBoolean(raw.isActive, false),
    priority,
    placement,
    audience: isValidAudience(raw.audience) ? raw.audience : "all",
    backgroundStyle: asOptionalText(raw.backgroundStyle),
    createdAt: toIsoString(raw.createdAt),
    updatedAt: toIsoString(raw.updatedAt),
    createdBy: asOptionalText(raw.createdBy),
  };
}

function compareCampaigns(left: CampaignRecord, right: CampaignRecord): number {
  if (left.priority !== right.priority) {
    return right.priority - left.priority;
  }

  const leftUpdated = left.updatedAt ? Date.parse(left.updatedAt) : 0;
  const rightUpdated = right.updatedAt ? Date.parse(right.updatedAt) : 0;

  return rightUpdated - leftUpdated;
}

function matchesAudience(campaign: CampaignRecord, audience?: CampaignAudience): boolean {
  if (!audience || audience === "all") return true;
  return campaign.audience === "all" || campaign.audience === audience;
}

function isActiveCampaign(campaign: CampaignRecord, now = Date.now()): boolean {
  return campaign.isActive === true && isWithinActiveWindow(campaign.startsAt, campaign.endsAt, now);
}

export function getCampaignDisplayStatus(campaign: CampaignRecord, now = Date.now()): CampaignDisplayStatus {
  if (!campaign.isActive) return "paused";

  const startsAt = campaign.startsAt ? Date.parse(campaign.startsAt) : NaN;
  const endsAt = campaign.endsAt ? Date.parse(campaign.endsAt) : NaN;

  if (Number.isFinite(startsAt) && now < startsAt) return "scheduled";
  if (Number.isFinite(endsAt) && now > endsAt) return "expired";
  return "active";
}

function sanitizeCampaignInput(input: CampaignInput): CampaignInput {
  const normalized: CampaignInput = {
    businessId: asOptionalText(input.businessId),
    title: asText(input.title),
    subtitle: asOptionalText(input.subtitle),
    description: asOptionalText(input.description),
    badge: asOptionalText(input.badge),
    promoCode: asOptionalText(input.promoCode),
    imageUrl: asOptionalText(input.imageUrl) ?? null,
    mobileImageUrl: asOptionalText(input.mobileImageUrl) ?? null,
    ctaLabel: asText(input.ctaLabel),
    ctaType: input.ctaType,
    ctaValue: asOptionalText(input.ctaValue),
    startsAt: asOptionalText(input.startsAt),
    endsAt: asOptionalText(input.endsAt),
    isActive: Boolean(input.isActive),
    priority: asNumber(input.priority, 0),
    placement: input.placement,
    audience: input.audience,
    backgroundStyle: asOptionalText(input.backgroundStyle),
  };

  const startsAt = normalized.startsAt ? Date.parse(normalized.startsAt) : NaN;
  const endsAt = normalized.endsAt ? Date.parse(normalized.endsAt) : NaN;

  if (!normalized.title) throw new Error("El título es obligatorio.");
  if (!normalized.ctaLabel) throw new Error("El texto del CTA es obligatorio.");
  if (!isValidPlacement(normalized.placement)) throw new Error("El placement no es válido.");
  if (!isValidAudience(normalized.audience)) throw new Error("La audiencia no es válida.");
  if (!isValidCtaType(normalized.ctaType)) throw new Error("El tipo de CTA no es válido.");
  if (normalized.startsAt && !Number.isFinite(startsAt)) throw new Error("La fecha de inicio no es válida.");
  if (normalized.endsAt && !Number.isFinite(endsAt)) throw new Error("La fecha de fin no es válida.");
  if (Number.isFinite(startsAt) && Number.isFinite(endsAt) && startsAt > endsAt) {
    throw new Error("La fecha de inicio no puede ser posterior a la fecha de fin.");
  }
  if ((normalized.ctaType === "whatsapp" || normalized.ctaType === "business") && !normalized.businessId) {
    throw new Error("Debes asociar un negocio para ese tipo de CTA.");
  }
  if ((normalized.ctaType === "internal" || normalized.ctaType === "external") && !normalized.ctaValue) {
    throw new Error("Ese tipo de CTA requiere una URL o ruta.");
  }

  return normalized;
}

function stripUndefinedFields<T extends Record<string, unknown>>(payload: T): Partial<T> {
  const cleaned: Partial<T> = {};

  for (const [key, value] of Object.entries(payload) as Array<[keyof T, T[keyof T]]>) {
    if (value !== undefined) {
      cleaned[key] = value;
    }
  }

  return cleaned;
}

export async function listCampaigns(options: ListCampaignsOptions = {}): Promise<CampaignRecord[]> {
  try {
    const db = getAdminFirestore();
    const snapshot = await db.collection(CAMPAIGNS_COLLECTION).get();
    const now = Date.now();

    return snapshot.docs
      .map((doc) => normalizeCampaign(doc.data(), doc.id))
      .filter((campaign): campaign is CampaignRecord => Boolean(campaign))
      .filter((campaign) => (options.placement ? campaign.placement === options.placement : true))
      .filter((campaign) => matchesAudience(campaign, options.audience))
      .filter((campaign) => (options.activeOnly === false ? true : isActiveCampaign(campaign, now)))
      .sort(compareCampaigns);
  } catch (error) {
    console.error("[campaignsData] Error listing campaigns:", error);
    return [];
  }
}

export async function getCampaignById(campaignId: string): Promise<CampaignRecord | null> {
  if (!campaignId) return null;

  try {
    const db = getAdminFirestore();
    const snapshot = await db.collection(CAMPAIGNS_COLLECTION).doc(campaignId).get();
    if (!snapshot.exists) return null;

    return normalizeCampaign(snapshot.data(), snapshot.id);
  } catch (error) {
    console.error("[campaignsData] Error loading campaign:", error);
    return null;
  }
}

export async function createCampaign(input: CampaignInput, createdBy?: string): Promise<CampaignRecord> {
  const db = getAdminFirestore();
  const now = new Date();
  const sanitized = sanitizeCampaignInput(input);
  const docRef = db.collection(CAMPAIGNS_COLLECTION).doc();

  await docRef.set({
    ...stripUndefinedFields(sanitized),
    createdAt: now,
    updatedAt: now,
    createdBy: createdBy || "admin",
  });

  const created = await getCampaignById(docRef.id);
  if (!created) {
    throw new Error("No se pudo leer la campaña recién creada.");
  }

  return created;
}

export async function updateCampaign(campaignId: string, input: CampaignInput): Promise<CampaignRecord> {
  if (!campaignId) throw new Error("campaignId es obligatorio.");

  const db = getAdminFirestore();
  const sanitized = sanitizeCampaignInput(input);

  await db.collection(CAMPAIGNS_COLLECTION).doc(campaignId).update({
    ...stripUndefinedFields(sanitized),
    updatedAt: new Date(),
  });

  const updated = await getCampaignById(campaignId);
  if (!updated) {
    throw new Error("No se pudo leer la campaña actualizada.");
  }

  return updated;
}

export async function toggleCampaignActive(campaignId: string, isActive: boolean): Promise<CampaignRecord> {
  if (!campaignId) throw new Error("campaignId es obligatorio.");

  const db = getAdminFirestore();
  await db.collection(CAMPAIGNS_COLLECTION).doc(campaignId).update({
    isActive,
    updatedAt: new Date(),
  });

  const updated = await getCampaignById(campaignId);
  if (!updated) {
    throw new Error("No se pudo leer la campaña actualizada.");
  }

  return updated;
}

export async function duplicateCampaign(campaignId: string, createdBy?: string): Promise<CampaignRecord> {
  const existing = await getCampaignById(campaignId);
  if (!existing) throw new Error("No se encontró la campaña a duplicar.");

  return createCampaign(
    {
      businessId: existing.businessId,
      title: `${existing.title} (copia)`,
      subtitle: existing.subtitle,
      description: existing.description,
      badge: existing.badge,
      promoCode: existing.promoCode,
      imageUrl: existing.imageUrl,
      mobileImageUrl: existing.mobileImageUrl,
      ctaLabel: existing.ctaLabel,
      ctaType: existing.ctaType,
      ctaValue: existing.ctaValue,
      startsAt: existing.startsAt,
      endsAt: existing.endsAt,
      isActive: false,
      priority: existing.priority,
      placement: existing.placement,
      audience: existing.audience,
      backgroundStyle: existing.backgroundStyle,
    },
    createdBy
  );
}

function buildHeroFromRecord(campaign: CampaignRecord, businessesById: Map<string, BusinessPreview>): CampaignHero {
  const business = campaign.businessId ? businessesById.get(campaign.businessId) : undefined;
  const tone = business && resolveVisibleTier(asPlanInput(business)) === "premium" ? "premium" : "neutral";
  const ctaType =
    campaign.ctaType === "whatsapp" && !business?.WhatsApp
      ? business
        ? "business"
        : "internal"
      : campaign.ctaType;
  const ctaValue =
    ctaType === "business"
      ? business?.id
      : campaign.ctaValue;

  return {
    id: campaign.id,
    source: "firestore_campaign",
    placement: "hero",
    status: isActiveCampaign(campaign) ? "active" : "scheduled",
    message: campaign.description || campaign.title,
    promoCode: campaign.promoCode,
    urgencyLabel: campaign.endsAt ? "Consulta vigencia hoy" : "Disponible por tiempo limitado",
    title: campaign.title,
    subtitle: campaign.subtitle,
    badgeLabel: campaign.badge,
    ctaType,
    ctaLabel: campaign.ctaLabel,
    ctaValue,
    imageUrl: campaign.mobileImageUrl || campaign.imageUrl || business?.coverUrl || business?.logoUrl || business?.image1 || null,
    tone,
    priority: campaign.priority,
    isActive: campaign.isActive,
    startsAt: campaign.startsAt,
    endsAt: campaign.endsAt,
    updatedAt: campaign.updatedAt,
    business,
  };
}

function toPreviewMap(businesses: Array<Business | BusinessPreview>): Map<string, BusinessPreview> {
  const entries: Array<[string, BusinessPreview]> = [];

  for (const business of businesses) {
    const preview =
      "ownerEmail" in business
        ? pickBusinessPreview(business as Business)
        : (business as BusinessPreview);

    if (!preview.id) continue;
    entries.push([preview.id, preview]);
  }

  return new Map(entries);
}

export async function getActiveHeroCampaign(
  businesses: Array<Business | BusinessPreview>,
  audience: CampaignAudience = "all"
): Promise<CampaignHero | null> {
  const campaigns = await listCampaigns({
    placement: "hero_banner",
    audience,
  });

  if (!campaigns.length) return null;

  const businessesById = toPreviewMap(businesses);
  return buildHeroFromRecord(campaigns[0], businessesById);
}

export async function getActiveOffersCampaigns(
  businesses: Array<Business | BusinessPreview>,
  audience: CampaignAudience = "all"
): Promise<CampaignHero[]> {
  const campaigns = await listCampaigns({
    placement: "offers_carousel",
    audience,
  });

  if (!campaigns.length) return [];

  const businessesById = toPreviewMap(businesses);
  return campaigns.map((campaign) => buildHeroFromRecord(campaign, businessesById));
}

export function getLegacyHeroCampaignFallback(businesses: Array<Business | BusinessPreview>): CampaignHero | null {
  return getLegacyCampaignHeroFromBusinesses(businesses);
}
