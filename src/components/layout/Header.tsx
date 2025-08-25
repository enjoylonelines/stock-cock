"use client";

import { usePathname, useRouter } from "next/navigation";
import { ArrowDownUp, Settings, Filter, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import FilterDrawer from "../inventory/FilterDrawer";
import { useFilterDrawerStore } from "@/store/filterDrawer";

export default function Header() {
  const { isOpen, close, open, setFilters } = useFilterDrawerStore();
  const pathname = usePathname();

  const handleButtonClick = () => {
    if (isOpen) {
      close();
    } else {
      open();
    }
  };
  const getHeaderContent = () => {
    switch (pathname) {
      case "/home":
        return {
          title: "한끼",

          rightButton: (
            <Button variant="ghost" className="relative p-0 w-10 h-10">
              <Bell className="p-0 w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </Button>
          ),
        };
      case "/products":
        return {
          title: "제품",

          rightButton: (
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" className="w-10 h-10">
                <Filter className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" className="w-10 h-10">
                <ArrowDownUp className="w-5 h-5" />
              </Button>
            </div>
          ),
        };
      case "/inventory":
        return {
          title: "입고/출고",

          rightButton: (
            <Button variant="ghost" size="icon" className="w-10 h-10" onClick={() => handleButtonClick()}>
              <Filter className="w-5 h-5" />
            </Button>
          ),
        };
      case pathname.match(/^\/inventory\/[\w-]+$/) ? pathname : null:
        return {
          title: "상세 내역",
          rightButton: null,
        };
      case "/settings":
        return {
          title: "설정",

          rightButton: (
            <Button variant="ghost" size="icon" className="w-10 h-10">
              <Settings className="w-5 h-5" />
            </Button>
          ),
        };
      default:
        return {
          title: "",

          rightButton: null,
        };
    }
  };

  const { title, rightButton } = getHeaderContent();

  if (!title) return null;

  return (
    <header className="fixed top-0 right-0 left-0 z-50 bg-white border-b">
      <div className="container mx-auto max-w-3xl">
        <div className="flex justify-between items-center px-4 h-14">
          <div className="flex gap-2 items-center">
            <h1 className={`text-lg font-bold`}>{title}</h1>
          </div>
          {rightButton}
        </div>
      </div>
      <FilterDrawer isOpen={isOpen} onClose={close} onApplyFilter={setFilters} />
    </header>
  );
}
