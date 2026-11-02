/* eslint-disable @typescript-eslint/no-require-imports */
const { ZONES } = require("@repo/core/zones/node");

/**
 * 금융 팁 zone — `web-tips` (FE-REQ-052 FR-7, ADR-005).
 *
 * 지금은 **빈 골격**이다 — 화면은 없고, 셸 rewrites(`fallback`)가 가리킬 수 있게만 서 있다.
 * 화면은 `@repo/domain-tips` 에 생기고 여기 `app/` 은 re-export 만 한다
 * (옮기는 REQ: 도메인 기능 REQ(F012~F014)).
 *
 * - `basePath` 없음 — 경로 prefix(`/tips`)는 라우트 폴더 이름이 정한다
 * - `assetPrefix` 는 레지스트리 값(`/tips-static`) — 셸 `_next` 와 겹치지 않게. 손으로 쓰지 않는다
 */
const zone = ZONES.tips;

const APP_ORIGINS = (process.env.APP_ALLOWED_ORIGINS || "localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

/** @type {import('next').NextConfig} */
const nextConfig = {
  assetPrefix: zone.assetPrefix,
  reactStrictMode: true,
  transpilePackages: ["@repo/core"],
  experimental: {
    serverActions: {
      allowedOrigins: APP_ORIGINS,
    },
  },
};

module.exports = nextConfig;
