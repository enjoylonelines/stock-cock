"use client";
import InventoryList from "@/components/inventory/InventoryList";
import InventoryListSkeleton from "@/components/inventory/InventoryListSkeleton";
import { useInventoryHistory } from "@/hooks/useInventoryHistory";

export default function InventoryPage() {
  const { grouped, loading } = useInventoryHistory();
  return (
    <div className="container p-4 mx-auto space-y-4 max-w-3xl">
      {loading ? <InventoryListSkeleton /> : <InventoryList grouped={grouped} />}
    </div>
  );
}
