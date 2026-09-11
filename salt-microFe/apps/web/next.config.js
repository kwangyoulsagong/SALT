/* eslint-disable @typescript-eslint/no-require-imports */
const { createVanillaExtractPlugin } = require("@vanilla-extract/next-plugin");

const withVanillaExtract = createVanillaExtractPlugin();

/**
 * default zone (FE-REQ-007 FR-1 · FR-3).
 *
 * - `assetPrefix` 를 갖지 않는다. default zone 이기 때문이다.
 * - 세금 zone(`apps/web-tax`)으로 가는 요청을 `rewrites` 로 프록시한다.
 * - Next 15+ 이므로 정적 자산용 추가 rewrite 우회가 필요 없다 (FR-8).
 *
 * zone 목록의 근거는 `.claude/rules/microfrontend.md` §1, 레지스트리는 `@repo/core/zones`.
 */
const TAX_ZONE_ORIGIN = process.env.TAX_ZONE_ORIGIN || "http://localhost:3001";

/** 사용자 대면 도메인. 한 도메인이 두 앱을 서비스하므로 Server Actions 에 명시가 필요하다 (FR-23). */
const APP_ORIGINS = (process.env.APP_ALLOWED_ORIGINS || "localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**", // 모든 호스트를 허용
      },
      {
        protocol: "http",
        hostname: "localhost",
      },
    ],
  },
  reactStrictMode: true,
  transpilePackages: ["@repo/ui", "@repo/mocks", "@repo/tokens", "@repo/core"],
  experimental: {
    serverActions: {
      allowedOrigins: APP_ORIGINS,
    },
  },
  /**
   * `msw/browser` 는 `exports` 의 `node` 조건이 `null` 이다. App Router 에서는 클라이언트
   * 컴포넌트도 SSR 을 위해 **서버로 한 번 컴파일**되므로, 그 그래프에 남아 있으면
   * `Package path ./browser is not exported` 로 빌드·dev 가 함께 깨진다.
   *
   * `next/dynamic` 의 `ssr:false` 로는 막히지 않는다 — dev 서버는 여전히 모듈을 서버
   * 그래프에 넣는다. 그래서 **서버 컴파일에서만** 빈 모듈로 바꾼다. MSW 기동은
   * `useEffect` 안에서만 일어나므로 서버에서는 실행되지 않는다.
   *
   * > 이 `webpack` 훅 때문에 이 앱은 Turbopack(`next dev --turbopack`)을 쓰지 못한다.
   * > MSW 를 실제 BFF 호출로 바꾸는 F000(`FE-REQ-012`) 때 이 훅이 같이 사라진다.
   */
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        "msw/browser": false,
      };
    }
    return config;
  },
  async rewrites() {
    return [
      { source: "/tax", destination: `${TAX_ZONE_ORIGIN}/tax` },
      { source: "/tax/:path+", destination: `${TAX_ZONE_ORIGIN}/tax/:path+` },
      {
        source: "/tax-static/:path+",
        destination: `${TAX_ZONE_ORIGIN}/tax-static/:path+`,
      },
    ];
  },
};

module.exports = withVanillaExtract(nextConfig);
