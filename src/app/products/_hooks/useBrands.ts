import { useCRUD } from "@/hooks/useCRUD";

interface Brand {
  id: string;
  name: string;
  [key: string]: unknown;
}

/**
 * 브랜드 훅 (Products 전용)
 */
export function useBrands() {
  const { items, isLoading, addItem, editItem, deleteItem, refetch } = useCRUD<Brand>({
    tableName: "brands",
    swrKey: "brands",
    orderBy: "name",
  });

  const addBrand = async (name: string) => {
    return await addItem({ name });
  };

  const editBrand = async (id: string, name: string) => {
    return await editItem(id, { name });
  };

  const deleteBrand = async (id: string) => {
    return await deleteItem(id);
  };

  return {
    brands: items,
    isLoading,
    addBrand,
    editBrand,
    deleteBrand,
    refetch,
  };
}
