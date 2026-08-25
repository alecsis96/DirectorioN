import type { Business, BusinessPreview } from "../types/business";
import { MONETIZATION_FEATURE_ENABLED } from "./featureFlags";

export type LegacyBusinessPlan = "free" | "featured" | "sponsor";
export type VisibleBusinessTier = "free" | "premium";
export type PlanVisualVariant = "free" | "featured" | "sponsor";

type PlanInput =
  | string
  | null
  | undefined
  | {
      plan?: string | null;
      featured?: boolean | string | null;
    };

function asNormalizedValue(value: unknown): string {
  if (typeof value !== "string") return "";

  return value.trim().toLowerCase();
}

function extractPlanValue(input: PlanInput): { plan: string; featured: boolean } {
  if (typeof input === "string" || input == null) {
    return {
      plan: asNormalizedValue(input),
      featured: false,
    };
  }

  return {
    plan: asNormalizedValue(input.plan),
    featured: input.featured === true || asNormalizedValue(input.featured) === "true" || asNormalizedValue(input.featured) === "si",
  };
}

export function resolveLegacyPlan(input: PlanInput): LegacyBusinessPlan {
  const { plan, featured } = extractPlanValue(input);

  if (plan === "sponsor" || plan === "patrocinado" || plan === "premium" || plan === "pro" || plan === "paid") {
    return "sponsor";
  }

  if (plan === "featured" || plan === "destacado" || (featured && !plan)) {
    return "featured";
  }

  return "free";
}

export function resolveVisibleTier(input: PlanInput): VisibleBusinessTier {
  return resolveLegacyPlan(input) === "free" ? "free" : "premium";
}

export function resolvePremiumVisualVariant(input: PlanInput): PlanVisualVariant {
  const plan = resolveLegacyPlan(input);

  if (plan === "sponsor") return "sponsor";
  if (plan === "featured") return "featured";
  return "free";
}

export function isPremiumBusiness(input: PlanInput): boolean {
  return resolveVisibleTier(input) === "premium";
}

export function getVisibleTierLabel(input: PlanInput): "Free" | "Premium" {
  return resolveVisibleTier(input) === "premium" ? "Premium" : "Free";
}

export function getVisibleTierBadgeLabel(input: PlanInput): "Perfil base" | "Premium" {
  return resolveVisibleTier(input) === "premium" ? "Premium" : "Perfil base";
}

export function getStoragePlanForVisibleTier(tier: VisibleBusinessTier): LegacyBusinessPlan {
  return tier === "premium" ? "sponsor" : "free";
}

export function getLegacyPlanPriority(input: PlanInput): number {
  const plan = resolveLegacyPlan(input);

  if (plan === "sponsor") return 2;
  if (plan === "featured") return 1;
  return 0;
}

export function getEffectivePublicVariant(
  input: PlanInput,
  monetizationEnabled = MONETIZATION_FEATURE_ENABLED,
): PlanVisualVariant {
  if (!monetizationEnabled) return "free";

  return resolvePremiumVisualVariant(input);
}

export function getEffectivePublicPriority(
  input: PlanInput,
  monetizationEnabled = MONETIZATION_FEATURE_ENABLED,
): number {
  if (!monetizationEnabled) return 0;

  return getLegacyPlanPriority(input);
}

export function isEffectivePublicPremium(
  input: PlanInput,
  monetizationEnabled = MONETIZATION_FEATURE_ENABLED,
): boolean {
  if (!monetizationEnabled) return false;

  return isPremiumBusiness(input);
}

export function asPlanInput(business: Pick<Business | BusinessPreview, "plan" | "featured">): PlanInput {
  return {
    plan: business.plan,
    featured: business.featured,
  };
}
