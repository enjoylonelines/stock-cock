import { create } from "zustand";

interface InventoryRecord {
  id: string;
  type: "IN" | "OUT";
  quantity: number;
  timestamp: Date;
}

interface InventoryState {
  totalStock: number;
  records: InventoryRecord[];
  addRecord: (type: "IN" | "OUT", quantity: number) => void;
}

export const useInventoryStore = create<InventoryState>(set => ({
  totalStock: 1000, // 초기 재고
  records: [],
  addRecord: (type, quantity) =>
    set(state => {
      const newRecord: InventoryRecord = {
        id: Math.random().toString(36).substring(7),
        type,
        quantity,
        timestamp: new Date(),
      };

      return {
        totalStock: type === "IN" ? state.totalStock + quantity : state.totalStock - quantity,
        records: [newRecord, ...state.records],
      };
    }),
}));
