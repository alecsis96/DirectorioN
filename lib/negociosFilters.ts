import type { CategoryGroupId } from "./categoriesCatalog";
import type { BusinessPreview } from "../types/business";
import { sliceBusinesses } from "./pagination";

export type SortMode = "destacado" | "rating" | "az";

export type Filters = {
  category: string;
  categoryId?: string;
  categoryName?: string;
  categoryGroupId?: CategoryGroupId;
  colonia: string;
  order: SortMode;
  page: number;
  query: string;
};

export const PAGE_SIZE = 10;

export const DEFAULT_ORDER: SortMode = "destacado";

export const DEFAULT_FILTER_STATE: Filters = {
  category: "",
  categoryId: "",
  categoryName: "",
  categoryGroupId: undefined,
  colonia: "",
  order: DEFAULT_ORDER,
  page: 1,
  query: "",
};

export function sortBusinessesByPublicCriterion(
  businesses: BusinessPreview[],
  order: SortMode,
  isOpen: (business: BusinessPreview) => boolean = () => false,
): BusinessPreview[] {
  return [...businesses].sort((left, right) => {
    if (order === "az") {
      return left.name.localeCompare(right.name, "es");
    }

    if (order === "rating") {
      return (right.rating ?? 0) - (left.rating ?? 0);
    }

    const leftOpen = isOpen(left);
    const rightOpen = isOpen(right);
    if (leftOpen !== rightOpen) return leftOpen ? -1 : 1;

    return (right.rating ?? 0) - (left.rating ?? 0);
  });
}

export function buildNeutralPublicBusinessPage(
  businesses: BusinessPreview[],
  order: SortMode,
  page: number,
  isOpen?: (business: BusinessPreview) => boolean,
) {
  const allSorted = sortBusinessesByPublicCriterion(businesses, order, isOpen);
  const pageCount = Math.max(1, page);
  const currentSlice = sliceBusinesses(allSorted, pageCount, PAGE_SIZE);
  const previousEnd = (pageCount - 1) * PAGE_SIZE;
  const items = pageCount > 1
    ? allSorted.slice(0, previousEnd).concat(currentSlice)
    : currentSlice;

  return { items, total: allSorted.length };
}
