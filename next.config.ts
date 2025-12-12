import withPWAInit from "@ducanh2912/next-pwa";
import bundleAnalyzer from "@next/bundle-analyzer";
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

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = withBundleAnalyzer(
  withPWA({
    reactStrictMode: true,
    images: {
      domains: ["i.pravatar.cc", "kqkvgqbdgkgbhjcuwxei.supabase.co"],
      formats: ["image/avif", "image/webp"],
      minimumCacheTTL: 60,
    },
    // 번들 최적화 (Next.js 15에서는 swcMinify가 기본값)
    compiler: {
      removeConsole: process.env.NODE_ENV === "production",
    },
  })
);

export default nextConfig;
