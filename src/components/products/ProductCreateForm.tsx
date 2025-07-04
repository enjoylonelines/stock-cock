"use client";

import { useState, useEffect, RefObject } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronRight } from "lucide-react";
import DrawerView from "@/components/ui/drawer-view";
import { useLocations } from "@/hooks/useLocations";
import ManageView from "../receipts/ManageView";
import { uploadProductImage, getSignedUrl } from "@/lib/supabase/storage";
import { supabase } from "@/lib/supabase";
import { useCategories } from "@/hooks/useCategories";
import { useBrands } from "@/hooks/useBrands";
import { useRouter } from "next/navigation";

const WEIGHT_OPTIONS = [350, 360, 400, 1000, 1400, 2400, 4000, 4200, 4300];

interface ProductCreateFormProps {
  scrollRef?: RefObject<HTMLDivElement | null>;
}

export default function ProductCreateForm({ scrollRef }: ProductCreateFormProps) {
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
  const [signedUrl, setSignedUrl] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { locations, addLocation, editLocation, deleteLocation } = useLocations();
  const { categories, addCategory, editCategory, deleteCategory } = useCategories();
  const router = useRouter();

  // 옵션 중량 변경 시 SKU 자동 생성
  useEffect(() => {
    if (name && weight) {
      setSKU(generateSKU(name, weight));
    }
  }, [name, weight]);

  // 인증 상태 확인
  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };

    checkAuth();

    // 인증 상태 변경 구독
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 서명된 URL 갱신 함수
  const refreshSignedUrl = async (path: string) => {
    if (!isAuthenticated) return;

    try {
      const url = await getSignedUrl(path);
      setSignedUrl(url);
    } catch (error) {
      console.error("서명된 URL 생성 실패:", error);
      if (error instanceof Error && error.message === "인증이 필요합니다.") {
        alert("로그인이 필요합니다.");
      }
    }
  };

  // 이미지 업로드 핸들러
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAuthenticated) {
      alert("이미지를 업로드하려면 로그인이 필요합니다.");
      return;
    }

    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImage(file);

      try {
        setIsUploading(true);
        const path = await uploadProductImage(file);
        setImagePath(path);
        await refreshSignedUrl(path);
      } catch (error) {
        console.error("이미지 업로드 실패:", error);
        if (error instanceof Error && error.message === "인증이 필요합니다.") {
          alert("로그인이 필요합니다.");
        } else {
          alert("이미지 업로드에 실패했습니다.");
        }
      } finally {
        setIsUploading(false);
      }
    }
  };

  // 서명된 URL 주기적 갱신
  useEffect(() => {
    if (imagePath) {
      // 1시간마다 URL 갱신
      const interval = setInterval(() => {
        refreshSignedUrl(imagePath);
      }, 55 * 60 * 1000); // 55분마다 갱신 (1시간 유효기간 대비 여유있게)

      return () => clearInterval(interval);
    }
  }, [imagePath]);

  // 저장 핸들러
  const handleSave = async () => {
    if (!name || !buyPrice || !sellPrice || !categoryId || !brandId) {
      alert("필수 정보를 모두 입력해주세요.");
      return;
    }

    try {
      // 1. 제품명으로 products 테이블 조회
      const { data: existingProduct } = await supabase.from("products").select("*").eq("name", name).single();

      let productId: string;

      if (existingProduct) {
        // 이미 제품이 있으면 그 id 사용
        productId = existingProduct.id;
      } else {
        // 없으면 새로 생성
        const { data: productData, error: productError } = await supabase
          .from("products")
          .insert([
            {
              name,
              category: categoryId,
              brand: brandId,
              image_url: signedUrl,
            },
          ])
          .select()
          .single();
        if (productError) {
          alert("제품 저장 실패: " + productError.message);
          return;
        }
        productId = productData.id;
      }

      // 2. product_options에 옵션 추가
      const { data: optionData, error: productOptionError } = await supabase
        .from("product_options")
        .insert([
          {
            product_id: productId,
            sell_price: Number(sellPrice),
            buy_price: Number(buyPrice),
            weight: weight,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            sku: sku,
          },
        ])
        .select()
        .single();

      if (productOptionError) {
        alert("제품 옵션 저장 실패: " + productOptionError.message);
        return;
      }

      // 3. inventory에 초기 재고 저장
      if (initQuantity && initLocation) {
        const { error: inventoryError } = await supabase.from("inventory").insert([
          {
            option_id: optionData.id,
            location_id: initLocation,
            quantity: Number(initQuantity),
          },
        ]);
        if (inventoryError) {
          alert("재고 저장 실패: " + inventoryError.message);
          return;
        }
      }

      // 필요하다면 폼 초기화 또는 페이지 이동
      alert("저장되었습니다!");
      router.push("/products");
    } catch (error) {
      console.error("저장 중 오류:", error);
      alert("저장 중 오류가 발생했습니다.");
    }
  };

  // DrawerView 닫기
  const closeDrawer = () => setActiveDrawer(null);

  return (
    <div className="flex relative flex-col h-full">
      {/* 제품 이미지 */}
      <div className="flex flex-col items-center pt-6 pb-2">
        <label className="flex overflow-hidden relative justify-center items-center w-24 h-24 bg-gray-100 rounded-md cursor-pointer">
          {image ? (
            <img src={signedUrl || URL.createObjectURL(image)} alt="제품 이미지" className="object-cover w-full h-full" />
          ) : (
            <span className="text-sm text-center text-gray-400">
              {isAuthenticated ? (
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
            disabled={isUploading || !isAuthenticated}
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
        <Button className="w-full h-12 text-lg font-semibold text-white bg-orange-500 hover:bg-orange-600" onClick={handleSave}>
          저장
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
      <DrawerView isVisible={activeDrawer === "barcode"} scrollRef={scrollRef}>
        <CommonInputView
          title="바코드 입력"
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          placeholder="바코드 입력"
          onClose={closeDrawer}
        />
      </DrawerView>

      <DrawerView isVisible={activeDrawer === "category"} scrollRef={scrollRef}>
        <ManageView
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
        <ManageView
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
        <ManageView
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

// SKU 생성 함수
function getInitials(str: string) {
  const CHO = [
    "G",
    "GG",
    "N",
    "D",
    "DD",
    "R",
    "M",
    "B",
    "BB",
    "S",
    "SS",
    "NG",
    "J",
    "JJ",
    "CH",
    "K",
    "T",
    "P",
    "H",
    "W",
    "WW",
    "A",
    "E",
    "I",
    "O",
    "U",
    "Y",
    "K",
    "M",
    "P",
    "S",
    "T",
    "W",
    "Y",
  ];
  let result = "";
  for (const char of str) {
    const code = char.charCodeAt(0) - 44032;
    if (code >= 0 && code <= 11171) {
      result += CHO[Math.floor(code / 588)];
    } else if (/[a-zA-Z0-9]/.test(char)) {
      result += char.toUpperCase();
    }
    // 기타 문자는 무시
  }
  return result;
}

function generateSKU(productName: string, weight: number) {
  const initials = getInitials(productName);
  return `${initials}-${weight}`;
}
