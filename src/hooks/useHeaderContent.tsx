"use client";

import { Button } from "@/components/ui/button";
import { useTransactionFilterDrawerStore } from "@/store/TransactionFilterDrawer";
import { useActivityLogStore } from "@/store/activityLogStore";
import { useProductFilterDrawerStore } from "@/store/productFilterDrawer";
import { ArrowDownUp, ArrowLeft, Bell, Filter, Settings } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type React from "react";

type UseHeaderContentReturn = {
  title: string;
  leftButton: React.ReactNode;
  rightButton: React.ReactNode;
  isSortDialogOpen: boolean;
  setIsSortDialogOpen: (open: boolean) => void;
};

// 알림 배지는 home 페이지에서만 필요하므로 동적 임포트로 지연 로딩
const NotificationBadge = dynamic(() => import("@/components/layout/NotificationBadge"), {
  ssr: false,
});

export function useHeaderContent(): UseHeaderContentReturn {
  const { isOpen, close, open } = useTransactionFilterDrawerStore();
  const {
    isOpen: isProductFilterOpen,
    close: closeProductFilter,
    open: openProductFilter,
  } = useProductFilterDrawerStore();
  const { open: openActivityLog } = useActivityLogStore();
  const pathname = usePathname();
  const [isSortDialogOpen, setIsSortDialogOpen] = useState(false);

  const handleTransactionFilterClick = () => {
    if (isOpen) {
      close();
    } else {
      open();
    }
  };

  const handleProductFilterClick = () => {
    if (isProductFilterOpen) {
      closeProductFilter();
    } else {
      openProductFilter();
    }
  };

  const handleSortClick = () => {
    setIsSortDialogOpen(true);
  };

  const handleBellClick = () => {
    openActivityLog();
  };

  const getHeaderContent = (): {
    title: string;
    leftButton: React.ReactNode;
    rightButton: React.ReactNode;
  } => {
    // 정규식 매칭을 먼저 확인
    if (pathname.match(/^\/transactions\/[\w-]+$/)) {
      return {
        title: "상세 내역",
        leftButton: (
          <Link href="/transactions">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
        ),
        rightButton: null,
      };
    }

    if (pathname.match(/^\/products\/[\w-]+$/)) {
      // 현재 탭 정보를 포함한 URL 생성
      const getBackUrl = () => {
        if (typeof window !== "undefined") {
          const urlParams = new URLSearchParams(window.location.search);
          const tab = urlParams.get("tab") || sessionStorage.getItem("products_selected_tab") || "company";
          return `/products?tab=${tab}`;
        }
        return "/products";
      };

      return {
        title: "상품 상세",
        leftButton: (
          <Link href={getBackUrl()}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
        ),
        rightButton: null,
      };
    }

    switch (pathname) {
      case "/home":
        return {
          title: "한끼",
          leftButton: null,
          rightButton: (
            <Button variant="ghost" className="relative p-0 w-10 h-10" onClick={handleBellClick}>
              <Bell className="p-0 w-5 h-5" />
              {pathname === "/home" && <NotificationBadge />}
            </Button>
          ),
        };
      case "/products":
        return {
          title: "제품",
          leftButton: null,
          rightButton: (
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" className="w-10 h-10" onClick={handleProductFilterClick}>
                <Filter className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" className="w-10 h-10" onClick={handleSortClick}>
                <ArrowDownUp className="w-5 h-5" />
              </Button>
            </div>
          ),
        };
      case "/transactions":
        return {
          title: "입고/출고",
          leftButton: null,
          rightButton: (
            <Button variant="ghost" size="icon" className="w-10 h-10" onClick={handleTransactionFilterClick}>
              <Filter className="w-5 h-5" />
            </Button>
          ),
        };
      case "/settings":
        return {
          title: "설정",
          leftButton: null,
          rightButton: (
            <Button variant="ghost" size="icon" className="w-10 h-10">
              <Settings className="w-5 h-5" />
            </Button>
          ),
        };
      default:
        return {
          title: "",
          leftButton: null,
          rightButton: null,
        };
    }
  };

  const { title, leftButton, rightButton } = getHeaderContent();

  return {
    title,
    leftButton,
    rightButton,
    isSortDialogOpen,
    setIsSortDialogOpen,
  };
}
