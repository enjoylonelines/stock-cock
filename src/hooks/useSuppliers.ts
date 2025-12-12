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
    return await deleteItem(id);
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
