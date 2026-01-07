import type { Warehouse } from "@/types/database";
import { supabase } from "@/lib/supabase";
import { useCRUD } from "./useCRUD";

export function useLocations() {
  const { items, isLoading, addItem, editItem, deleteItem, refetch } = useCRUD<Warehouse>({
    tableName: "warehouses",
    swrKey: "warehouses",
    orderBy: "name",
  });

  const addLocation = async (name: string) => {
    return await addItem({ name });
  };

  const editLocation = async (id: string, name: string) => {
    return await editItem(id, { name });
  };

  const deleteLocation = async (id: string) => {
    try {
      // 1. 해당 warehouse를 참조하는 transactions 찾기
      // from_warehouse_id 또는 to_warehouse_id가 해당 id인 경우
      const { data: fromTransactions, error: fromTxSelectError } = await supabase
        .from("transactions")
        .select("id")
        .eq("from_warehouse_id", id);

      const { data: toTransactions, error: toTxSelectError } = await supabase.from("transactions").select("id").eq("to_warehouse_id", id);

      const transactions = [...(fromTransactions || []), ...(toTransactions || [])].filter(
        (tx, index, self) => self.findIndex((t) => t.id === tx.id) === index
      ); // 중복 제거

      if (fromTxSelectError || toTxSelectError) {
        console.error("트랜잭션 조회 실패:", fromTxSelectError || toTxSelectError);
      }

      // 2. transaction_items 삭제 (transactions를 참조하므로 먼저 삭제)
      if (transactions && transactions.length > 0) {
        const transactionIds = transactions.map((tx) => tx.id);

        const { error: txItemsError } = await supabase.from("transaction_items").delete().in("transaction_id", transactionIds);

        if (txItemsError) {
          console.error("트랜잭션 아이템 삭제 실패:", txItemsError);
        }

        // 3. transactions 삭제
        const { error: fromTxError } = await supabase.from("transactions").delete().eq("from_warehouse_id", id);

        if (fromTxError) {
          console.error("트랜잭션 삭제 실패 (from_warehouse):", fromTxError);
        }

        const { error: toTxError } = await supabase.from("transactions").delete().eq("to_warehouse_id", id);

        if (toTxError) {
          console.error("트랜잭션 삭제 실패 (to_warehouse):", toTxError);
        }
      }

      // 4. inventory_batches 삭제 (warehouse_id를 참조)
      const { error: batchError } = await supabase.from("inventory_batches").delete().eq("warehouse_id", id);

      if (batchError) {
        console.error("배치 삭제 실패:", batchError);
      }

      // 5. 해당 warehouse를 사용하는 inventory 레코드들 삭제
      const { error: inventoryError } = await supabase.from("inventory").delete().eq("warehouse_id", id);

      if (inventoryError) {
        throw new Error(`재고 삭제 실패: ${inventoryError.message}`);
      }

      // 6. warehouse 삭제
      return await deleteItem(id);
    } catch (error: unknown) {
      // 외래 키 제약 조건 위반 에러 처리
      if (error && typeof error === "object" && "code" in error && error.code === "23503") {
        throw new Error("이 입고처는 재고 내역에 사용되어 삭제할 수 없습니다.");
      }
      throw error;
    }
  };

  return {
    locations: items,
    isLoading,
    addLocation,
    editLocation,
    deleteLocation,
    refetch,
  };
}
