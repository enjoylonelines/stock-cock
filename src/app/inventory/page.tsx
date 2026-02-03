"use client";

import InventoryList from "./_components/InventoryList";
import { useInventoryList } from "./_hooks/useInventoryList";

export default function InventoryPage() {
  const { filteredGrouped } = useInventoryList();

  return <InventoryList grouped={filteredGrouped} />;
}
