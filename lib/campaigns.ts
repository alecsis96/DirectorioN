import type { Business, BusinessPreview } from "../types/business";
import type { CampaignPlacement, CampaignPreview } from "../types/campaign";

const PROMO_CODE_REGEX = /(?:codigo|code)\s*[:\-]?\s*([A-Z0-9-]{3,})/i;

function asText(value: unknown): string {
  if (typeof value !== "string") return "";

  return value.replace(/\s+/g, " ").replace(/[|]+/g, " ").trim();
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
