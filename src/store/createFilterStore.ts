import { create } from "zustand";

/**
 * 공통 Filter Store 팩토리 함수
 * 필터 상태 관리를 위한 표준 패턴을 제공합니다.
 */
export function createFilterStore<T extends Record<string, unknown>>(storeName: string, defaultFilters: T) {
  interface FilterStore {
    isOpen: boolean;
    filters: T;
    open: (initial?: Partial<T>) => void;
    close: () => void;
    reset: () => void;
    setFilters: (next: Partial<T> | ((prev: T) => Partial<T>)) => void;
  }

  return create<FilterStore>((set, get) => ({
    isOpen: false,
    filters: defaultFilters,
    open: initial => set({ isOpen: true, filters: { ...defaultFilters, ...initial } }),
    close: () => set({ isOpen: false }),
    reset: () => set({ filters: defaultFilters }),
    setFilters: next => {
      const prev = get().filters;
      const patch = typeof next === "function" ? next(prev) : next;
      set({ filters: { ...prev, ...patch } });
    },
  }));
}
