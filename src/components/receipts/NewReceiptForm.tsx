"use client";

import { ChevronRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDrawerStore } from "@/store/drawerStore";

export default function NewReceiptForm() {
  const { receiptStep, setReceiptStep } = useDrawerStore();

  const renderStep = () => {
    switch (receiptStep) {
      case "main":
        return <MainStep />;
      case "location":
        return <LocationStep />;
      case "supplier":
        return <SupplierStep />;
      case "products":
        return <ProductsStep />;
      case "memo":
        return <MemoStep />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {receiptStep !== "main" && (
        <Button variant="ghost" className="mb-4" onClick={() => setReceiptStep("main")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          뒤로
        </Button>
      )}
      {renderStep()}
    </div>
  );
}

function MainStep() {
  const { setReceiptStep } = useDrawerStore();

  return (
    <>
      {/* 입고 정보 */}
      <div className="flex-1 p-4">
        <div className="space-y-2">
          <Button
            variant="ghost"
            className="flex items-center justify-between w-full py-2"
            size="none"
            onClick={() => setReceiptStep("location")}
          >
            <div className="flex justify-between w-full">
              <h3 className="font-medium">위치</h3>
              <p className="text-sm text-gray-500">기본 위치</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Button>

          <Button
            variant="ghost"
            className="flex items-center justify-between w-full py-2"
            size="none"
            onClick={() => setReceiptStep("supplier")}
          >
            <div className="flex justify-between w-full">
              <h3 className="font-medium">입고처</h3>
              <p className="text-sm text-gray-500">선택</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Button>

          <Button
            variant="ghost"
            className="flex items-center justify-between w-full py-2"
            size="none"
            onClick={() => setReceiptStep("products")}
          >
            <div className="flex justify-between w-full">
              <h3 className="font-medium">제품</h3>
              <p className="text-sm text-gray-500">0개 품목</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Button>

          <Button
            variant="ghost"
            className="flex items-center justify-between w-full py-2"
            size="none"
            onClick={() => setReceiptStep("memo")}
          >
            <div className="flex justify-between w-full">
              <h3 className="font-medium">메모</h3>
              <p className="text-sm text-gray-500">작성</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Button>
        </div>
      </div>

      {/* 하단 버튼 */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1">
            임시 저장
          </Button>
          <Button className="flex-1 text-gray-800 bg-orange-200">입고 완료</Button>
        </div>
      </div>
    </>
  );
}

function LocationStep() {
  return (
    <div className="p-4">
      <h3 className="mb-4 text-lg font-semibold">위치 선택</h3>
      {/* 위치 선택 UI */}
    </div>
  );
}

function SupplierStep() {
  return (
    <div className="p-4">
      <h3 className="mb-4 text-lg font-semibold">입고처 선택</h3>
      {/* 입고처 선택 UI */}
    </div>
  );
}

function ProductsStep() {
  return (
    <div className="p-4">
      <h3 className="mb-4 text-lg font-semibold">제품 선택</h3>
      {/* 제품 선택 UI */}
    </div>
  );
}

function MemoStep() {
  return (
    <div className="p-4">
      <h3 className="mb-4 text-lg font-semibold">메모 작성</h3>
      {/* 메모 작성 UI */}
    </div>
  );
}
