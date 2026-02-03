import { useCRUD } from "@/hooks/useCRUD";
import type { Category } from "@/types/database";

/**
 * 카테고리 훅 (Products 전용)
 */
export function useCategories() {
  const { items, isLoading, addItem, editItem, deleteItem, refetch } = useCRUD<Category>({
    tableName: "categories",
    swrKey: "categories",
    orderBy: "name",
  });

  const addCategory = async (name: string) => {
    return await addItem({ name });
  };

  const editCategory = async (id: string, name: string) => {
    return await editItem(id, { name });
  };

  const deleteCategory = async (id: string) => {
    return await deleteItem(id);
  };

  return {
    categories: items,
    isLoading,
    addCategory,
    editCategory,
    deleteCategory,
    refetch,
  };
}
