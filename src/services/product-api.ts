import { supabase } from "@/lib/supabase";
import type { Product, ProductOption } from "@/types/database";
import type { Insertable } from "@/types/util";

export type ProductFormInput = Insertable<Product> &
  Insertable<ProductOption> & {
    warehouse_id: string;
    quantity: number;
  };

/**
 * 제품 등록 API
 */
export async function registerProduct(form: ProductFormInput) {
  // 필수 필드 검증
  if (!form.name || !form.category_id || !form.brand_id || !form.product_type) {
    throw new Error("필수 정보가 누락되었습니다.");
  }

  // 1. products 테이블에 insert
  const { data: product, error: productError } = await supabase
    .from("products")
    .insert([
      {
        name: form.name,
        category_id: form.category_id,
        brand_id: form.brand_id,
        product_type: form.product_type,
        image_url: form.image_url || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (productError) {
    throw new Error(`제품 등록 실패: ${productError.message}`);
  }

  if (!product || !product.id) {
    throw new Error("제품 등록 후 데이터를 가져오지 못했습니다.");
  }

  // 2. product_options 테이블에 insert
  const { data: option, error: optionError } = await supabase
    .from("product_options")
    .insert([
      {
        product_id: product.id,
        weight: form.weight,
        buy_price: form.buy_price,
        sell_price: form.sell_price,
        unit_label: form.unit_label,
        box_unit: form.box_unit,
        sku: form.sku,
      },
    ])
    .select()
    .single();

  if (optionError) {
    throw new Error(`옵션 등록 실패: ${optionError.message}`);
  }

  if (!option || !option.id) {
    throw new Error("제품 옵션 등록 후 데이터를 가져오지 못했습니다.");
  }

  // 3. inventory 테이블에 insert (warehouse_id가 있는 경우만)
  let inventory = null;
  if (form.warehouse_id) {
    const { data: inventoryData, error: inventoryError } = await supabase
      .from("inventory")
      .insert([
        {
          product_option_id: option.id,
          warehouse_id: form.warehouse_id,
          quantity: form.quantity || 0,
          updated_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (inventoryError) {
      throw new Error(`인벤토리 등록 실패: ${inventoryError.message}`);
    }

    if (!inventoryData) {
      throw new Error("인벤토리 등록 후 데이터를 가져오지 못했습니다.");
    }

    inventory = inventoryData;
  }

  return { product, option, inventory };
}

/**
 * 제품 업데이트 API
 */
export async function updateProduct(
  productId: string,
  productOptionId: string,
  form: Omit<ProductFormInput, "warehouse_id" | "quantity">
) {
  // 1. products 테이블 업데이트
  const { error: productError } = await supabase
    .from("products")
    .update({
      name: form.name,
      category_id: form.category_id,
      brand_id: form.brand_id,
      product_type: form.product_type,
      image_url: form.image_url,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId);

  if (productError) {
    throw new Error(`제품 업데이트 실패: ${productError.message}`);
  }

  // 2. product_options 테이블 업데이트
  const { error: optionError } = await supabase
    .from("product_options")
    .update({
      weight: form.weight,
      buy_price: form.buy_price,
      sell_price: form.sell_price,
      unit_label: form.unit_label,
      box_unit: form.box_unit,
      sku: form.sku,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productOptionId);

  if (optionError) {
    throw new Error(`옵션 업데이트 실패: ${optionError.message}`);
  }
}
