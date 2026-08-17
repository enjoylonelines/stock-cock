import { createClient } from "@/lib/supabase/server";
import { APIError } from "@/utils/api-error";
import { handleAPIError } from "@/utils/api-handler";
import { setInventory } from "@/utils/inventory";
import { apiLogger } from "@/utils/logger";
import type { PostgrestError } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

/**
 * 트랜잭션 히스토리로부터 재고를 재계산하는 API
 * 특정 제품 옵션 ID를 제공하면 해당 제품만 재계산하고,
 * 제공하지 않으면 모든 제품을 재계산합니다.
 */
export async function POST(request: Request) {
  const endpoint = "/api/inventory/recalculate";
  const supabase = await createClient();

  try {
    const body = await request.json();
    const { product_option_id } = body;

    apiLogger.requestStart(endpoint, { product_option_id });

    type TxRow = { id: string; type: string | null; from_warehouse_id: string | null; to_warehouse_id: string | null; created_at: string | null };
    const { data: allTransactions, error: txError } = (await supabase
      .from("transactions")
      .select("id, type, from_warehouse_id, to_warehouse_id, created_at")
      .order("created_at", { ascending: true })) as unknown as { data: TxRow[] | null; error: PostgrestError | null };

    if (txError) {
      apiLogger.dbError("트랜잭션 조회", txError);
      throw APIError.fromSupabaseError(txError);
    }

    type ItemRow = { id: string; transaction_id: string | null; product_option_id: string | null; quantity: number | null };
    let itemsBaseQuery = supabase
      .from("transaction_items")
      .select("id, transaction_id, product_option_id, quantity")
      .order("id", { ascending: true });

    const itemsQueryResult = product_option_id
      ? await (itemsBaseQuery.eq("product_option_id", product_option_id) as unknown as Promise<{ data: ItemRow[] | null; error: PostgrestError | null }>)
      : await (itemsBaseQuery as unknown as Promise<{ data: ItemRow[] | null; error: PostgrestError | null }>);

    const { data: allItems, error: itemsError } = itemsQueryResult;

    if (itemsError) {
      apiLogger.dbError("트랜잭션 아이템 조회", itemsError);
      throw APIError.fromSupabaseError(itemsError);
    }

    if (!allItems || allItems.length === 0) {
      return NextResponse.json({ message: "재계산할 트랜잭션이 없습니다.", recalculated: 0 });
    }

    // 원재료 여부 판단을 위해 관련 product_options 조회
    const uniqueOptionIds = [...new Set(allItems.map(item => item.product_option_id))];
    type ProductOptionRow = { id: string; products: { product_type: string | null } | { product_type: string | null }[] | null };
    const { data: productOptions, error: optionsError } = (await supabase
      .from("product_options")
      .select("id, products(product_type)")
      .in("id", uniqueOptionIds as string[])) as unknown as { data: ProductOptionRow[] | null; error: PostgrestError | null };

    if (optionsError) {
      apiLogger.dbError("제품 옵션 조회", optionsError);
      throw APIError.fromSupabaseError(optionsError);
    }

    const isMaterialMap = new Map<string, boolean>(
      (productOptions ?? []).map(opt => {
        const products = opt.products;
        let productType: string | null = null;
        if (Array.isArray(products) && products.length > 0) {
          productType = (products[0] as { product_type: string | null }).product_type;
        } else if (products && !Array.isArray(products)) {
          productType = (products as { product_type: string | null }).product_type;
        }
        return [opt.id, productType === "material"];
      })
    );

    const txMap = new Map((allTransactions || []).map(tx => [tx.id, tx]));

    // 제품 옵션별, 창고별로 재고를 계산합니다
    const inventoryMap: Record<string, Record<string, number>> = {};

    for (const item of allItems) {
      const tx = txMap.get(item.transaction_id);
      if (!tx) continue;

      const optionId = item.product_option_id;
      const quantity = Number(item.quantity);

      if (!inventoryMap[optionId]) {
        inventoryMap[optionId] = {};
      }

      switch (tx.type) {
        case "in":
          if (tx.to_warehouse_id) {
            inventoryMap[optionId][tx.to_warehouse_id] = (inventoryMap[optionId][tx.to_warehouse_id] ?? 0) + quantity;
          }
          break;
        case "out":
          if (tx.from_warehouse_id) {
            inventoryMap[optionId][tx.from_warehouse_id] =
              (inventoryMap[optionId][tx.from_warehouse_id] ?? 0) - quantity;
          }
          break;
        case "move":
          if (tx.from_warehouse_id) {
            inventoryMap[optionId][tx.from_warehouse_id] =
              (inventoryMap[optionId][tx.from_warehouse_id] ?? 0) - quantity;
          }
          if (tx.to_warehouse_id) {
            inventoryMap[optionId][tx.to_warehouse_id] = (inventoryMap[optionId][tx.to_warehouse_id] ?? 0) + quantity;
          }
          break;
        case "adjust":
          if (tx.to_warehouse_id) {
            inventoryMap[optionId][tx.to_warehouse_id] = (inventoryMap[optionId][tx.to_warehouse_id] ?? 0) + quantity;
          }
          break;
      }
    }

    let recalculated = 0;
    const errors: string[] = [];

    for (const [optionId, warehouses] of Object.entries(inventoryMap)) {
      const isMaterial = isMaterialMap.get(optionId) ?? false;

      for (const [warehouseId, calculatedQuantity] of Object.entries(warehouses)) {
        try {
          await setInventory(supabase, {
            productOptionId: optionId,
            warehouseId,
            quantity: isMaterial ? undefined : calculatedQuantity,
            weightInGrams: isMaterial ? calculatedQuantity : undefined,
            isMaterial,
          });
          recalculated++;
        } catch (err) {
          errors.push(
            `재고 설정 실패 (${optionId}, ${warehouseId}): ${err instanceof Error ? err.message : String(err)}`
          );
        }
      }
    }

    apiLogger.requestSuccess(endpoint, { recalculated, errors: errors.length });
    return NextResponse.json({
      success: true,
      recalculated,
      errors: errors.length > 0 ? errors : undefined,
      message: `${recalculated}개의 재고 레코드가 재계산되었습니다.`,
    });
  } catch (error) {
    return handleAPIError(error, endpoint);
  }
}
