"use client";

import { useHeaderContent } from "@/hooks/useHeaderContent";
import HeaderDrawers from "./HeaderDrawers";

export default function Header() {
  const { title, leftButton, rightButton, isSortDialogOpen, setIsSortDialogOpen } = useHeaderContent();

  if (!title) return null;

  return (
    <header className="fixed top-0 right-0 left-0 z-50 bg-white border-b">
      <div className="container mx-auto max-w-3xl">
        <div className="flex justify-between items-center px-4 h-14">
          <div className="flex gap-2 items-center">
            {leftButton}
            <h1 className={"text-lg font-bold"}>{title}</h1>
          </div>
          {rightButton}
        </div>
      </div>
      <HeaderDrawers isSortDialogOpen={isSortDialogOpen} onSortDialogClose={() => setIsSortDialogOpen(false)} />
    </header>
  );
}
