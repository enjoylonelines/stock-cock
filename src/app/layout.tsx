//"use client";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Metadata } from "next";

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
        <link rel="icon" href="/icons/logo.png" />
      </head>
      <body className={`${inter.className} antialiased bg-slate-200`}>
        <Header />
        <main className="pt-14 pb-16 min-h-screen">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
