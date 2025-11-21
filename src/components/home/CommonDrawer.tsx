"use client";

import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDrawerStore } from "@/store/drawerStore";
import ReceiptForm from "../receipts/ReceiptForm";
import ProductCreateForm from "../products/ProductCreateForm";
import { useRef } from "react";
import MoveForm from "../receipts/MoveForm";
import AdjustForm from "../receipts/AdjustForm";
import { useFormStateStore } from "@/store/formStateStore";

export default function CommonDrawer({ children }: { children?: React.ReactNode }) {
  const { isOpen, currentForm, closeDrawer } = useDrawerStore();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const resetProductForm = useFormStateStore((state) => state.resetProductForm);
  const resetReceiptForm = useFormStateStore((state) => state.resetReceiptForm);
  const resetMoveForm = useFormStateStore((state) => state.resetMoveForm);
  const resetAdjustForm = useFormStateStore((state) => state.resetAdjustForm);

  const getFormTitle = () => {
    switch (currentForm) {
      case "product":
        return "제품 등록";
      case "excel":
        return "엑셀 파일로 등록";
      case "receipt":
        return "입고하기";
      case "issue":
        return "출고하기";
      case "move":
        return "이동하기";
      case "adjust":
        return "조정하기";
      case "shortage":
        return "재고 부족 확인";
      case "inventory":
        return "재고 조사";
      case "history":
        return "과거 수량 조회";
      case "member":
        return "멤버 추가";

      default:
        return "";
    }
  };

  const getFormDescription = () => {
    switch (currentForm) {
      case "receipt":
        return "새로운 제품을 창고에 입고합니다.";
      case "issue":
        return "창고에서 제품을 출고합니다.";
      case "move":
        return "제품을 다른 위치로 이동합니다.";
      case "adjust":
        return "재고 수량을 조정합니다.";
      case "shortage":
        return "재고가 부족한 제품 목록을 확인합니다.";
      case "inventory":
        return "현재 재고 상태를 조사합니다.";
      case "history":
        return "제품의 과거 재고 수량을 조회합니다.";
      case "member":
        return "새로운 팀원을 추가합니다.";
      case "product":
        return "새로운 제품을 등록합니다.";
      case "excel":
        return "엑셀 파일을 업로드하여 여러 제품을 한 번에 등록합니다.";
      default:
        return "";
    }
  };

  const handleReset = () => {
    switch (currentForm) {
      case "product":
        resetProductForm();
        break;
      case "receipt":
        resetReceiptForm("in");
        break;
      case "issue":
        resetReceiptForm("out");
        break;
      case "move":
        resetMoveForm();
        break;
      case "adjust":
        resetAdjustForm();
        break;
      default:
        break;
    }
  };

  const shouldShowResetButton = () => {
    return ["product", "receipt", "issue", "move", "adjust"].includes(currentForm || "");
  };

  const renderForm = () => {
    switch (currentForm) {
      case "receipt":
        return <ReceiptForm mode="in" closeDrawer={closeDrawer} />;
      case "issue":
        return <ReceiptForm mode="out" closeDrawer={closeDrawer} />;
      case "move":
        return <MoveForm closeDrawer={closeDrawer} />;
      case "adjust":
        return <AdjustForm closeDrawer={closeDrawer} />;
      case "shortage":
        return <div>재고 부족 확인 폼</div>;
      case "inventory":
        return <div>재고 조사 폼</div>;
      case "history":
        return <div>과거 수량 조회 폼</div>;
      case "member":
        return <div>멤버 추가 폼</div>;
      case "product":
        return <ProductCreateForm scrollRef={scrollRef} closeDrawer={closeDrawer} />;
      case "excel":
        return <div>엑셀 파일 업로드 폼</div>;
      default:
        return null;
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && closeDrawer()}>
      <DrawerContent className="h-[90vh] flex flex-col max-w-3xl mx-auto" role="dialog" aria-modal="true">
        <DrawerHeader className="flex-shrink-0 py-0">
          <div className="flex items-center justify-between py-2">
            {shouldShowResetButton() ? (
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-gray-500" onClick={handleReset}>
                초기화
              </Button>
            ) : (
              <div />
            )}
            <Button variant="ghost" size="icon" className="w-8 h-8" onClick={closeDrawer} aria-label="닫기">
              <X className="size-7" />
            </Button>
          </div>

          <div
            className={`flex items-center py-2 border-b-2 ${
              currentForm === "receipt" ? "border-blue-400" : currentForm === "issue" ? "border-red-400" : "border-orange-400"
            }`}
          >
            <div>
              <DrawerTitle
                className={`text-lg font-medium ${
                  currentForm === "receipt" ? "text-blue-400" : currentForm === "issue" ? "text-red-400" : "text-orange-400"
                }`}
              >
                {getFormTitle()}
              </DrawerTitle>
              <DrawerDescription className="text-sm text-gray-500">{getFormDescription()}</DrawerDescription>
            </div>
          </div>
        </DrawerHeader>
        <div ref={scrollRef} className="overflow-y-auto flex-1">
          {children ? children : renderForm()}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
