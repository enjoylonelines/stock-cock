import { create } from "zustand";

export type TransactionType = "전체" | "입고" | "출고" | "조정" | "이동";

export interface FilterState {
  transactionType: TransactionType;
  startDate: Date | null;
  endDate: Date | null;
  location: string;
  product: string;
  supplier: string;
  member: string;
}

export const defaultFilterState: FilterState = {
  transactionType: "전체",
  startDate: null,
  endDate: null,
  location: "",
  product: "",
  supplier: "",
  member: "",
};

interface FilterDrawerStore {
  isOpen: boolean;
  filters: FilterState;
  open: (initial?: Partial<FilterState>) => void;
  close: () => void;
  reset: () => void;
  setFilters: (next: Partial<FilterState> | ((prev: FilterState) => Partial<FilterState>)) => void;
}

export const useFilterDrawerStore = create<FilterDrawerStore>((set, get) => ({
  isOpen: false,
  filters: defaultFilterState,
  open: (initial) => set({ isOpen: true, filters: { ...defaultFilterState, ...initial } }),
  close: () => set({ isOpen: false }),
  reset: () => set({ filters: defaultFilterState }),
  setFilters: (next) => {
    const prev = get().filters;
    const patch = typeof next === "function" ? next(prev) : next;
    set({ filters: { ...prev, ...patch } });
  },
}));
