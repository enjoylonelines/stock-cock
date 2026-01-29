"use client";

import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useDrawerStore } from "@/store/drawerStore";
import { X } from "lucide-react";

import { useFormStateStore } from "@/store/formStateStore";
import dynamic from "next/dynamic";
import { Suspense, useEffect, useRef } from "react";

// 동적 임포트로 코드 스플리팅
const TransactionForm = dynamic(() => import("@/app/transactions/_components/TransactionForm"), {
  loading: () => <div className="p-4">로딩 중...</div>,
});
const ProductCreateForm = dynamic(() => import("@/components/products/ProductCreateForm"), {
  loading: () => <div className="p-4">로딩 중...</div>,
});
const MoveForm = dynamic(() => import("@/app/transactions/_components/MoveForm"), {
  loading: () => <div className="p-4">로딩 중...</div>,
});
const AdjustForm = dynamic(() => import("@/app/transactions/_components/AdjustForm"), {
  loading: () => <div className="p-4">로딩 중...</div>,
});

export default function CommonDrawer({ children }: { children?: React.ReactNode }) {
  const { isOpen, currentForm, closeDrawer } = useDrawerStore();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const resetProductForm = useFormStateStore(state => state.resetProductForm);
  const resetTransactionForm = useFormStateStore(state => state.resetTransactionForm);
  const resetMoveForm = useFormStateStore(state => state.resetMoveForm);
  const resetAdjustForm = useFormStateStore(state => state.resetAdjustForm);

  // 안드로이드에서 키보드가 닫힐 때 drawer 높이 복원
  useEffect(() => {
    if (!isOpen) return;

    const handleResize = () => {
      // 키보드가 닫힌 후 약간의 지연을 두고 높이 복원
      setTimeout(() => {
        const drawerContent = document.querySelector('[data-slot="drawer-content"]') as HTMLElement;
        if (drawerContent) {
          drawerContent.style.height = "90vh";
        }
      }, 150);
    };

    // visualViewport API 사용 (모바일 브라우저 지원)
    if (typeof window !== "undefined" && window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleResize);
      return () => {
        window.visualViewport?.removeEventListener("resize", handleResize);
      };
    }
    // visualViewport를 지원하지 않는 경우 일반 resize 이벤트 사용
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [isOpen]);

  const getFormTitle = () => {
    switch (currentForm) {
      case "product":
        return "제품 등록";
      case "product-edit":
        return "제품 수정";
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
      case "product-edit":
        return "제품 정보를 수정합니다.";
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
        resetTransactionForm("in");
        break;
      case "issue":
        resetTransactionForm("out");
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
        return (
          <Suspense fallback={<div className="p-4">로딩 중...</div>}>
            <TransactionForm mode="in" closeDrawer={closeDrawer} />
          </Suspense>
        );
      case "issue":
        return (
          <Suspense fallback={<div className="p-4">로딩 중...</div>}>
            <TransactionForm mode="out" closeDrawer={closeDrawer} />
          </Suspense>
        );
      case "move":
        return (
          <Suspense fallback={<div className="p-4">로딩 중...</div>}>
            <MoveForm closeDrawer={closeDrawer} />
          </Suspense>
        );
      case "adjust":
        return (
          <Suspense fallback={<div className="p-4">로딩 중...</div>}>
            <AdjustForm closeDrawer={closeDrawer} />
          </Suspense>
        );
      case "shortage":
        return <div>재고 부족 확인 폼</div>;
      case "inventory":
        return <div>재고 조사 폼</div>;
      case "history":
        return <div>과거 수량 조회 폼</div>;
      case "member":
        return <div>멤버 추가 폼</div>;
      case "product":
        return (
          <Suspense fallback={<div className="p-4">로딩 중...</div>}>
            <ProductCreateForm scrollRef={scrollRef} closeDrawer={closeDrawer} mode="create" />
          </Suspense>
        );
      case "product-edit":
        return (
          <Suspense fallback={<div className="p-4">로딩 중...</div>}>
            <ProductCreateForm scrollRef={scrollRef} closeDrawer={closeDrawer} mode="edit" />
          </Suspense>
        );
      case "excel":
        return <div>엑셀 파일 업로드 폼</div>;
      default:
        return null;
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={open => !open && closeDrawer()}>
      <DrawerContent className="h-[90vh] flex flex-col max-w-3xl mx-auto" role="dialog" aria-modal="true">
        <DrawerHeader className="flex-shrink-0 py-0">
          <div className="flex justify-between items-center py-2">
            {shouldShowResetButton() ? (
              <Button variant="ghost" size="sm" className="px-2 h-7 text-xs text-gray-500" onClick={handleReset}>
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
              currentForm === "receipt"
                ? "border-blue-400"
                : currentForm === "issue"
                  ? "border-red-400"
                  : "border-orange-400"
            }`}
          >
            <div>
              <DrawerTitle
                className={`text-lg font-medium ${
                  currentForm === "receipt"
                    ? "text-blue-400"
                    : currentForm === "issue"
                      ? "text-red-400"
                      : "text-orange-400"
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
