"use client";

import { usePathname } from "next/navigation";
import { ArrowDownUp, Settings, Filter, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Header() {
  const pathname = usePathname();

  const getHeaderContent = () => {
    switch (pathname) {
      case "/home":
        return {
          title: "한끼",

          rightButton: (
            <Button variant="ghost" className="relative w-10 h-10 p-0">
              <Bell className="w-5 h-5 p-0" />
              <span className="absolute w-2 h-2 bg-red-500 rounded-full top-1 right-1" />
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
            <Button variant="ghost" size="icon" className="w-10 h-10">
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
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b">
      <div className="container max-w-3xl mx-auto">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <h1 className={`text-lg font-bold`}>{title}</h1>
          </div>
          {rightButton}
        </div>
      </div>
    </header>
  );
}
