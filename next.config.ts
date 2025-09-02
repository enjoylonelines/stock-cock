import withPWAInit from "@ducanh2912/next-pwa";
import type { NextConfig } from "next";

const withPWA = withPWAInit({
  dest: "public",
  disable: true, // 일시적으로 PWA 비활성화
  register: false,
});

const nextConfig: NextConfig = withPWA({
  reactStrictMode: true,
  images: {
    domains: ["i.pravatar.cc", "kqkvgqbdgkgbhjcuwxei.supabase.co"],
  },
});

export default nextConfig;
