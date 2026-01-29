import { createClient } from "@/lib/supabase/server";

export interface SettingsInfo {
  productCount: number;
  memberCount: number;
  locationCount: number;
  supplierCount: number;
}

/**
 * 설정 서비스 (서버 사이드)
 */
export const settingsService = {
  /**
   * 설정 페이지에 필요한 정보 가져오기
   */
  async getSettingsInfo(userId: string): Promise<SettingsInfo> {
    const supabase = await createClient();

    const [productsCountResult, membersCountResult, warehousesCountResult, suppliersCountResult] = await Promise.all([
      supabase.from("products").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("warehouses").select("*", { count: "exact", head: true }),
      supabase.from("suppliers").select("*", { count: "exact", head: true }),
    ]);

    return {
      productCount: productsCountResult.count || 0,
      memberCount: membersCountResult.count || 0,
      locationCount: warehousesCountResult.count || 0,
      supplierCount: suppliersCountResult.count || 0,
    };
  },
};
