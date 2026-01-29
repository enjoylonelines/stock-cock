"use client";

import InventoryList from "./InventoryList";
import InventoryListSkeleton from "./InventoryListSkeleton";
import { useInventoryList } from "../_hooks/useInventoryList";

/**
 * 재고 목록 페이지 컴포넌트 (순수 UI)
 */
export default function InventoryPage() {
  const { loading, filteredGrouped } = useInventoryList();

  return (
    <div className="container p-4 mx-auto space-y-4 max-w-3xl">
      {loading ? <InventoryListSkeleton /> : <InventoryList grouped={filteredGrouped} />}
    </div>
  );
}
