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
      remotePatterns: [
        {
          protocol: "https",
          hostname: "i.pravatar.cc",
        },
        {
          protocol: "https",
          hostname: "kqkvgqbdgkgbhjcuwxei.supabase.co",
        },
      ],
      formats: ["image/avif", "image/webp"],
      minimumCacheTTL: 60,
      // 이미지 최적화 강화
      deviceSizes: [640, 750, 828, 1080, 1200],
      imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    },
    // 번들 최적화 (Next.js 15에서는 swcMinify가 기본값)
    compiler: {
      removeConsole: process.env.NODE_ENV === "production",
    },
    // 성능 최적화
    experimental: {
      optimizePackageImports: ["lucide-react", "@radix-ui/react-icons"],
    },
    // 압축 최적화
    compress: true,
    // 프로덕션 최적화
    poweredByHeader: false,
    // Next.js 16: 개발 서버는 Turbopack 사용, 프로덕션 빌드는 webpack 사용 (PWA 플러그인 호환)
    // 개발 서버에서 Turbopack 사용 시 더 빠른 HMR 제공
  })
);

export default nextConfig;
