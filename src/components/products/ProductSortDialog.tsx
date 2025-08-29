"use client";

import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { useProductSortStore, SortOption } from "@/store/productSortStore";

interface ProductSortDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const sortOptions = [
  { option: "name-asc" as SortOption, label: "이름 오름차순" },
  { option: "name-desc" as SortOption, label: "이름 내림차순" },
  { option: "quantity-desc" as SortOption, label: "재고 많은순" },
  { option: "quantity-asc" as SortOption, label: "재고 적은순" },
];

export default function ProductSortDialog({ isOpen, onClose }: ProductSortDialogProps) {
  const { sortOption, setSort } = useProductSortStore();

  const handleSortSelect = (option: SortOption) => {
    setSort(option);
    onClose();
  };

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="h-[50vh] flex flex-col" role="dialog" aria-modal="true">
        <DrawerHeader className="flex-shrink-0 py-0">
          <div className="flex justify-end">
            <Button variant="ghost" size="icon" className="flex justify-end w-8 h-8" onClick={onClose} aria-label="닫기">
              <X className="size-7" />
            </Button>
          </div>

          <div className="flex justify-between items-center py-2 border-b-2 border-blue-400">
            <div>
              <DrawerTitle className="text-lg font-medium text-blue-400">정렬하기</DrawerTitle>
            </div>
          </div>
        </DrawerHeader>

        <div className="overflow-y-auto flex-1 p-4">
          <div className="space-y-2">
            {sortOptions.map((item) => (
              <Button
                key={item.option}
                variant="ghost"
                className="flex justify-between items-center p-4 w-full h-auto text-left"
                onClick={() => handleSortSelect(item.option)}
              >
                <span className={sortOption === item.option ? "font-bold text-blue-600" : "text-gray-700"}>{item.label}</span>
                {sortOption === item.option && <Check className="w-5 h-5 text-blue-500" />}
              </Button>
            ))}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
