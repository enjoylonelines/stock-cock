import { createClient } from "@/lib/supabase/client";
import type { Warehouse } from "@/types/database";
import { useCRUD } from "./useCRUD";

export function useWarehouses() {
  const supabase = createClient();
  const { items, isLoading, addItem, editItem, deleteItem, refetch } = useCRUD<Warehouse>({
    tableName: "warehouses",
    swrKey: "warehouses",
    orderBy: "name",
  });

  const addWarehouse = async (name: string) => {
    return await addItem({ name });
  };

  const editWarehouse = async (id: string, name: string) => {
    return await editItem(id, { name });
  };

  const deleteWarehouse = async (id: string) => {
    try {
      const [transactions, inventory] = await Promise.all([
        supabase.from("transactions").select("id").or(`from_warehouse_id.eq.${id},to_warehouse_id.eq.${id}`).limit(1),
        supabase.from("inventory").select("id").eq("warehouse_id", id).limit(1),
      ]);
      if (transactions.error || inventory.error) throw new Error("창고 참조를 확인하지 못했습니다.");
      if (transactions.data?.length || inventory.data?.length) {
        throw new Error("재고 또는 확정 이력이 있는 창고는 삭제할 수 없습니다.");
      }
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
    warehouses: items,
    isLoading,
    addWarehouse,
    editWarehouse,
    deleteWarehouse,
    refetch,
  };
}
