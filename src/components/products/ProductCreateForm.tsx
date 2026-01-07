"use client";

import { Button } from "@/components/ui/button";
import DrawerView from "@/components/ui/drawer-view";
import { useUser } from "@/contexts/UserContext";
import { useBrands } from "@/hooks/useBrands";
import { useCategories } from "@/hooks/useCategories";
import { useLocations } from "@/hooks/useWarehouses";
import { supabase } from "@/lib/supabase";
import { formatWeightDisplay, generateSKU, generateUniqueFileName } from "@/lib/utils";
import { useFormStateStore, type ProductType } from "@/store/formStateStore";
import type { Product, ProductOption } from "@/types/database";
import type { Brand, Category, Warehouse } from "@/types/database";
import type { Insertable } from "@/types/util";
import { ArrowLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { type RefObject, useCallback, useEffect, useMemo, useState } from "react";
import { mutate } from "swr";
import ManageView from "../receipts/ManageView";
interface ProductCreateFormProps {
  scrollRef?: RefObject<HTMLDivElement | null>;
  closeDrawer: () => void;
  mode?: "create" | "edit";
  productId?: string;
  productOptionId?: string;
}

type ProductFormInput = Insertable<Product> & Insertable<ProductOption> & { warehouse_id: string; quantity: number };

async function registerProduct(form: ProductFormInput) {
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

async function updateProduct(productId: string, productOptionId: string, form: Omit<ProductFormInput, "warehouse_id" | "quantity">) {
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

// 중량 선택 컴포넌트
const WeightPickerView = ({
  currentWeight,
  currentWeightUnit,
  onSelect,
  onClose,
}: {
  currentWeight: number;
  currentWeightUnit?: "g" | "kg";
  onSelect: (weightInGrams: number, unit: "g" | "kg") => void;
  onClose: () => void;
}) => {
  // 현재 중량을 kg/g로 변환
  const getDisplayWeight = useCallback((weightInGrams: number, preferredUnit?: "g" | "kg") => {
    // 선호하는 단위가 있으면 그것을 사용
    if (preferredUnit === "kg") {
      const kgValue = weightInGrams / 1000;
      const formattedValue = kgValue % 1 === 0 ? kgValue.toString() : Number.parseFloat(kgValue.toFixed(2)).toString();
      return { value: formattedValue, unit: "kg" as const };
    }
    if (preferredUnit === "g") {
      return { value: weightInGrams.toString(), unit: "g" as const };
    }

    // 선호하는 단위가 없으면 기본 규칙: 1000g 이상이면 kg로 표시
    if (weightInGrams >= 1000) {
      const kgValue = weightInGrams / 1000;
      const formattedValue = kgValue % 1 === 0 ? kgValue.toString() : Number.parseFloat(kgValue.toFixed(2)).toString();
      return { value: formattedValue, unit: "kg" as const };
    }
    return { value: weightInGrams.toString(), unit: "g" as const };
  }, []);

  const displayWeight = getDisplayWeight(currentWeight, currentWeightUnit);
  const [selectedValue, setSelectedValue] = useState<string>(displayWeight.value);
  const [selectedUnit, setSelectedUnit] = useState<"g" | "kg">(displayWeight.unit);

  // currentWeight나 currentWeightUnit이 변경되면 상태 업데이트
  useEffect(() => {
    const newDisplayWeight = getDisplayWeight(currentWeight, currentWeightUnit);
    setSelectedValue(newDisplayWeight.value);
    setSelectedUnit(newDisplayWeight.unit);
  }, [currentWeight, currentWeightUnit, getDisplayWeight]);

  // 단위 변경 핸들러
  const handleUnitChange = (newUnit: "g" | "kg") => {
    const oldUnit = selectedUnit;
    const currentNumValue = Number(selectedValue);

    if (!selectedValue || Number.isNaN(currentNumValue) || currentNumValue <= 0) {
      setSelectedUnit(newUnit);
      return;
    }

    // 단위 변경 시 값 조정
    if (oldUnit === "g" && newUnit === "kg") {
      // g -> kg: 1000으로 나누기 (소수점 보존)
      const newValue = currentNumValue / 1000;
      const formattedValue = newValue % 1 === 0 ? newValue.toString() : Number.parseFloat(newValue.toFixed(2)).toString();
      setSelectedValue(formattedValue);
    } else if (oldUnit === "kg" && newUnit === "g") {
      // kg -> g: 1000 곱하기 (정수로 변환)
      const newValue = Math.round(currentNumValue * 1000);
      setSelectedValue(newValue.toString());
    }

    setSelectedUnit(newUnit);
  };

  // 완료 버튼 클릭 시 그램으로 변환해서 전달
  const handleDone = () => {
    const numValue = Number(selectedValue);
    if (!selectedValue || Number.isNaN(numValue) || numValue <= 0) {
      alert("올바른 중량을 입력해주세요.");
      return;
    }

    // 최종 검증: 그램 단위로 변환한 값으로 검증
    const weightInGrams = selectedUnit === "kg" ? numValue * 1000 : numValue;
    const minGrams = 1;
    const maxGrams = 50000; // 50kg까지 허용

    if (weightInGrams < minGrams || weightInGrams > maxGrams) {
      alert(`중량은 ${minGrams}g부터 ${maxGrams}g(50kg)까지 입력 가능합니다.`);
      return;
    }

    onSelect(weightInGrams, selectedUnit);
  };

  // 숫자 포맷팅
  const formatDisplayValue = (value: string): string => {
    if (!value) return "";
    const num = Number(value);
    if (Number.isNaN(num)) return "";
    if (selectedUnit === "kg") {
      // 정수면 정수로, 소수면 최대 2자리까지 표시 (불필요한 0 제거)
      if (num % 1 === 0) {
        return `${num}kg`;
      }
      // 소수점이 있으면 최대 2자리까지 표시하되, 마지막 0은 제거
      return `${Number.parseFloat(num.toFixed(2))}kg`;
    }
    return `${num}g`;
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center px-4 py-3 border-b">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h2 className="ml-2 text-lg font-semibold">중량 선택</h2>
      </div>
      <div className="flex flex-col flex-1 gap-6 justify-center px-6 py-8">
        {/* 중량 입력 및 단위 선택 */}
        <div className="flex gap-4 justify-center items-center">
          {/* 중량 입력 필드 */}
          <div className="flex-1 max-w-xs">
            <input
              type="number"
              value={selectedValue}
              onChange={(e) => {
                const value = e.target.value;
                // 숫자만 입력 가능
                if (value === "" || (!Number.isNaN(Number(value)) && Number(value) >= 0)) {
                  setSelectedValue(value);
                }
              }}
              placeholder={selectedUnit === "kg" ? "0.1" : "1"}
              step={selectedUnit === "kg" ? "0.01" : "1"}
              min={selectedUnit === "kg" ? "0.1" : "1"}
              max={selectedUnit === "kg" ? "50" : "50000"}
              className="p-4 w-full text-2xl text-center rounded-lg border-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
            />
          </div>

          {/* 단위 선택 버튼 */}
          <div className="flex gap-2">
            <Button
              variant={selectedUnit === "g" ? "default" : "outline"}
              size="lg"
              onClick={() => handleUnitChange("g")}
              className={`min-w-[60px] h-12 text-lg font-semibold ${
                selectedUnit === "g"
                  ? "bg-orange-500 text-white hover:bg-orange-600"
                  : "border-2 border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              g
            </Button>
            <Button
              variant={selectedUnit === "kg" ? "default" : "outline"}
              size="lg"
              onClick={() => handleUnitChange("kg")}
              className={`min-w-[60px] h-12 text-lg font-semibold ${
                selectedUnit === "kg"
                  ? "bg-orange-500 text-white hover:bg-orange-600"
                  : "border-2 border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              kg
            </Button>
          </div>
        </div>

        {/* 선택된 값 미리보기 */}
        <div className="text-center">
          <p className="text-sm text-gray-500">선택된 중량</p>
          <p className="text-2xl font-bold text-orange-500">{formatDisplayValue(selectedValue) || "입력 필요"}</p>
          {selectedValue && !Number.isNaN(Number(selectedValue)) && (
            <p className="mt-1 text-xs text-gray-400">
              ({selectedUnit === "kg" ? Math.round(Number(selectedValue) * 1000) : selectedValue}g로 저장됨)
            </p>
          )}
        </div>

        {/* 완료 버튼 */}
        <Button onClick={handleDone} className="w-full h-12 text-lg font-semibold text-white bg-orange-500 hover:bg-orange-600">
          완료
        </Button>
      </div>
    </div>
  );
};

export default function ProductCreateForm({
  scrollRef,
  closeDrawer: closeMainDrawer,
  mode = "create",
  productId,
  productOptionId,
}: ProductCreateFormProps) {
  const [activeDrawer, setActiveDrawer] = useState<null | string>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { locations, addLocation, editLocation, deleteLocation } = useLocations();
  const { categories, addCategory, editCategory, deleteCategory } = useCategories();
  const { brands, addBrand, editBrand, deleteBrand } = useBrands();
  const router = useRouter();
  const user = useUser();
  const productForm = useFormStateStore((state) => state.productForm);
  const updateProductForm = useFormStateStore((state) => state.updateProductForm);
  const resetProductForm = useFormStateStore((state) => state.resetProductForm);
  const {
    imageFile,
    imagePath,
    localPreviewUrl,
    name,
    categoryId,
    brandId,
    productType,
    buyPrice,
    sellPrice,
    initQuantity,
    boxUnit,
    initLocation,
    weight,
    weightUnit,
    sku,
    editingProductId,
    editingProductOptionId,
  } = productForm;

  // 수정 모드일 때 formStateStore에서 ID 사용
  const finalProductId = productId || editingProductId;
  const finalProductOptionId = productOptionId || editingProductOptionId;

  // 옵션 중량 변경 시 SKU 자동 생성
  useEffect(() => {
    if (name && weight) {
      const nextSku = generateSKU(name, weight);
      if (sku !== nextSku) {
        updateProductForm({ sku: nextSku });
      }
    } else if (sku) {
      updateProductForm({ sku: "" });
    }
  }, [name, weight, sku, updateProductForm]);

  // 이미지 업로드 핸들러
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) {
      alert("이미지를 업로드하려면 로그인이 필요합니다.");
      return;
    }

    const file = e.target.files;
    if (!file || !file[0]) return;

    // 고유한 파일명 생성
    const newFileName = generateUniqueFileName(file[0].name);

    if (localPreviewUrl) {
      URL.revokeObjectURL(localPreviewUrl);
    }

    // 로컬 미리보기 URL 생성
    const localUrl = URL.createObjectURL(file[0]);
    updateProductForm({
      imageFile: file[0],
      imagePath: newFileName,
      localPreviewUrl: localUrl,
    });
  };

  // 저장 핸들러
  const handleSave = async () => {
    if (!name || !buyPrice || !sellPrice || !categoryId || !brandId || !productType) {
      alert("필수 정보를 모두 입력해주세요. (제품명, 구매가, 판매가, 카테고리, 브랜드, 제품 유형)");
      return;
    }

    if (mode === "edit" && (!finalProductId || !finalProductOptionId)) {
      alert("제품 ID가 없습니다.");
      return;
    }

    // 등록 모드일 때 위치 선택 필수
    if (mode === "create" && !initLocation) {
      alert("초기 위치를 선택해주세요.");
      return;
    }

    try {
      setIsUploading(true);

      // 이미지가 있으면 Supabase Storage에 업로드
      let finalImageUrl = imagePath && !imageFile ? imagePath : ""; // 수정 모드에서 이미지가 변경되지 않았으면 기존 URL 사용
      if (imageFile && imagePath) {
        const { data, error } = await supabase.storage.from("image").upload(imagePath, imageFile, {
          headers: {
            "x-upsert": "true",
          },
        });

        if (error) {
          console.error("이미지 업로드 실패:", error);
          alert("이미지 업로드에 실패했습니다.");
          return;
        }

        // Public URL 가져오기
        const { data: urlData } = supabase.storage.from("image").getPublicUrl(data.path);

        finalImageUrl = urlData.publicUrl;
      }

      if (mode === "edit" && finalProductId && finalProductOptionId) {
        // 제품 업데이트
        await updateProduct(finalProductId, finalProductOptionId, {
          name,
          category_id: categoryId,
          brand_id: brandId,
          product_type: productType,
          weight,
          buy_price: Number(buyPrice),
          sell_price: Number(sellPrice),
          unit_label: weightUnit, // 선택한 단위(g 또는 kg)로 저장
          box_unit: boxUnit ? Number(boxUnit) : null,
          sku,
          image_url: finalImageUrl,
        });

        if (localPreviewUrl && imageFile) {
          URL.revokeObjectURL(localPreviewUrl);
        }

        // SWR 캐시 즉시 업데이트
        await Promise.all([
          mutate("products"), // 제품 목록 캐시 무효화 및 재검증
          mutate(["product", finalProductOptionId]), // 개별 제품 캐시 무효화 및 재검증
        ]);

        resetProductForm();
        closeMainDrawer();
        router.refresh(); // 데이터 새로고침
      } else {
        // 제품 등록
        await registerProduct({
          name,
          category_id: categoryId,
          brand_id: brandId,
          product_type: productType,
          weight,
          buy_price: Number(buyPrice),
          sell_price: Number(sellPrice),
          unit_label: weightUnit, // 선택한 단위(g 또는 kg)로 저장
          box_unit: boxUnit ? Number(boxUnit) : null,
          sku,
          image_url: finalImageUrl,
          quantity: +initQuantity || 0,
          warehouse_id: initLocation, // initLocation은 위치 ID를 의미
        });

        if (localPreviewUrl) {
          URL.revokeObjectURL(localPreviewUrl);
        }
        resetProductForm();
        closeMainDrawer();
        router.push("/products");
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert("저장 중 알 수 없는 오류가 발생했습니다.");
      }
    } finally {
      setIsUploading(false);
    }
  };

  // DrawerView 닫기
  const closeDrawer = () => setActiveDrawer(null);

  // localPreviewUrl 정리
  useEffect(() => {
    return () => {
      if (localPreviewUrl) {
        URL.revokeObjectURL(localPreviewUrl);
      }
    };
  }, [localPreviewUrl]);

  return (
    <div className="flex relative flex-col self-stretch h-full">
      {/* 제품 이미지 */}
      <div className="flex flex-col items-center pt-6 pb-2">
        <label className="flex overflow-hidden relative justify-center items-center w-24 h-24 bg-gray-100 rounded-md cursor-pointer">
          {localPreviewUrl ? (
            <Image src={localPreviewUrl} alt="제품 이미지" width={96} height={96} className="object-cover w-full h-full" />
          ) : (
            <span className="text-sm text-center text-gray-400">
              {user ? (
                <>
                  사진
                  <br />
                  추가
                </>
              ) : (
                <>
                  로그인이
                  <br />
                  필요합니다
                </>
              )}
            </span>
          )}
          <input
            type="file"
            accept="image/*"
            className="absolute inset-0 opacity-0 cursor-pointer"
            onChange={handleImageChange}
            disabled={isUploading || !user}
          />
        </label>
        {isUploading && <span className="mt-2 text-sm text-gray-500">업로드 중...</span>}
      </div>
      {/* 제품 등록 정보 */}
      <div className="flex-1 p-4">
        <div className="space-y-2">
          <div className="flex gap-2 items-center py-2 w-full">
            <h3 className="font-medium">SKU:</h3>
            <p className="text-sm text-gray-400">{sku ? sku : "-"}</p>
          </div>
          <div className="flex gap-2 items-center py-2 w-full">
            <h3 className="w-20 font-medium">제품명</h3>
            <input
              value={name}
              onChange={(e) => updateProductForm({ name: e.target.value })}
              placeholder="제품명 입력"
              className="flex-1 p-2 text-base rounded border focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
          <div className="flex gap-2 items-center py-2 w-full">
            <h3 className="w-20 font-medium">구매가</h3>
            <input
              value={buyPrice}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, "");
                updateProductForm({ buyPrice: val });
              }}
              placeholder="구매가 입력"
              type="number"
              inputMode="numeric"
              pattern="[0-9]*"
              className="flex-1 p-2 text-base rounded border focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
          <div className="flex gap-2 items-center py-2 w-full">
            <h3 className="w-20 font-medium">판매가</h3>
            <input
              value={sellPrice}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, "");
                updateProductForm({ sellPrice: val });
              }}
              placeholder="판매가 입력"
              type="number"
              inputMode="numeric"
              pattern="[0-9]*"
              className="flex-1 p-2 text-base rounded border focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
          {mode === "create" && (
            <div className="flex gap-2 items-center py-2 w-full">
              <h3 className="w-20 font-medium">초기수량</h3>
              <input
                value={initQuantity}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, "");
                  updateProductForm({ initQuantity: val });
                }}
                placeholder="초기 수량 입력"
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                className="flex-1 p-2 text-base rounded border focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
          )}
          <div className="flex gap-2 items-center py-2 w-full">
            <h3 className="w-20 font-medium">박스 단위</h3>
            <input
              value={boxUnit}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, "");
                updateProductForm({ boxUnit: val });
              }}
              placeholder="박스 1개당 수량"
              type="number"
              inputMode="numeric"
              pattern="[0-9]*"
              className="flex-1 p-2 text-base rounded border focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
          <p className="text-xs text-gray-500">예: 박스당 12개면 12를 입력하세요.</p>
          <Button
            onClick={() => setActiveDrawer("category")}
            variant="ghost"
            className="flex justify-between items-center py-2 w-full"
            size="none"
          >
            <div className="flex justify-between w-full">
              <h3 className="font-medium">카테고리</h3>
              <p className="text-sm text-gray-500">{categories.find((c) => c.id === categoryId)?.name || "카테고리 선택"}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Button>
          <Button
            onClick={() => setActiveDrawer("brand")}
            variant="ghost"
            className="flex justify-between items-center py-2 w-full"
            size="none"
          >
            <div className="flex justify-between w-full">
              <h3 className="font-medium">브랜드</h3>
              <p className="text-sm text-gray-500">{brands.find((b) => b.id === brandId)?.name || "브랜드 선택"}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Button>
          <Button
            onClick={() => setActiveDrawer("productType")}
            variant="ghost"
            className="flex justify-between items-center py-2 w-full"
            size="none"
          >
            <div className="flex justify-between w-full">
              <h3 className="font-medium">제품 유형</h3>
              <p className="text-sm text-gray-500">
                {productType === "company"
                  ? "자사"
                  : productType === "franchise"
                  ? "가맹점"
                  : productType === "pb"
                  ? "PB제품"
                  : "제품 유형 선택"}
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Button>
          <Button
            onClick={() => setActiveDrawer("weight")}
            variant="ghost"
            className="flex justify-between items-center py-2 w-full"
            size="none"
          >
            <div className="flex justify-between w-full">
              <h3 className="font-medium">중량</h3>
              <p className="text-sm text-gray-500">{formatWeightDisplay(weight, weightUnit)}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Button>
          {mode === "create" && (
            <Button
              onClick={() => setActiveDrawer("initLocation")}
              variant="ghost"
              className="flex justify-between items-center py-2 w-full"
              size="none"
            >
              <div className="flex justify-between w-full">
                <h3 className="font-medium">위치</h3>
                <p className="text-sm text-gray-500">{locations.find((l) => l.id === initLocation)?.name || "위치 선택"}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </Button>
          )}
        </div>
      </div>
      {/* 하단 버튼 */}
      <div className="p-4 pb-8 border-t">
        <Button
          className="w-full h-12 text-lg font-semibold text-white bg-orange-500 hover:bg-orange-600"
          onClick={handleSave}
          disabled={isUploading}
        >
          {isUploading ? "저장 중..." : mode === "edit" ? "수정 완료" : "저장"}
        </Button>
      </div>

      {/* DrawerView: 상세 입력 화면 */}
      <DrawerView isVisible={activeDrawer === "name"} scrollRef={scrollRef}>
        <CommonInputView
          title="제품명 입력"
          value={name}
          onChange={(e) => updateProductForm({ name: e.target.value })}
          placeholder="제품명 입력"
          onClose={closeDrawer}
        />
      </DrawerView>
      {/* <DrawerView isVisible={activeDrawer === "barcode"} scrollRef={scrollRef}>
        <CommonInputView
          title="바코드 입력"
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          placeholder="바코드 입력"
          onClose={closeDrawer}
        />
      </DrawerView> */}

      <DrawerView isVisible={activeDrawer === "category"} scrollRef={scrollRef}>
        <ManageView<Category>
          title="카테고리 선택"
          items={categories}
          onBack={closeDrawer}
          onSelect={(item) => {
            updateProductForm({ categoryId: item.id });
            closeDrawer();
          }}
          onAdd={addCategory}
          onEdit={editCategory}
          onDelete={deleteCategory}
        />
      </DrawerView>
      <DrawerView isVisible={activeDrawer === "brand"} scrollRef={scrollRef}>
        <ManageView<Brand>
          title="브랜드 선택"
          items={brands}
          onBack={closeDrawer}
          onSelect={(item) => {
            updateProductForm({ brandId: item.id });
            closeDrawer();
          }}
          onAdd={addBrand}
          onEdit={editBrand}
          onDelete={deleteBrand}
        />
      </DrawerView>
      <DrawerView isVisible={activeDrawer === "productType"} scrollRef={scrollRef}>
        <ProductTypeSelectView
          currentType={productType}
          onSelect={(type) => {
            updateProductForm({ productType: type });
            closeDrawer();
          }}
          onClose={closeDrawer}
        />
      </DrawerView>
      <DrawerView isVisible={activeDrawer === "initLocation"} scrollRef={scrollRef}>
        <ManageView<Warehouse>
          title="위치 선택"
          items={locations}
          onBack={closeDrawer}
          onSelect={(item) => {
            updateProductForm({ initLocation: item.id });
            closeDrawer();
          }}
          onAdd={addLocation}
          onEdit={editLocation}
          onDelete={deleteLocation}
        />
      </DrawerView>

      <DrawerView isVisible={activeDrawer === "weight"} scrollRef={scrollRef}>
        <WeightPickerView
          currentWeight={weight}
          currentWeightUnit={weightUnit}
          onSelect={(weightInGrams, unit) => {
            updateProductForm({ weight: weightInGrams, weightUnit: unit });
            closeDrawer();
          }}
          onClose={closeDrawer}
        />
      </DrawerView>
    </div>
  );
}

// 제품 유형 선택 컴포넌트
const ProductTypeSelectView = ({
  currentType,
  onSelect,
  onClose,
}: {
  currentType: ProductType;
  onSelect: (type: ProductType) => void;
  onClose: () => void;
}) => {
  const productTypes: Array<{ value: ProductType; label: string }> = [
    { value: "company", label: "자사" },
    { value: "franchise", label: "가맹점" },
    { value: "pb", label: "PB제품" },
  ];

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center px-4 py-3 border-b">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h2 className="ml-2 text-lg font-semibold">제품 유형 선택</h2>
      </div>
      <div className="flex flex-col flex-1 gap-2 px-4 py-4">
        {productTypes.map((type) => (
          <Button
            key={type.value}
            variant={currentType === type.value ? "default" : "ghost"}
            className={`flex justify-start items-center py-3 w-full text-left ${
              currentType === type.value ? "bg-orange-500 text-white hover:bg-orange-600" : "hover:bg-gray-50"
            }`}
            onClick={() => {
              onSelect(type.value);
              onClose();
            }}
          >
            <span className="text-base font-medium">{type.label}</span>
            {currentType === type.value && <ChevronRight className="ml-auto w-5 h-5 text-white" />}
          </Button>
        ))}
      </div>
    </div>
  );
};

const CommonInputView = ({
  title,
  value,
  onChange,
  placeholder,
  onClose,
}: {
  title: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  onClose: () => void;
}) => {
  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center px-4 py-3 border-b">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h2 className="ml-2 text-lg font-semibold">{title}</h2>
      </div>
      <div className="flex flex-col flex-1 justify-center px-6">
        <input
          value={value}
          onChange={(e) => onChange(e)}
          placeholder={placeholder}
          className="p-3 w-full text-lg rounded border focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
        <Button className="mt-6 text-white bg-orange-500 hover:bg-orange-600" onClick={onClose}>
          완료
        </Button>
      </div>
    </div>
  );
};
