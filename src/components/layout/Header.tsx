"use client";

import { usePathname, useRouter } from "next/navigation";
import { ArrowDownUp, Settings, Filter, Bell, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import FilterDrawer from "../inventory/FilterDrawer";
import ProductFilterDrawer from "../products/ProductFilterDrawer";
import ProductSortDialog from "../products/ProductSortDialog";
import ActivityLogDrawer from "../home/ActivityLogDrawer";
import { useInventoryFilterDrawerStore } from "@/store/InventoryFilterDrawer";
import { useProductFilterDrawerStore } from "@/store/productFilterDrawer";
import { useActivityLogStore } from "@/store/activityLogStore";
import { useBroadcastReadStatus } from "@/hooks/useBroadcastReadStatus";
import { useInventoryHistory } from "@/hooks/useInventoryHistory";
import { useState } from "react";
import Link from "next/link";

export default function Header() {
  const { isOpen, close, open, setFilters } = useInventoryFilterDrawerStore();
  const {
    isOpen: isProductFilterOpen,
    close: closeProductFilter,
    open: openProductFilter,
    setFilters: setProductFilters,
  } = useProductFilterDrawerStore();
  const { open: openActivityLog } = useActivityLogStore();
  const { getUnreadCount } = useBroadcastReadStatus();
  const { transactions } = useInventoryHistory();

  // 읽지 않은 알람 개수 계산
  const unreadCount = getUnreadCount(transactions);
  const [isSortDialogOpen, setIsSortDialogOpen] = useState(false);
  const pathname = usePathname();

  const handleInventoryFilterClick = () => {
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
  const getHeaderContent = () => {
    switch (pathname) {
      case "/home":
        return {
          title: "한끼",
          leftButton: null,
          rightButton: (
            <Button variant="ghost" className="relative p-0 w-10 h-10" onClick={handleBellClick}>
              <Bell className="p-0 w-5 h-5" />
              {unreadCount > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />}
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
      case "/inventory":
        return {
          title: "입고/출고",
          leftButton: null,
          rightButton: (
            <Button variant="ghost" size="icon" className="w-10 h-10" onClick={handleInventoryFilterClick}>
              <Filter className="w-5 h-5" />
            </Button>
          ),
        };
      case pathname.match(/^\/inventory\/[\w-]+$/) ? pathname : null:
        return {
          title: "상세 내역",
          leftButton: (
            <Link href="/inventory">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
          ),
          rightButton: null,
        };
      case pathname.match(/^\/products\/[\w-]+$/) ? pathname : null:
        return {
          title: "상품 상세",
          leftButton: (
            <Link href="/products">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
          ),
          rightButton: null,
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

  if (!title) return null;

  return (
    <header className="fixed top-0 right-0 left-0 z-50 bg-white border-b">
      <div className="container mx-auto max-w-3xl">
        <div className="flex justify-between items-center px-4 h-14">
          <div className="flex gap-2 items-center">
            {leftButton}
            <h1 className={`text-lg font-bold`}>{title}</h1>
          </div>
          {rightButton}
        </div>
      </div>
      <FilterDrawer
        isOpen={isOpen}
        onClose={close}
        onApplyFilter={setFilters}
        initialFilters={useInventoryFilterDrawerStore.getState().filters}
      />
      <ProductFilterDrawer
        isOpen={isProductFilterOpen}
        onClose={closeProductFilter}
        onApplyFilter={setProductFilters}
        initialFilters={useProductFilterDrawerStore.getState().filters}
      />
      <ProductSortDialog isOpen={isSortDialogOpen} onClose={() => setIsSortDialogOpen(false)} />
      <ActivityLogDrawer />
    </header>
  );
}
