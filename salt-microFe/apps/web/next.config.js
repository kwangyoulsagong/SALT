/* eslint-disable @typescript-eslint/no-require-imports */
const { createVanillaExtractPlugin } = require("@vanilla-extract/next-plugin");

const withVanillaExtract = createVanillaExtractPlugin();

const { zoneRewrites } = require("@repo/core/zones/node");

/**
 * 셸 zone (FE-REQ-007 FR-1 · FR-3 → FE-REQ-052 FR-3, ADR-005).
 *
 * - `assetPrefix` 를 갖지 않는다. 셸(default zone)이기 때문이다.
 * - 도메인 zone 4개로 가는 요청을 `rewrites` 로 프록시한다 — **레지스트리에서 생성**, 손으로 쓰지 않는다.
 *   경로는 `fallback`: 화면이 아직 셸에 있으면(옮기기 전) 셸이 받는다. origin 은 env `ZONE_<ID>_ORIGIN`.
 * - 운영 진입은 한 origin 경로 라우팅이 zone 에 직접 보낸다(`ADR-008`). 여기 rewrites 는 로컬 · 폴백.
 *
 * 규칙은 `.claude/rules/microfrontend.md`, 레지스트리는 `@repo/core/zones`(`registry.json`).
 */
/** 사용자 대면 도메인. 한 도메인이 여러 앱을 서비스하므로 Server Actions 에 명시가 필요하다 (FR-23). */
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
  transpilePackages: ["@repo/ui", "@repo/tokens", "@repo/core", "@repo/web-shared"],
  experimental: {
    serverActions: {
      allowedOrigins: APP_ORIGINS,
    },
  },
  async rewrites() {
    return zoneRewrites(process.env);
  },
};

module.exports = withVanillaExtract(nextConfig);
