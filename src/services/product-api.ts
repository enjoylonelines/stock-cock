import { createClient } from "@/lib/supabase/client";
import type { Product, ProductOption } from "@/types/database";
import type { Insertable } from "@/types/util";

export type ProductFormInput = Insertable<Product> &
  Omit<Insertable<ProductOption>, "product_id"> & {
    warehouse_id: string;
    quantity: number;
  };

/**
 * 제품 등록 API
 */
export async function registerProduct(form: ProductFormInput) {
  const response = await fetch("/api/products/manage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(form),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "제품 등록에 실패했습니다.");
  return data;
}

export async function deleteProduct(productId: string) {
  const response = await fetch("/api/products/manage", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ product_id: productId }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "제품 삭제에 실패했습니다.");
  return data;
}

/**
 * 제품 업데이트 API
 */
export async function updateProduct(
  productId: string,
  productOptionId: string,
  form: Omit<ProductFormInput, "warehouse_id" | "quantity">
) {
  const supabase = createClient();
  // 1. products 테이블 업데이트
  const { error: productError } = await supabase
    .from("products")
    .update({
      name: form.name,
      category_id: form.category_id,
      brand_id: form.brand_id,
      product_type: form.product_type,
      storage_type: form.storage_type || null,
      origin: form.origin || null,
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
