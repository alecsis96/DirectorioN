import type { BusinessPreview } from "./business";

export type CampaignPlacement = "hero" | "carousel" | "card";
export type CampaignStatus = "active" | "scheduled" | "expired";
export type CampaignSource = "business_promotion" | "firestore_campaign";
export type CampaignCtaType = "whatsapp" | "business" | "internal" | "external";
export type CampaignTone = "premium" | "neutral";
export type CampaignDocumentPlacement = "hero_banner" | "offers_carousel";
export type CampaignAudience = "all" | "mobile" | "desktop";
export type CampaignDisplayStatus = "active" | "scheduled" | "expired" | "paused";

export type CampaignPreview = {
  source: CampaignSource;
  placement: CampaignPlacement;
  status: CampaignStatus;
  message: string;
  promoCode?: string;
  urgencyLabel: string;
};

export type CampaignHero = CampaignPreview & {
  id: string;
  placement: "hero";
  title: string;
  subtitle?: string;
  badgeLabel?: string;
  ctaType: CampaignCtaType;
  ctaLabel: string;
  ctaValue?: string;
  imageUrl?: string | null;
  tone: CampaignTone;
  priority: number;
  isActive?: boolean;
  startsAt?: string;
  endsAt?: string;
  updatedAt?: string;
  business?: BusinessPreview;
};

export type CampaignRecord = {
  id: string;
  source: "firestore_campaign";
  businessId?: string;
  title: string;
  subtitle?: string;
  description?: string;
  badge?: string;
  promoCode?: string;
  imageUrl?: string | null;
  mobileImageUrl?: string | null;
  ctaLabel: string;
  ctaType: CampaignCtaType;
  ctaValue?: string;
  startsAt?: string;
  endsAt?: string;
  isActive: boolean;
  priority: number;
  placement: CampaignDocumentPlacement;
  audience: CampaignAudience;
  backgroundStyle?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
};

export type CampaignInput = {
  businessId?: string;
  title: string;
  subtitle?: string;
  description?: string;
  badge?: string;
  promoCode?: string;
  imageUrl?: string | null;
  mobileImageUrl?: string | null;
  ctaLabel: string;
  ctaType: CampaignCtaType;
  ctaValue?: string;
  startsAt?: string;
  endsAt?: string;
  isActive: boolean;
  priority: number;
  placement: CampaignDocumentPlacement;
  audience: CampaignAudience;
  backgroundStyle?: string;
};
