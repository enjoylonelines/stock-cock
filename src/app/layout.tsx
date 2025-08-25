import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Metadata } from "next";
import { createClient } from "@/utils/supabase/server";
import { UserProvider } from "@/contexts/UserContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Stock Cock",
  description: "재고 관리 시스템",
  manifest: "/manifest.json",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user?.id).single();

  return (
    <html lang="ko" className="custom-scrollbar">
      <head>
        <meta name="theme-color" content="#ffffff" />
        <link rel="icon" href="/icons/logo.png" />
      </head>

      <UserProvider user={profile}>
        <body className={`${inter.className} antialiased bg-slate-200`}>
          <Header />
          <main className="pt-14 pb-16 min-h-screen">{children}</main>
          <Footer />
        </body>
      </UserProvider>
    </html>
  );
}
