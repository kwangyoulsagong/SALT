/* eslint-disable @typescript-eslint/no-require-imports */
const { createVanillaExtractPlugin } = require("@vanilla-extract/next-plugin");
const { zoneNextConfig } = require("@repo/config-next");

const withVanillaExtract = createVanillaExtractPlugin();

/**
 * 휴대폰 PWA zone — `web-mobile`(`/m/*`, `FE-REQ-071`, `ADR-012`). basePath 없음 — 라우트가 `app/m/**` 아래.
 *
 * `MOBILE_SW_VERSION` — 서비스 워커 판. 빌드(설정을 읽는) 시각이라 배포마다 바뀌고, 바뀌면 옛 캐시를 지운다(`FR-4`).
 */
const config = zoneNextConfig("mobile", {
  transpilePackages: ["@repo/ui", "@repo/tokens", "@repo/web-shared"],
});
config.env = { ...config.env, MOBILE_SW_VERSION: process.env.MOBILE_SW_VERSION || new Date().toISOString() };

module.exports = withVanillaExtract(config);
