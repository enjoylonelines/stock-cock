"use client";

import { Button } from "@/components/ui/button";
import DrawerView from "@/components/ui/drawer-view";
import { useUser } from "@/contexts/UserContext";
import { useBrands } from "@/app/products/_hooks/useBrands";
import { useCategories } from "@/app/products/_hooks/useCategories";
import { useWarehouses } from "@/hooks/useWarehouses";
import { createClient } from "@/lib/supabase/client";
import { generateSKU, generateUniqueFileName } from "@/lib/utils";
import { registerProduct, updateProduct } from "@/services/product-api";
import { useFormStateStore } from "@/store/formStateStore";
import type { Brand, Category, Warehouse } from "@/types/database";
import { clientLogger } from "@/utils/client-logger";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { type RefObject, useCallback, useEffect, useMemo, useState } from "react";
import { mutate } from "swr";
import ManageView from "@/app/transactions/_components/ManageView";
import { CommonInputView } from "./CommonInputView";
import { ProductFormFields } from "./ProductFormFields";
import { ProductImageUpload } from "./ProductImageUpload";
import { ProductTypeSelectView } from "./ProductTypeSelectView";
import { WeightPickerView } from "./WeightPickerView";
interface ProductCreateFormProps {
  scrollRef?: RefObject<HTMLDivElement | null>;
  closeDrawer: () => void;
  mode?: "create" | "edit";
  productId?: string;
  productOptionId?: string;
}

export default function ProductCreateForm({
  scrollRef,
  closeDrawer: closeMainDrawer,
  mode = "create",
  productId,
  productOptionId,
}: ProductCreateFormProps) {
  const [activeDrawer, setActiveDrawer] = useState<null | string>(null);
  const supabase = createClient();
  const [savedScrollPosition, setSavedScrollPosition] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const { warehouses, addWarehouse, editWarehouse, deleteWarehouse } = useWarehouses();
  const { categories, addCategory, editCategory, deleteCategory } = useCategories();
  const { brands, addBrand, editBrand, deleteBrand } = useBrands();
  const router = useRouter();
  const user = useUser();
  const productForm = useFormStateStore(state => state.productForm);
  const updateProductForm = useFormStateStore(state => state.updateProductForm);
  const resetProductForm = useFormStateStore(state => state.resetProductForm);
  const {
    imageFile,
    imagePath,
    localPreviewUrl,
    name,
    categoryId,
    brandId,
    productType,
    initQuantity,
    boxUnit,
    initLocation,
    weight,
    weightUnit,
    sku,
    storageType,
    origin,
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

  // 이미지 업로드 핸들러 (메모이제이션)
  const handleImageChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
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
    },
    [user, localPreviewUrl, updateProductForm]
  );

  // 저장 핸들러
  const handleSave = async () => {
    if (!name || !categoryId || !brandId || !productType) {
      alert("필수 정보를 모두 입력해주세요. (제품명, 카테고리, 브랜드, 제품 유형)");
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
          clientLogger.error("이미지 업로드 실패", error);
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
          storage_type: productType === "material" ? storageType || null : null,
          origin: productType === "material" ? origin || null : null,
          weight,
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
          storage_type: productType === "material" ? storageType || null : null,
          origin: productType === "material" ? origin || null : null,
          weight,
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

  // DrawerView 닫기 (스크롤 위치 복원) - 메모이제이션
  // biome-ignore lint/correctness/useExhaustiveDependencies: scrollRef는 ref 객체이므로 의존성 배열에 포함하지 않음
  const closeDrawer = useCallback(() => {
    setActiveDrawer(null);
    // 드로어가 닫힌 후 저장된 스크롤 위치로 복원
    setTimeout(() => {
      if (scrollRef?.current) {
        scrollRef.current.scrollTop = savedScrollPosition;
      }
    }, 100);
  }, [savedScrollPosition]);

  // 드로어 열기 (스크롤 위치 저장) - 메모이제이션
  const openDrawer = useCallback(
    (drawerName: string) => {
      // 현재 스크롤 위치 저장
      if (scrollRef?.current) {
        setSavedScrollPosition(scrollRef.current.scrollTop);
      }
      setActiveDrawer(drawerName);
    },
    [scrollRef]
  );

  // 폼 유효성 검사 - 메모이제이션
  const isFormValid = useMemo(() => {
    return !!(
      name &&
      categoryId &&
      brandId &&
      productType &&
      (mode === "create" ? initLocation : true)
    );
  }, [name, categoryId, brandId, productType, mode, initLocation]);

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
      <ProductImageUpload
        localPreviewUrl={localPreviewUrl}
        isUploading={isUploading}
        user={user}
        onImageChange={handleImageChange}
      />
      {/* 제품 등록 정보 */}
      <div className="flex-1 p-4">
        <ProductFormFields
          sku={sku}
          name={name}
          initQuantity={initQuantity}
          boxUnit={boxUnit}
          categoryId={categoryId}
          brandId={brandId}
          productType={productType}
          weight={weight}
          weightUnit={weightUnit}
          initLocation={initLocation}
          storageType={storageType}
          origin={origin}
          mode={mode}
          categories={categories}
          brands={brands}
          warehouses={warehouses}
          onNameChange={value => updateProductForm({ name: value })}
          onInitQuantityChange={value => updateProductForm({ initQuantity: value })}
          onBoxUnitChange={value => updateProductForm({ boxUnit: value })}
          onStorageTypeChange={value => updateProductForm({ storageType: value })}
          onOriginChange={value => updateProductForm({ origin: value })}
          onCategoryClick={() => openDrawer("category")}
          onBrandClick={() => openDrawer("brand")}
          onProductTypeClick={() => openDrawer("productType")}
          onWeightClick={() => openDrawer("weight")}
          onLocationClick={() => openDrawer("initLocation")}
        />
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
          onChange={e => updateProductForm({ name: e.target.value })}
          placeholder="제품명 입력"
          onClose={closeDrawer}
        />
      </DrawerView>

      <DrawerView isVisible={activeDrawer === "category"} scrollRef={scrollRef}>
        <ManageView<Category>
          title="카테고리 선택"
          items={categories}
          onBack={closeDrawer}
          onSelect={item => {
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
          onSelect={item => {
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
          onSelect={type => {
            updateProductForm({ productType: type });
            closeDrawer();
          }}
          onClose={closeDrawer}
        />
      </DrawerView>
      <DrawerView isVisible={activeDrawer === "initLocation"} scrollRef={scrollRef}>
        <ManageView<Warehouse>
          title="위치 선택"
          items={warehouses}
          onBack={closeDrawer}
          onSelect={item => {
            updateProductForm({ initLocation: item.id });
            closeDrawer();
          }}
          onAdd={addWarehouse}
          onEdit={editWarehouse}
          onDelete={deleteWarehouse}
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
