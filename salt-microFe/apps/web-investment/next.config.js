/* eslint-disable @typescript-eslint/no-require-imports */
const { createVanillaExtractPlugin } = require("@vanilla-extract/next-plugin");

const { ZONES } = require("@repo/core/zones/node");

const withVanillaExtract = createVanillaExtractPlugin();

/**
 * 투자 zone — `web-investment` (FE-REQ-052 FR-7 → FE-REQ-053, ADR-005).
 *
 * 화면은 `@repo/domain-invest` 에 있고 여기 `app/` 은 re-export 만 한다.
 *
 * - `basePath` 없음 — 경로 prefix(`/investments` · `/coach` · `/search`)는 라우트 폴더 이름이 정한다
 * - `assetPrefix` 는 레지스트리 값(`/investment-static`) — 셸 `_next` 와 겹치지 않게. 손으로 쓰지 않는다
 * - 패키지 코드의 레이어 alias(`@/entities` …)는 `tsconfig.json` `paths` 가 `packages/domain-invest/src` 로 푼다.
 *   셸은 같은 alias 를 자기 `src` 로 푼다 — 한 빌드에 두 패키지의 `@/` 가 섞이지 않는다(셸은 domain-* 를 import 하지 않는다)
 * - `NEXT_PUBLIC_ZONE_APP` — 같은 공용 코드(`ZoneLink` · `CrossZoneLink`)가 "여기서 다른 zone 인가"를 이 앱 기준으로 판정한다
 * - 이미지 · 정적 파일(`/narrow-screen/*` · 프로필)은 같은 origin 의 셸이 서비스한다(`/_next/image` 도 셸 경로)
 */
const zone = ZONES.invest;

const APP_ORIGINS = (process.env.APP_ALLOWED_ORIGINS || "localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

/** @type {import('next').NextConfig} */
const nextConfig = {
  assetPrefix: zone.assetPrefix,
  reactStrictMode: true,
  env: { NEXT_PUBLIC_ZONE_APP: zone.app },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "localhost" },
    ],
  },
  transpilePackages: ["@repo/core", "@repo/ui", "@repo/tokens", "@repo/web-shared", "@repo/domain-invest"],
  experimental: {
    serverActions: {
      allowedOrigins: APP_ORIGINS,
    },
  },
};

module.exports = withVanillaExtract(nextConfig);
