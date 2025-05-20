"use client";

import { useState, useEffect, RefObject } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronRight } from "lucide-react";
import DrawerView from "@/components/ui/drawer-view";
import { useLocations } from "@/hooks/useLocations";
import ManageView from "../receipts/ManageView";

const WEIGHT_OPTIONS = [350, 360, 400, 1000, 1400, 2400, 4000, 4200, 4300];

interface ProductCreateFormProps {
  scrollRef?: RefObject<HTMLDivElement | null>;
}

export default function ProductCreateForm({ scrollRef }: ProductCreateFormProps) {
  // 상태
  const [image, setImage] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [barcode, setBarcode] = useState("");
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [buyPrice, setBuyPrice] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [initQuantity, setInitQuantity] = useState("");
  const [initLocation, setInitLocation] = useState("");
  const [weight, setWeight] = useState(WEIGHT_OPTIONS[0]);
  const { locations } = useLocations();
  const [activeDrawer, setActiveDrawer] = useState<null | string>(null);
  const [sku, setSKU] = useState("");

  // 브랜드/카테고리 상태
  const [brands, setBrands] = useState<{ id: string; name: string }[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  // 옵션 중량 변경 시 SKU 자동 생성
  useEffect(() => {
    if (name && weight) {
      setSKU(generateSKU(name, weight));
    }
  }, [name, weight]);

  // 이미지 업로드 핸들러
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImage(e.target.files[0]);
    }
  };

  // 저장 핸들러(임시)
  const handleSave = () => {
    alert("저장되었습니다!");
  };

  // DrawerView 닫기
  const closeDrawer = () => setActiveDrawer(null);

  // brands/cats add/edit/delete
  const addBrand = (name: string) => setBrands((b) => [...b, { id: Date.now() + Math.random() + "", name }]);
  const editBrand = (id: string, name: string) => setBrands((b) => b.map((x) => (x.id === id ? { ...x, name } : x)));
  const delBrand = (id: string) => setBrands((b) => b.filter((x) => x.id !== id));
  const addCat = (name: string) => setCategories((c) => [...c, { id: Date.now() + Math.random() + "", name }]);
  const editCat = (id: string, name: string) => setCategories((c) => c.map((x) => (x.id === id ? { ...x, name } : x)));
  const delCat = (id: string) => setCategories((c) => c.filter((x) => x.id !== id));

  return (
    <div className="relative flex flex-col h-full">
      {/* 제품 이미지 */}
      <div className="flex flex-col items-center pt-6 pb-2">
        <label className="relative flex items-center justify-center w-24 h-24 overflow-hidden bg-gray-100 rounded-md cursor-pointer">
          {image ? (
            <img src={URL.createObjectURL(image)} alt="제품 이미지" className="object-cover w-full h-full" />
          ) : (
            <span className="text-sm text-center text-gray-400">
              사진
              <br />
              추가
            </span>
          )}
          <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImageChange} />
        </label>
      </div>
      {/* 제품 등록 정보 */}
      <div className="flex-1 p-4">
        <div className="space-y-2">
          <div className="flex items-center w-full gap-2 py-2">
            <h3 className="font-medium">SKU:</h3>
            <p className="text-sm text-gray-400">{sku ? sku : "-"}</p>
          </div>
          <div className="flex items-center w-full gap-2 py-2">
            <h3 className="w-20 font-medium">제품명</h3>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="제품명 입력"
              className="flex-1 p-2 text-base border rounded focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
          <div className="flex items-center w-full gap-2 py-2">
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
              className="flex-1 p-2 text-base border rounded focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
          <div className="flex items-center w-full gap-2 py-2">
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
              className="flex-1 p-2 text-base border rounded focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
          <div className="flex items-center w-full gap-2 py-2">
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
              className="flex-1 p-2 text-base border rounded focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
          <Button
            onClick={() => setActiveDrawer("category")}
            variant="ghost"
            className="flex items-center justify-between w-full py-2"
            size="none"
          >
            <div className="flex justify-between w-full">
              <h3 className="font-medium">카테고리</h3>
              <p className="text-sm text-gray-500">{categories.find((c) => c.id === category)?.name || "카테고리 선택"}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Button>
          <Button
            onClick={() => setActiveDrawer("brand")}
            variant="ghost"
            className="flex items-center justify-between w-full py-2"
            size="none"
          >
            <div className="flex justify-between w-full">
              <h3 className="font-medium">브랜드</h3>
              <p className="text-sm text-gray-500">{brands.find((b) => b.id === brand)?.name || "브랜드 선택"}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Button>
          <Button
            onClick={() => setActiveDrawer("weight")}
            variant="ghost"
            className="flex items-center justify-between w-full py-2"
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
            className="flex items-center justify-between w-full py-2"
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
            setCategory(item.id);
            closeDrawer();
          }}
          onAdd={addCat}
          onEdit={editCat}
          onDelete={delCat}
        />
      </DrawerView>
      <DrawerView isVisible={activeDrawer === "brand"} scrollRef={scrollRef}>
        <ManageView
          title="브랜드 선택"
          items={brands}
          onBack={closeDrawer}
          onSelect={(item) => {
            setBrand(item.id);
            closeDrawer();
          }}
          onAdd={addBrand}
          onEdit={editBrand}
          onDelete={delBrand}
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
          onAdd={() => {}}
          onEdit={() => {}}
          onDelete={() => {}}
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
          <div className="flex flex-col justify-center flex-1 gap-4 px-6">
            <select
              value={weight}
              onChange={(e) => setWeight(Number(e.target.value))}
              className="w-full p-3 text-lg border rounded focus:outline-none focus:ring-2 focus:ring-orange-400"
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
      <div className="flex flex-col justify-center flex-1 px-6">
        <input
          value={value}
          onChange={(e) => onChange(e)}
          placeholder={placeholder}
          className="w-full p-3 text-lg border rounded focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
        <Button className="mt-6 text-white bg-orange-500 hover:bg-orange-600" onClick={onClose}>
          완료
        </Button>
      </div>
    </div>
  );
};

// SKU 생성 함수
function generateSKU(productName: string, weight: number) {
  // 한글 초성 추출(예: 김치왕 → KMW)
  const initials = productName
    .split("")
    .map((char) => {
      const code = char.charCodeAt(0) - 44032;
      if (code >= 0 && code <= 11171) {
        const cho = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
        return cho[Math.floor(code / 588)];
      }
      return char[0].toUpperCase();
    })
    .join("")
    .replace(/[^A-Z0-9]/gi, "");
  return `${initials}-${weight}`;
}
