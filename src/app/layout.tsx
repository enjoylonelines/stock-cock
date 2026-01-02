import { Inter } from "next/font/google";
import "./globals.css";
import CommonDrawer from "@/components/home/CommonDrawer";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import { SWRProvider } from "@/components/providers/SWRProvider";
import { SessionRestore } from "@/components/providers/SessionRestore";
import PushPermissionPrompt from "@/components/setting/PushPermissionPrompt";
import { UserProvider } from "@/contexts/UserContext";
import { createClient } from "@/utils/supabase/server";
import type { Metadata } from "next";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "한끼재고",
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
        <link rel="apple-touch-icon" href="/icons/logo-192x192.png" />
      </head>

      <UserProvider user={profile}>
        <SWRProvider>
          <body className={`${inter.className} antialiased bg-slate-200`}>
            {/* iOS PWA 세션 복원 - localStorage의 세션을 서버 쿠키로 복원 */}
            <SessionRestore />
            <Header />
            <main className="pt-14 pb-20 min-h-screen">{children}</main>
            <Footer />
            {/* 초기 접속 시 푸시 권한 요청 팝업 */}
            {/* <PushPermissionPrompt /> */}
            {/* 전역 드로어 - 모든 페이지에서 사용 가능 */}
            <CommonDrawer />
          </body>
        </SWRProvider>
      </UserProvider>
    </html>
  );
}
