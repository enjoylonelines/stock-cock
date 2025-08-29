import { create } from "zustand";

export type SortOption = "name-asc" | "name-desc" | "quantity-desc" | "quantity-asc";

interface ProductSortState {
  sortOption: SortOption;
  setSort: (option: SortOption) => void;
  resetSort: () => void;
}

const initialSort: { sortOption: SortOption } = {
  sortOption: "name-asc",
};

export const useProductSortStore = create<ProductSortState>((set) => ({
  ...initialSort,
  setSort: (option) => set({ sortOption: option }),
  resetSort: () => set(initialSort),
}));
