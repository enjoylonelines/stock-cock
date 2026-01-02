import { useCRUD } from "./useCRUD";

interface Supplier {
  id: string;
  name: string;
  [key: string]: unknown;
}

export function useSuppliers() {
  const { items, isLoading, addItem, editItem, deleteItem, refetch } = useCRUD<Supplier>({
    tableName: "suppliers",
    swrKey: "suppliers",
    orderBy: "name",
  });

  const addSupplier = async (name: string) => {
    return await addItem({ name });
  };

  const editSupplier = async (id: string, name: string) => {
    return await editItem(id, { name });
  };

  const deleteSupplier = async (id: string) => {
    try {
      return await deleteItem(id);
    } catch (error: unknown) {
      // 외래 키 제약 조건 위반 에러 처리
      if (error && typeof error === "object" && "code" in error && error.code === "23503") {
        throw new Error("이 출고처는 재고 내역에 사용되어 삭제할 수 없습니다.");
      }
      throw error;
    }
  };

  return {
    suppliers: items,
    isLoading,
    addSupplier,
    editSupplier,
    deleteSupplier,
    refetch,
  };
}
