export type CampaignPlacement = "hero" | "carousel" | "card";
export type CampaignStatus = "active" | "scheduled" | "expired";
export type CampaignSource = "business_promotion";

export type CampaignPreview = {
  source: CampaignSource;
  placement: CampaignPlacement;
  status: CampaignStatus;
  message: string;
  promoCode?: string;
  urgencyLabel: string;
};
