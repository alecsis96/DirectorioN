import { describe, expect, it } from "vitest";
import type { BusinessPreview } from "../types/business";
import { sliceBusinesses } from "../lib/pagination";

const makeBusiness = (index: number): BusinessPreview => ({
  id: `biz-${index}`,
  name: `Business ${index}`,
  category: "food",
  colonia: "Centro",
  rating: 4,
  isOpen: "si",
  address: `Calle ${index}`,
});

describe("sliceBusinesses", () => {
  it("returns first PAGE_SIZE items for page 1", () => {
    const list = Array.from({ length: 20 }, (_, idx) => makeBusiness(idx));
    const result = sliceBusinesses(list, 1, 10);
    expect(result).toHaveLength(10);
    expect(result.map((biz) => biz.id)).toEqual(["biz-0", "biz-1", "biz-2", "biz-3", "biz-4", "biz-5", "biz-6", "biz-7", "biz-8", "biz-9"]);
  });

  it("returns only items for page 3 when total is 25", () => {
    const list = Array.from({ length: 25 }, (_, idx) => makeBusiness(idx));
    const result = sliceBusinesses(list, 3, 10);
    expect(result).toHaveLength(5);
    expect(result.map((item) => item.id)).toEqual(["biz-20", "biz-21", "biz-22", "biz-23", "biz-24"]);
  });
});
