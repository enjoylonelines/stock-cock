export type InventoryHistoryItem = {
  id: string;
  quantity: number;
  receipt: {
    id: string;
    type: "IN" | "OUT" | "ADJUST";
    created_at: string;
    memo?: string;
    location?: { name: string } | null;
    user?: { id: string; name: string; avatar_url?: string } | null;
  };
  product: {
    id: string;
    name: string;
    image_url?: string;
  };
};
