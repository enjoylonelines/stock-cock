"use client";

import { useState, useEffect, RefObject } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronRight } from "lucide-react";
import DrawerView from "@/components/ui/drawer-view";
import { useLocations } from "@/hooks/useWarehouses";
import ManageView from "../receipts/ManageView";
import { useCategories } from "@/hooks/useCategories";
import { useBrands } from "@/hooks/useBrands";
import { useRouter } from "next/navigation";
import { Inventory, Product, ProductOption } from "@/types/database";
import { Insertable } from "@/types/util";
import { Brand, Category, Warehouse } from "@/types/database";
import Image from "next/image";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/lib/supabase";
import { generateSKU, generateUniqueFileName } from "@/lib/utils";

const WEIGHT_OPTIONS = [350, 360, 400, 1000, 1400, 2400, 4000, 4200, 4300];

interface ProductCreateFormProps {
  scrollRef?: RefObject<HTMLDivElement | null>;
  closeDrawer: () => void;
}

type ProductFormInput = Insertable<Product> & Insertable<ProductOption> & { warehouse_id: string; quantity: number };

async function registerProduct(form: ProductFormInput) {
  // 1. products 테이블에 insert
  const { data: product, error: productError } = await supabase
    .from("products")
    .insert([
      {
        name: form.name,
        category_id: form.category_id,
        brand_id: form.brand_id,
        image_url: form.image_url,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (productError) {
    throw new Error("제품 등록 실패: " + productError.message);
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
        sku: form.sku,
      },
    ])
    .select()
    .single();

  const { data: inventory, error: inventoryError } = await supabase
    .from("inventory")
    .insert([
      {
        product_option_id: option.id,
        warehouse_id: form.warehouse_id,
        quantity: form.quantity,
        updated_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (optionError) {
    throw new Error("옵션 등록 실패: " + optionError.message);
  }
  if (inventoryError) {
    throw new Error("인벤토리 등록 실패: " + inventoryError.message);
  }

  return { product, option, inventory };
}

export default function ProductCreateForm({ scrollRef, closeDrawer: closeMainDrawer }: ProductCreateFormProps) {
  // 상태
  const [image, setImage] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [barcode, setBarcode] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [buyPrice, setBuyPrice] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [initQuantity, setInitQuantity] = useState("");
  const [initLocation, setInitLocation] = useState("");
  const [weight, setWeight] = useState(WEIGHT_OPTIONS[0]);
  const { brands, addBrand, editBrand, deleteBrand } = useBrands();
  const [activeDrawer, setActiveDrawer] = useState<null | string>(null);
  const [sku, setSKU] = useState("");
  const [imagePath, setImagePath] = useState<string>("");
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const { locations, addLocation, editLocation, deleteLocation } = useLocations();
  const { categories, addCategory, editCategory, deleteCategory } = useCategories();
  const router = useRouter();
  const user = useUser();

  // 옵션 중량 변경 시 SKU 자동 생성
  useEffect(() => {
    if (name && weight) {
      setSKU(generateSKU(name, weight));
    }
  }, [name, weight]);

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

    // 로컬 미리보기 URL 생성
    const localUrl = URL.createObjectURL(file[0]);
    setLocalPreviewUrl(localUrl);
    setImage(file[0]);
    setImagePath(newFileName);
  };

  // 저장 핸들러
  const handleSave = async () => {
    if (!name || !buyPrice || !sellPrice || !categoryId || !brandId) {
      alert("필수 정보를 모두 입력해주세요.");
      return;
    }

    try {
      setIsUploading(true);

      // 이미지가 있으면 Supabase Storage에 업로드
      let finalImageUrl = "";
      if (image && imagePath) {
        const { data, error } = await supabase.storage.from("image").upload(imagePath, image, {
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

      // 제품 등록
      await registerProduct({
        name,
        category_id: categoryId,
        brand_id: brandId,
        weight,
        buy_price: Number(buyPrice),
        sell_price: Number(sellPrice),
        unit_label: "g",
        sku,
        image_url: finalImageUrl,
        quantity: +initQuantity || 0,
        warehouse_id: initLocation, // initLocation은 위치 ID를 의미
      });

      closeMainDrawer();
      router.push("/products");
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

  return (
    <div className="flex relative flex-col h-full">
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
              onChange={(e) => setName(e.target.value)}
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
                setBuyPrice(val);
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
                setSellPrice(val);
              }}
              placeholder="판매가 입력"
              type="number"
              inputMode="numeric"
              pattern="[0-9]*"
              className="flex-1 p-2 text-base rounded border focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
          <div className="flex gap-2 items-center py-2 w-full">
            <h3 className="w-20 font-medium">초기수량</h3>
            <input
              value={initQuantity}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, "");
                setInitQuantity(val);
              }}
              placeholder="초기 수량 입력"
              type="number"
              inputMode="numeric"
              pattern="[0-9]*"
              className="flex-1 p-2 text-base rounded border focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
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
            onClick={() => setActiveDrawer("weight")}
            variant="ghost"
            className="flex justify-between items-center py-2 w-full"
            size="none"
          >
            <div className="flex justify-between w-full">
              <h3 className="font-medium">중량</h3>
              <p className="text-sm text-gray-500">{weight ? `${weight}g` : "중량 선택"}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Button>
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
        </div>
      </div>
      {/* 하단 버튼 */}
      <div className="p-4 pb-8 border-t">
        <Button
          className="w-full h-12 text-lg font-semibold text-white bg-orange-500 hover:bg-orange-600"
          onClick={handleSave}
          disabled={isUploading}
        >
          {isUploading ? "저장 중..." : "저장"}
        </Button>
      </div>

      {/* DrawerView: 상세 입력 화면 */}
      <DrawerView isVisible={activeDrawer === "name"} scrollRef={scrollRef}>
        <CommonInputView
          title="제품명 입력"
          value={name}
          onChange={(e) => setName(e.target.value)}
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
            setCategoryId(item.id);
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
            setBrandId(item.id);
            closeDrawer();
          }}
          onAdd={addBrand}
          onEdit={editBrand}
          onDelete={deleteBrand}
        />
      </DrawerView>
      <DrawerView isVisible={activeDrawer === "initLocation"} scrollRef={scrollRef}>
        <ManageView<Warehouse>
          title="위치 선택"
          items={locations}
          onBack={closeDrawer}
          onSelect={(item) => {
            setInitLocation(item.id);
            closeDrawer();
          }}
          onAdd={addLocation}
          onEdit={editLocation}
          onDelete={deleteLocation}
        />
      </DrawerView>

      <DrawerView isVisible={activeDrawer === "weight"} scrollRef={scrollRef}>
        <div className="flex flex-col h-full bg-white">
          <div className="flex items-center px-4 py-3 border-b">
            <Button variant="ghost" size="icon" onClick={closeDrawer}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h2 className="ml-2 text-lg font-semibold">옵션 추가</h2>
          </div>
          <div className="flex flex-col flex-1 gap-4 justify-center px-6">
            <select
              value={weight}
              onChange={(e) => {
                setWeight(Number(e.target.value));
                closeDrawer();
              }}
              className="p-3 w-full text-lg rounded border focus:outline-none focus:ring-2 focus:ring-orange-400"
            >
              {WEIGHT_OPTIONS.map((w) => (
                <option key={w} value={w}>
                  {w}g
                </option>
              ))}
            </select>
          </div>
        </div>
      </DrawerView>
    </div>
  );
}

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
