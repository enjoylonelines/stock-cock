import withPWAInit from "@ducanh2912/next-pwa";
import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const withPWA = withPWAInit({
  dest: "public",
  disable: isDev,
  register: !isDev,
  sw: "/sw.js",
});

const nextConfig: NextConfig = withPWA({
  reactStrictMode: true,
  images: {
    domains: ["i.pravatar.cc", "kqkvgqbdgkgbhjcuwxei.supabase.co"],
  },
});

export default nextConfig;
