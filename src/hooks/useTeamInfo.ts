import { supabase } from "@/lib/supabase";
import { clientLogger } from "@/utils/client-logger";
import { useEffect, useState } from "react";

interface TeamInfo {
  productCount: number;
  locationCount: number;
  memberCount: number;
  supplierCount: number;
  customerCount: number;
}

export function useTeamInfo() {
  const [info, setInfo] = useState<TeamInfo>({
    productCount: 0,
    locationCount: 0,
    memberCount: 0,
    supplierCount: 0,
    customerCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [
          { count: productCount },
          { count: locationCount },
          { count: memberCount },
          { count: supplierCount },
          { count: customerCount },
        ] = await Promise.all([
          supabase.from("v_product_options").select("*", { count: "exact", head: true }),
          supabase.from("locations").select("*", { count: "exact", head: true }),
          supabase.from("users").select("*", { count: "exact", head: true }),
          supabase.from("suppliers").select("*", { count: "exact", head: true }),
          supabase.from("customers").select("*", { count: "exact", head: true }),
        ]);

        setInfo({
          productCount: productCount ?? 0,
          locationCount: locationCount ?? 0,
          memberCount: memberCount ?? 0,
          supplierCount: supplierCount ?? 0,
          customerCount: customerCount ?? 0,
        });
      } catch (error) {
        clientLogger.error("팀 정보를 가져오는데 실패했습니다", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetch();
  }, []);

  return { info, isLoading };
}
