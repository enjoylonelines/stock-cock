"use client";

import { Button } from "@/components/ui/button";
import InventoryList from "@/components/inventory/InventoryList";
import { Plus } from "lucide-react";

export default function InventoryPage() {
  return (
    <div className="container max-w-3xl p-4 mx-auto space-y-4">
      {/* 입/출고 리스트 */}
      <InventoryList />
    </div>
  );
}
