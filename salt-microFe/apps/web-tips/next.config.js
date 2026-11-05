/* eslint-disable @typescript-eslint/no-require-imports */
const { createVanillaExtractPlugin } = require("@vanilla-extract/next-plugin");
const { zoneNextConfig } = require("@repo/config-next");

const withVanillaExtract = createVanillaExtractPlugin();

/**
 * 금융 팁 zone — `web-tips` (FE-REQ-052 FR-7 → FE-REQ-054 FR-5 → FE-REQ-058, ADR-005).
 *
 * 화면은 `@repo/domain-tips` 에 있고 여기 `app/` 은 re-export 만 한다. 설정은 zone 공용 프리셋(`@repo/config-next`) — 가계부 zone 과 같은 꼴.
 * 패키지 코드의 레이어 alias(`@/entities` …)는 `tsconfig.json` `paths` 가 `packages/domain-tips/src` 로 푼다.
 */
module.exports = withVanillaExtract(
  zoneNextConfig("tips", {
    transpilePackages: ["@repo/ui", "@repo/tokens", "@repo/web-shared", "@repo/domain-tips"],
  })
);
