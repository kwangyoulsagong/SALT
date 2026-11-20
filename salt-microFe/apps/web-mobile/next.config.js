/* eslint-disable @typescript-eslint/no-require-imports */
const { createVanillaExtractPlugin } = require("@vanilla-extract/next-plugin");
const { zoneNextConfig } = require("@repo/config-next");

const withVanillaExtract = createVanillaExtractPlugin();

/**
 * 휴대폰 PWA zone — `web-mobile`(`/m/*`, `FE-REQ-071`, `ADR-012`). basePath 없음 — 라우트가 `app/m/**` 아래.
 *
 * 화면은 도메인 패키지 셋의 `mobile` 진입점(`FE-REQ-072`). 패키지 안 레이어 alias(`@/entities` …)는 `tsconfig.json` `paths` 의
 * **폴백 배열**(저축 → 가계부 → 투자)로 푼다 — 레이어마다 슬라이스 이름이 패키지 사이에서 유일해야 한다(`@repo/core` `mobileAlias.test.ts`).
 *
 * `MOBILE_SW_VERSION` — 서비스 워커 판. 빌드(설정을 읽는) 시각이라 배포마다 바뀌고, 바뀌면 옛 캐시를 지운다(`FR-4`).
 */
const config = zoneNextConfig("mobile", {
  transpilePackages: ["@repo/ui", "@repo/tokens", "@repo/web-shared", "@repo/domain-savings", "@repo/domain-household", "@repo/domain-invest"],
});
config.env = { ...config.env, MOBILE_SW_VERSION: process.env.MOBILE_SW_VERSION || new Date().toISOString() };

module.exports = withVanillaExtract(config);
