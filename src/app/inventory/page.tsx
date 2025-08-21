"use client";
import InventoryList from "@/components/inventory/InventoryList";
import { useInventoryHistory } from "@/hooks/useInventoryHistory";

export default function InventoryPage() {
  const { grouped } = useInventoryHistory();
  return (
    <div className="container p-4 mx-auto space-y-4 max-w-3xl">
      <InventoryList grouped={grouped} />
    </div>
  );
}
