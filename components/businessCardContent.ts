import { getBusinessStatus } from "./BusinessHours";
import type { Business, BusinessPreview } from "../types/business";

export type CardBusiness = BusinessPreview | Business;
export type CardTier = "free" | "featured" | "sponsor";

export type CardHighlight = {
  kind: "promo" | "specialty" | "description" | "status" | "neutral" | "none";
  label?: string;
  text?: string;
  isPromo: boolean;
  isFallback: boolean;
};

export type CardStatusChip =
  | {
      tone: "open" | "closed";
      label: string;
    }
  | null;

const asText = (value: unknown): string => {
  if (typeof value !== "string") return "";

  return value.replace(/\s+/g, " ").trim();
};

const truncateText = (value: string, maxLength: number): string => {
  if (value.length <= maxLength) return value;

  return `${value.slice(0, maxLength - 3).trimEnd()}...`;
};

const getOptionalBusinessField = (business: CardBusiness, key: string): string => {
  return asText((business as Record<string, unknown>)[key]);
};

const getPrimaryDescription = (business: CardBusiness): string => {
  return (
    getOptionalBusinessField(business, "shortDescription") ||
    getOptionalBusinessField(business, "short_description") ||
    getOptionalBusinessField(business, "resumenCorto") ||
    getOptionalBusinessField(business, "resumen_corto") ||
    asText(business.description)
  );
};

const getSpecialty = (business: CardBusiness): string => {
  return getOptionalBusinessField(business, "specialty") || getOptionalBusinessField(business, "especialidad");
};

const getPromoText = (business: CardBusiness): string => {
  return asText(business.promocionesActivas);
};

const getZoneText = (business: CardBusiness): string => {
  return asText(business.colonia) || getOptionalBusinessField(business, "neighborhood");
};

const getCategoryText = (business: CardBusiness): string => {
  return asText(business.categoryName) || asText(business.category);
};

export function resolveCardStatusChip(business: CardBusiness): CardStatusChip {
  const hasStructuredHours = Boolean("horarios" in business && business.horarios && Object.keys(business.horarios).length > 0);
  const hoursText = asText(business.hours);

  if (!hasStructuredHours && !hoursText) return null;
  if (!hoursText) return null;

  const status = getBusinessStatus(hoursText);

  return status.isOpen ? { tone: "open", label: "Abierto ahora" } : { tone: "closed", label: "Cerrado" };
}

export function resolveCardHighlight(business: CardBusiness, tier: CardTier): CardHighlight {
  const promoText = getPromoText(business);

  if (promoText) {
    return {
      kind: "promo",
      label: "Promo activa",
      text: truncateText(promoText, tier === "sponsor" ? 96 : 82),
      isPromo: true,
      isFallback: false,
    };
  }

  if (tier === "free") {
    return {
      kind: "none",
      isPromo: false,
      isFallback: false,
    };
  }

  const specialty = getSpecialty(business);
  if (specialty) {
    return {
      kind: "specialty",
      label: "Especialidad",
      text: truncateText(specialty, tier === "sponsor" ? 90 : 80),
      isPromo: false,
      isFallback: true,
    };
  }

  const shortDescription = getPrimaryDescription(business);
  if (shortDescription) {
    return {
      kind: "description",
      text: truncateText(shortDescription, tier === "sponsor" ? 92 : 80),
      isPromo: false,
      isFallback: true,
    };
  }

  const statusChip = resolveCardStatusChip(business);
  if (statusChip) {
    return {
      kind: "status",
      text: statusChip.label,
      isPromo: false,
      isFallback: true,
    };
  }

  const zoneText = getZoneText(business);
  const categoryText = getCategoryText(business);

  if (tier === "sponsor") {
    return {
      kind: "neutral",
      label: "Premium",
      text: zoneText || (categoryText ? `${categoryText} en Yajalon` : "Disponible hoy en Yajalon"),
      isPromo: false,
      isFallback: true,
    };
  }

  return {
    kind: "neutral",
    label: "Premium",
    text: zoneText || (categoryText ? `${categoryText} en Yajalon` : "Explora su perfil y contacta por WhatsApp"),
    isPromo: false,
    isFallback: true,
  };
}
