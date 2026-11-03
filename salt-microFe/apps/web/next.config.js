/* eslint-disable @typescript-eslint/no-require-imports */
const { createVanillaExtractPlugin } = require("@vanilla-extract/next-plugin");
const { zoneNextConfig } = require("@repo/config-next");

const withVanillaExtract = createVanillaExtractPlugin();

/**
 * 셸 zone (FE-REQ-007 FR-1 · FR-3 → FE-REQ-052 FR-3 → FE-REQ-054 FR-5, ADR-005).
 *
 * 설정은 zone 공용 프리셋(`@repo/config-next`) 하나에서 온다 — 다섯 zone 이 같은 설정이어야 같은 의존이 같은 청크가 된다.
 * - `assetPrefix` 를 갖지 않는다. 셸(default zone)이기 때문이다
 * - 도메인 zone 4개로 가는 요청을 `rewrites` 로 프록시한다 — **레지스트리에서 생성**(`fallback`: 화면이 아직 셸에 있으면 셸이 받는다).
 *   origin 은 env `ZONE_<ID>_ORIGIN`. 운영 진입은 한 origin 경로 라우팅이 zone 에 직접 보낸다(`ADR-008`)
 *
 * 규칙은 `.claude/rules/microfrontend.md`, 레지스트리는 `@repo/core/zones`(`registry.json`).
 */
module.exports = withVanillaExtract(
  zoneNextConfig("shell", { transpilePackages: ["@repo/ui", "@repo/tokens", "@repo/web-shared"] })
);
