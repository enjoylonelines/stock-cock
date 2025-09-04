import withPWAInit from "@ducanh2912/next-pwa";
import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const withPWA = withPWAInit({
  dest: "public",
  disable: isDev,
  register: !isDev,
  sw: "/sw.js",
  // 커스텀 워커는 기본값 디렉터리인 "worker/index.{js,ts}"를 사용
  customWorkerSrc: "worker",
});

const nextConfig: NextConfig = withPWA({
  reactStrictMode: true,
  images: {
    domains: ["i.pravatar.cc", "kqkvgqbdgkgbhjcuwxei.supabase.co"],
  },
});

export default nextConfig;
