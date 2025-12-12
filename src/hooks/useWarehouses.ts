import { useCRUD } from "./useCRUD";
import { Warehouse } from "@/types/database";

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
    return await deleteItem(id);
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
