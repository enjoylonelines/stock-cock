import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * 트랜잭션 히스토리로부터 재고를 재계산하는 API
 * 특정 제품 옵션 ID를 제공하면 해당 제품만 재계산하고,
 * 제공하지 않으면 모든 제품을 재계산합니다.
 */
export async function POST(request: Request) {
  const supabase = await createClient();

  try {
    const body = await request.json();
    const { product_option_id } = body;

    // transactions와 transaction_items를 조회하여 재고를 계산합니다
    const { data: allTransactions, error: txError } = await supabase
      .from("transactions")
      .select("id, type, from_warehouse_id, to_warehouse_id, created_at")
      .order("created_at", { ascending: true });

    if (txError) {
      console.error("[TRANSACTIONS ERROR]", txError);
      return NextResponse.json({ error: "트랜잭션 조회 실패", detail: txError.message }, { status: 500 });
    }

    // transaction_items를 조회하고 transaction_id로 조인
    let itemsQuery = supabase
      .from("transaction_items")
      .select("id, transaction_id, product_option_id, quantity")
      .order("id", { ascending: true });

    if (product_option_id) {
      itemsQuery = itemsQuery.eq("product_option_id", product_option_id);
    }

    const { data: allItems, error: itemsError } = await itemsQuery;

    if (itemsError) {
      console.error("[ITEMS ERROR]", itemsError);
      return NextResponse.json({ error: "트랜잭션 아이템 조회 실패", detail: itemsError.message }, { status: 500 });
    }

    if (!allItems || allItems.length === 0) {
      return NextResponse.json({ message: "재계산할 트랜잭션이 없습니다.", recalculated: 0 });
    }

    // transaction_id로 매핑
    const txMap = new Map((allTransactions || []).map(tx => [tx.id, tx]));

    // 제품 옵션별, 창고별로 재고를 계산합니다
    const inventoryMap: Record<string, Record<string, number>> = {};

    for (const item of allItems) {
      const tx = txMap.get(item.transaction_id);
      if (!tx) continue;

      const productOptionId = item.product_option_id;
      const quantity = Number(item.quantity);

      if (!inventoryMap[productOptionId]) {
        inventoryMap[productOptionId] = {};
      }

      switch (tx.type) {
        case "in":
          // 입고: to_warehouse_id에 추가
          if (tx.to_warehouse_id) {
            if (!inventoryMap[productOptionId][tx.to_warehouse_id]) {
              inventoryMap[productOptionId][tx.to_warehouse_id] = 0;
            }
            inventoryMap[productOptionId][tx.to_warehouse_id] += quantity;
          }
          break;

        case "out":
          // 출고: from_warehouse_id에서 차감
          if (tx.from_warehouse_id) {
            if (!inventoryMap[productOptionId][tx.from_warehouse_id]) {
              inventoryMap[productOptionId][tx.from_warehouse_id] = 0;
            }
            inventoryMap[productOptionId][tx.from_warehouse_id] -= quantity;
          }
          break;

        case "move":
          // 이동: from_warehouse_id에서 차감, to_warehouse_id에 추가
          if (tx.from_warehouse_id) {
            if (!inventoryMap[productOptionId][tx.from_warehouse_id]) {
              inventoryMap[productOptionId][tx.from_warehouse_id] = 0;
            }
            inventoryMap[productOptionId][tx.from_warehouse_id] -= quantity;
          }
          if (tx.to_warehouse_id) {
            if (!inventoryMap[productOptionId][tx.to_warehouse_id]) {
              inventoryMap[productOptionId][tx.to_warehouse_id] = 0;
            }
            inventoryMap[productOptionId][tx.to_warehouse_id] += quantity;
          }
          break;

        case "adjust":
          // 조정: to_warehouse_id의 재고를 조정량만큼 변경
          // 조정은 transaction_items의 quantity가 조정량이므로 직접 더합니다
          if (tx.to_warehouse_id) {
            if (!inventoryMap[productOptionId][tx.to_warehouse_id]) {
              inventoryMap[productOptionId][tx.to_warehouse_id] = 0;
            }
            inventoryMap[productOptionId][tx.to_warehouse_id] += quantity;
          }
          break;
      }
    }

    // 계산된 재고를 inventory 테이블에 업데이트합니다
    let recalculated = 0;
    const errors: string[] = [];

    for (const [productOptionId, warehouses] of Object.entries(inventoryMap)) {
      for (const [warehouseId, calculatedQuantity] of Object.entries(warehouses)) {
        // 기존 inventory 레코드를 확인
        const { data: existingInventory, error: selectError } = await supabase
          .from("inventory")
          .select("*")
          .eq("product_option_id", productOptionId)
          .eq("warehouse_id", warehouseId)
          .maybeSingle();

        if (selectError) {
          errors.push(`재고 조회 실패 (${productOptionId}, ${warehouseId}): ${selectError.message}`);
          continue;
        }

        if (existingInventory) {
          // 기존 레코드 업데이트
          const { error: updateError } = await supabase
            .from("inventory")
            .update({ quantity: calculatedQuantity })
            .eq("id", existingInventory.id);

          if (updateError) {
            errors.push(`재고 업데이트 실패 (${productOptionId}, ${warehouseId}): ${updateError.message}`);
          } else {
            recalculated++;
          }
        } else {
          // 새 레코드 생성 (재고가 0이 아닌 경우만)
          if (calculatedQuantity !== 0) {
            const { error: insertError } = await supabase.from("inventory").insert([
              {
                product_option_id: productOptionId,
                warehouse_id: warehouseId,
                quantity: calculatedQuantity,
              },
            ]);

            if (insertError) {
              errors.push(`재고 생성 실패 (${productOptionId}, ${warehouseId}): ${insertError.message}`);
            } else {
              recalculated++;
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      recalculated,
      errors: errors.length > 0 ? errors : undefined,
      message: `${recalculated}개의 재고 레코드가 재계산되었습니다.`,
    });
  } catch (error) {
    console.error("[RECALCULATE ERROR]", error);
    return NextResponse.json({ error: "재고 재계산 실패", detail: String(error) }, { status: 500 });
  }
}
