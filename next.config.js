/** @type {import('next').NextConfig} */
const nextConfig = {
  // 정적 페이지 생성 시 ISR(Incremental Static Regeneration) 설정
  staticPageGenerationTimeout: 90,

  // 이미지 캐시 설정
  images: {
    minimumCacheTTL: 60, // 이미지 캐시 시간 (초)
  },

  // HTTP 캐시 헤더 설정
  async headers() {
    return [
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, must-revalidate",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
