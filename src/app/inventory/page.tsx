import InventoryList from "@/components/inventory/InventoryList";

export default function InventoryPage() {
  return (
    <div className="container p-4 mx-auto space-y-4 max-w-3xl">
      {/* 입/출고 리스트 */}
      <InventoryList />
    </div>
  );
}
