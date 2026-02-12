import { create } from "zustand";

export function getActivityReadKey(transactionId: string, productOptionId: string): string {
  return `${transactionId}:${productOptionId}`;
}

interface ActivityReadStatusState {
  readActivityKeys: Set<string>;
  setReadActivityKeys: (keys: Set<string>) => void;
  addReadKeys: (keys: string[]) => void;
}

export const useActivityReadStatusStore = create<ActivityReadStatusState>(set => ({
  readActivityKeys: new Set<string>(),

  setReadActivityKeys: (keys: Set<string>) => set({ readActivityKeys: keys }),

  addReadKeys: (keys: string[]) =>
    set(state => {
      const next = new Set(state.readActivityKeys);
      keys.forEach(k => next.add(k));
      return { readActivityKeys: next };
    }),
}));
