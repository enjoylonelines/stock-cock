import { createFilterStore } from "./createFilterStore";

export interface ProductFilterState {
  category?: string;
  brand?: string;
  priceRange?: {
    min: number;
    max: number;
  };
  inStock?: boolean;
  searchQuery?: string;
  [key: string]: unknown;
}

const initialFilters: ProductFilterState = {};

export const useProductFilterDrawerStore = createFilterStore<ProductFilterState>("productFilter", initialFilters);
