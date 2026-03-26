import { CATEGORIES, type CategoryItem } from "./categoriesCatalog";
import type { Business, BusinessPreview } from "../types/business";
import { pickBusinessPreview } from "../types/business";
import { getBusinessPromotionMessage, resolveBusinessCampaign } from "./campaigns";
import { asPlanInput, getLegacyPlanPriority, isPremiumBusiness, resolvePremiumVisualVariant } from "./businessPlanVisibility";

export type HomePromotion = {
  business: BusinessPreview;
  message: string;
  promoCode?: string;
  urgencyLabel: string;
};

export type HomePremiumShowcaseItem = {
  business: BusinessPreview;
  variant: "featured" | "sponsor";
};

export type HomeCategorySummary = {
  id: string;
  name: string;
  icon: string;
  groupId: string;
  count: number;
  href: string;
  description: string;
};

export type HomeMetric = {
  value: string;
  label: string;
  helper: string;
};

export type HomePageData = {
  metrics: HomeMetric[];
  promotions: HomePromotion[];
  popularCategories: HomeCategorySummary[];
  premiumShowcase: HomePremiumShowcaseItem[];
  sponsorShowcase: BusinessPreview[];
  featuredShowcase: BusinessPreview[];
  organicShowcase: BusinessPreview[];
  hasBusinesses: boolean;
};

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  polleria_rosticeria: "Opciones para comida corrida, pollo rostizado y pedidos rapidos.",
  taquerias: "Antojos, cenas rapidas y negocios listos para atender por WhatsApp.",
  cafeteria: "Cafe, postres y espacios para una parada rapida en Yajalon.",
  abarrotes: "Compras del dia, pedidos rapidos y tiendas de confianza cerca.",
  servicios_generales: "Oficios, reparaciones y servicios utiles para resolver hoy.",
  servicios_profesionales: "Despachos, asesoria y servicios con presencia local.",
  restaurantes: "Comida completa, menus del dia y lugares para ir sin perder tiempo.",
  estetica: "Belleza, cuidado personal y citas directas con negocios locales.",
};

const DEFAULT_CATEGORY_IDS = [
  "polleria_rosticeria",
  "taquerias",
  "cafeteria",
  "abarrotes",
  "servicios_generales",
  "servicios_profesionales",
];

function asPreview(business: Business): BusinessPreview {
  return pickBusinessPreview(business);
}

function businessRankScore(business: Business): number {
  const rating = typeof business.rating === "number" ? business.rating : 0;
  const hasWhatsApp = business.WhatsApp ? 1 : 0;
  const hasCover = business.coverUrl ? 1 : 0;
  const hasLogo = business.logoUrl ? 1 : 0;
  const hasDescription = business.description ? 1 : 0;

  return rating * 10 + hasWhatsApp * 5 + hasCover * 3 + hasLogo * 2 + hasDescription;
}

function buildPromotionItems(businesses: Business[]): HomePromotion[] {
  return businesses
    .filter((business) => getBusinessPromotionMessage(business).length > 0)
    .sort((left, right) => {
      const leftPlanScore = getLegacyPlanPriority(asPlanInput(left));
      const rightPlanScore = getLegacyPlanPriority(asPlanInput(right));

      if (leftPlanScore !== rightPlanScore) {
        return rightPlanScore - leftPlanScore;
      }

      return businessRankScore(right) - businessRankScore(left);
    })
    .slice(0, 4)
    .map((business) => {
      const campaign = resolveBusinessCampaign(business, "carousel");

      return {
        business: asPreview(business),
        message: campaign?.message ?? "",
        promoCode: campaign?.promoCode,
        urgencyLabel: campaign?.urgencyLabel ?? "Pregunta disponibilidad por WhatsApp",
      };
    });
}

function getFallbackCategory(item: CategoryItem): HomeCategorySummary {
  return {
    id: item.id,
    name: item.name,
    icon: item.icon,
    groupId: item.groupId,
    count: 0,
    href: `/negocios?c=${item.id}&g=${item.groupId}`,
    description: CATEGORY_DESCRIPTIONS[item.id] ?? "Explora negocios locales listos para atenderte rapido.",
  };
}

function buildCategoryItems(businesses: Business[]): HomeCategorySummary[] {
  const counts = new Map<string, number>();

  businesses.forEach((business) => {
    const categoryId = business.categoryId;
    if (!categoryId) return;

    counts.set(categoryId, (counts.get(categoryId) ?? 0) + 1);
  });

  const dynamicItems = [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 6)
    .map(([categoryId, count]) => {
      const category = CATEGORIES.find((item) => item.id === categoryId);
      if (!category) return null;

      return {
        id: category.id,
        name: category.name,
        icon: category.icon,
        groupId: category.groupId,
        count,
        href: `/negocios?c=${category.id}&g=${category.groupId}`,
        description: CATEGORY_DESCRIPTIONS[category.id] ?? "Explora negocios locales listos para atenderte rapido.",
      };
    })
    .filter(Boolean) as HomeCategorySummary[];

  if (dynamicItems.length >= 4) {
    return dynamicItems;
  }

  return DEFAULT_CATEGORY_IDS
    .map((categoryId) => CATEGORIES.find((item) => item.id === categoryId))
    .filter(Boolean)
    .map((item) => getFallbackCategory(item as CategoryItem));
}

function buildMetrics(businesses: Business[], promotions: HomePromotion[]): HomeMetric[] {
  const directContactCount = businesses.filter((business) => business.WhatsApp || business.phone).length;
  const visualProfilesCount = businesses.filter(
    (business) => business.coverUrl || business.logoUrl || business.image1
  ).length;
  const categoryCount = new Set(businesses.map((business) => business.categoryId).filter(Boolean)).size;
  const activePromotionCount = businesses.filter(
    (business) => typeof business.promocionesActivas === "string" && business.promocionesActivas.trim().length > 0
  ).length;

  return [
    {
      value: `${businesses.length}+`,
      label: "negocios visibles",
      helper: "Perfiles publicados y listos para recibir contactos.",
    },
    {
      value: `${directContactCount}+`,
      label: "con contacto directo",
      helper: "WhatsApp o llamada desde la primera vista.",
    },
    {
      value: `${activePromotionCount}+`,
      label: "campanas activas",
      helper: "Promociones temporales visibles arriba del inventario.",
    },
    {
      value: `${categoryCount}+`,
      label: "categorias activas",
      helper: "Exploracion rapida por comida, tiendas y servicios.",
    },
    {
      value: `${visualProfilesCount}+`,
      label: "perfiles con imagen",
      helper: "Mas claridad visual y mayor confianza local.",
    },
  ];
}

function sortByRank(businesses: Business[]) {
  return [...businesses].sort((left, right) => businessRankScore(right) - businessRankScore(left));
}

export function buildHomePageData(allBusinesses: Business[]): HomePageData {
  const businesses = sortByRank(allBusinesses);
  const promotions = buildPromotionItems(businesses);
  const sponsorBusinesses = businesses.filter((business) => resolvePremiumVisualVariant(asPlanInput(business)) === "sponsor" && isPremiumBusiness(asPlanInput(business)));
  const featuredBusinesses = businesses.filter(
    (business) => resolvePremiumVisualVariant(asPlanInput(business)) === "featured" && isPremiumBusiness(asPlanInput(business))
  );
  const organicBusinesses = businesses.filter(
    (business) => !isPremiumBusiness(asPlanInput(business))
  );
  const premiumShowcase: HomePremiumShowcaseItem[] = [...sponsorBusinesses.slice(0, 2), ...featuredBusinesses.slice(0, 4)].map((business) => ({
    business: asPreview(business),
    variant: resolvePremiumVisualVariant(asPlanInput(business)) === "sponsor" ? "sponsor" : "featured",
  }));

  return {
    metrics: buildMetrics(businesses, promotions),
    promotions,
    popularCategories: buildCategoryItems(businesses),
    premiumShowcase,
    sponsorShowcase: sponsorBusinesses.slice(0, 2).map(asPreview),
    featuredShowcase: featuredBusinesses.slice(0, 4).map(asPreview),
    organicShowcase: organicBusinesses.slice(0, 4).map(asPreview),
    hasBusinesses: businesses.length > 0,
  };
}
