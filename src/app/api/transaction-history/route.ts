import { createClient } from "@/lib/supabase/server";
import { APIError } from "@/utils/api-error";
import { handleAPIError } from "@/utils/api-handler";
import { apiLogger } from "@/utils/logger";
import { NextResponse } from "next/server";

export async function GET() {
  const endpoint = "/api/transaction-history";

  try {
    const supabase = await createClient();

    apiLogger.requestStart(endpoint);

    const { data, error } = await supabase.rpc("get_inventory_history");

    if (error) {
      apiLogger.dbError("재고 이력 조회", error);
      throw APIError.fromSupabaseError(error);
    }

    apiLogger.requestSuccess(endpoint, { count: data?.length || 0 });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return handleAPIError(error, endpoint);
  }
}
