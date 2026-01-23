"use client";

import { useInventoryFilterDrawerStore } from "@/store/InventoryFilterDrawer";
import { useProductFilterDrawerStore } from "@/store/productFilterDrawer";
import dynamic from "next/dynamic";

// 드로어 컴포넌트를 동적 임포트로 지연 로딩
const ActivityLogDrawer = dynamic(() => import("../home/ActivityLogDrawer"), {
  ssr: false,
});
const FilterDrawer = dynamic(() => import("../inventory/FilterDrawer"), {
  ssr: false,
});
const ProductFilterDrawer = dynamic(() => import("../products/ProductFilterDrawer"), {
  ssr: false,
});
const ProductSortDialog = dynamic(() => import("../products/ProductSortDialog"), {
  ssr: false,
});

interface HeaderDrawersProps {
  isSortDialogOpen: boolean;
  onSortDialogClose: () => void;
}

export default function HeaderDrawers({ isSortDialogOpen, onSortDialogClose }: HeaderDrawersProps) {
  const { isOpen, close, setFilters } = useInventoryFilterDrawerStore();
  const { isOpen: isProductFilterOpen, close: closeProductFilter, setFilters: setProductFilters } = useProductFilterDrawerStore();

  return (
    <>
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
      <ProductSortDialog isOpen={isSortDialogOpen} onClose={onSortDialogClose} />
      <ActivityLogDrawer />
    </>
  );
}
