"use client";

import { HomeIcon, CubeIcon, ArrowsRightLeftIcon, Cog6ToothIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname();

  const menus = [
    { name: "홈", icon: HomeIcon, href: "/" },
    { name: "제품", icon: CubeIcon, href: "/products" },
    { name: "입/출고", icon: ArrowsRightLeftIcon, href: "/inventory" },
    { name: "설정", icon: Cog6ToothIcon, href: "/settings" },
  ];

  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-10">
      <nav className="flex justify-around items-center h-16">
        {menus.map((menu) => {
          const Icon = menu.icon;
          const isActive = pathname === menu.href;

          return (
            <Link
              key={menu.href}
              href={menu.href}
              className={`flex flex-col items-center justify-center w-full h-full
                ${isActive ? "text-blue-500" : "text-gray-600"}
                hover:text-blue-500 transition-colors`}
            >
              <Icon className="w-6 h-6" />
              <span className="text-xs mt-1">{menu.name}</span>
            </Link>
          );
        })}
      </nav>
    </footer>
  );
}
