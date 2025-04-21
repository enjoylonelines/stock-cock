"use client";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export default function SearchInput() {
  return (
    <div className="relative">
      <Search className="absolute w-4 h-4 text-orange-500 left-3 top-1/2 -translate-y-1/2" />
      <Input type="search" placeholder="제품 검색" className="pl-9 h-12 shadow-sm bg-slate-50" />
    </div>
  );
}
