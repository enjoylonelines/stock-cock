"use client";

import { ArrowsRightLeftIcon, Cog6ToothIcon, CubeIcon, HomeIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { usePathname } from "next/navigation";

const Footer = () => {
  const pathname = usePathname();

  const menus = [
    { name: "홈", icon: HomeIcon, href: "/home" },
    { name: "제품", icon: CubeIcon, href: "/products" },
    { name: "입/출고", icon: ArrowsRightLeftIcon, href: "/inventory" },
    { name: "설정", icon: Cog6ToothIcon, href: "/settings" },
  ];

  return (
    <footer className="fixed right-0 bottom-0 left-0 z-10 pb-4 bg-white border-t border-gray-200">
      <nav className="flex justify-center items-center mx-auto max-w-3xl h-16">
        {menus.map(menu => {
          const Icon = menu.icon;
          const isActive = pathname.includes(menu.href);

          return (
            <Link
              key={menu.href}
              href={menu.href}
              className={`flex flex-col items-center justify-center w-full h-full
                ${isActive ? "text-orange-500" : "text-gray-600"}
                hover:text-orange-500 transition-colors`}
            >
              <Icon className="w-6 h-6" />
              <span className="mt-1 text-xs">{menu.name}</span>
            </Link>
          );
        })}
      </nav>
    </footer>
  );
};

export default Footer;
