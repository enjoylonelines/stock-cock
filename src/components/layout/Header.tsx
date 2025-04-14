"use client";

import { BellIcon } from "@heroicons/react/24/outline";

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-10">
      <div className="flex justify-between items-center px-4 h-14">
        <h1 className="text-lg font-bold text-gray-800">재고박스</h1>
        <button className="p-2 hover:bg-gray-100 rounded-full relative">
          <BellIcon className="w-6 h-6 text-gray-600" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
      </div>
    </header>
  );
}
