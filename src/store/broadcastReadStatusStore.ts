import { create } from "zustand";

interface BroadcastReadStatusState {
  lastReadBroadcastId: number;
  setLastReadBroadcastId: (id: number) => void;
}

export const useBroadcastReadStatusStore = create<BroadcastReadStatusState>(set => ({
  lastReadBroadcastId: 0,
  setLastReadBroadcastId: (id: number) => set({ lastReadBroadcastId: id }),
}));
