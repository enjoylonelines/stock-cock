import type { Warehouse } from "@/types/database";
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
