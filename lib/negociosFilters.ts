export type SortMode = "destacado" | "rating" | "az";

export type Filters = {
  category: string;
  colonia: string;
  order: SortMode;
  page: number;
  query: string;
};

export const PAGE_SIZE = 20;

export const DEFAULT_ORDER: SortMode = "destacado";

export const DEFAULT_FILTER_STATE: Filters = {
  category: "",
  colonia: "",
  order: DEFAULT_ORDER,
  page: 1,
  query: "",
};
