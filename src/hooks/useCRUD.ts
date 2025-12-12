import useSWR, { mutate, MutatorOptions } from "swr";
import { supabase } from "@/lib/supabase";
import { swrConfig } from "@/lib/swr-config";

interface CRUDEntity {
  id: string;
  name: string;
  [key: string]: any;
}

interface UseCRUDOptions<T extends CRUDEntity> {
  tableName: string;
  swrKey: string;
  orderBy?: string;
  transform?: (data: any[]) => T[];
}

/**
 * 공통 CRUD 훅 - Supabase 테이블에 대한 표준 CRUD 작업을 제공합니다.
 * @param options - CRUD 설정 옵션
 * @returns CRUD 작업을 위한 훅 반환값
 */
export function useCRUD<T extends CRUDEntity>({ tableName, swrKey, orderBy = "name", transform }: UseCRUDOptions<T>) {
  const fetcher = async () => {
    const { data, error } = await supabase.from(tableName).select("*").order(orderBy);
    if (error) throw error;
    const result = (data || []) as T[];
    return transform ? transform(result) : result;
  };

  const { data: items = [], isLoading, error } = useSWR<T[]>(swrKey, fetcher, swrConfig);

  const addItem = async (itemData: Partial<T>) => {
    const { data, error } = await supabase.from(tableName).insert(itemData).select().single();
    if (error) throw error;
    await mutate(swrKey, (current: T[] = []) => [...current, data], false);
    return data;
  };

  const editItem = async (id: string, itemData: Partial<T>) => {
    const { data, error } = await supabase.from(tableName).update(itemData).eq("id", id).select().single();
    if (error) throw error;
    await mutate(swrKey, (current: T[] = []) => current.map((item) => (item.id === id ? data : item)), false);
    return data;
  };

  const deleteItem = async (id: string) => {
    const { error } = await supabase.from(tableName).delete().eq("id", id);
    if (error) throw error;
    await mutate(swrKey, (current: T[] = []) => current.filter((item) => item.id !== id), false);
  };

  const refetch = () => mutate(swrKey);

  return {
    items,
    isLoading,
    error,
    addItem,
    editItem,
    deleteItem,
    refetch,
  };
}

