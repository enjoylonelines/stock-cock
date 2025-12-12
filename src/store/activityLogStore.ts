import { create } from "zustand";

interface ActivityLogState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

export const useActivityLogStore = create<ActivityLogState>(set => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));
