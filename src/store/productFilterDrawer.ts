import { create } from "zustand";

export interface ProductFilterState {
  category?: string;
  brand?: string;
  priceRange?: {
    min: number;
    max: number;
  };
  inStock?: boolean;
  searchQuery?: string;
}

interface ProductFilterDrawerStore {
  isOpen: boolean;
  filters: ProductFilterState;
  open: () => void;
  close: () => void;
  setFilters: (filters: ProductFilterState) => void;
  resetFilters: () => void;
}

const initialFilters: ProductFilterState = {};

export const useProductFilterDrawerStore = create<ProductFilterDrawerStore>((set) => ({
  isOpen: false,
  filters: initialFilters,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  setFilters: (filters) => set({ filters }),
  resetFilters: () => set({ filters: initialFilters }),
}));
