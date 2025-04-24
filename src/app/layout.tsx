import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import CommonDrawer from "@/components/home/CommonDrawer";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Stock Cock",
  description: "재고 관리 시스템",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <meta name="theme-color" content="#ffffff" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body className={`${inter.className} antialiased bg-slate-200`}>
        <Header />
        <main className="min-h-screen pb-16 pt-14">{children}</main>
        <CommonDrawer />
        <Footer />
      </body>
    </html>
  );
}
