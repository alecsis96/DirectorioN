import type { BusinessPreview } from "../types/business";

export function sliceBusinesses(all: BusinessPreview[], page: number, pageSize: number): BusinessPreview[] {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const safeSize = Number.isFinite(pageSize) && pageSize > 0 ? Math.floor(pageSize) : 1;
  const start = (safePage - 1) * safeSize;
  const end = start + safeSize;
  if (start >= all.length) return [];
  return all.slice(start, end);
}
