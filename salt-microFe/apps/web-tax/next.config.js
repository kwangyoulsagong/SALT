/* eslint-disable @typescript-eslint/no-require-imports */
const { createVanillaExtractPlugin } = require("@vanilla-extract/next-plugin");

const withVanillaExtract = createVanillaExtractPlugin();

/**
 * tax zone (FE-REQ-007 FR-2).
 *
 * default zone(`apps/web`)이 `/tax`, `/tax/:path+`, `/tax-static/:path+`를 여기로 프록시한다.
 * `assetPrefix` 덕분에 이 앱의 정적 자산이 `/tax-static/_next/...`로 나가고,
 * default zone의 `_next`와 충돌하지 않는다.
 *
 * 왜 별도 zone인가는 `.claude/rules/microfrontend.md` §1·§2에 있다. 요약: 릴리스 이유가
 * **법령 파라미터 변경**이라 나머지 화면과 배포 주기가 다르다.
 */
const APP_ORIGINS = (process.env.APP_ALLOWED_ORIGINS || "localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

/** @type {import('next').NextConfig} */
const nextConfig = {
  assetPrefix: "/tax-static",
  reactStrictMode: true,
  transpilePackages: ["@repo/ui", "@repo/tokens", "@repo/core"],
  experimental: {
    serverActions: {
      allowedOrigins: APP_ORIGINS,
    },
  },
};

module.exports = withVanillaExtract(nextConfig);
