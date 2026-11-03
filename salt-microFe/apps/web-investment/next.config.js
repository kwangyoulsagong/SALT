/* eslint-disable @typescript-eslint/no-require-imports */
const { createVanillaExtractPlugin } = require("@vanilla-extract/next-plugin");
const { zoneNextConfig } = require("@repo/config-next");

const withVanillaExtract = createVanillaExtractPlugin();

/**
 * 투자 zone — `web-investment` (FE-REQ-052 FR-7 → FE-REQ-053 → FE-REQ-054 FR-5, ADR-005).
 *
 * 화면은 `@repo/domain-invest` 에 있고 여기 `app/` 은 re-export 만 한다. 설정은 zone 공용 프리셋(`@repo/config-next`).
 *
 * - `basePath` 없음 — 경로 prefix(`/investments` · `/coach` · `/search`)는 라우트 폴더 이름이 정한다
 * - `assetPrefix` 는 레지스트리 값(`/investment-static`) — 셸 `_next` 와 겹치지 않게. 프리셋이 넣는다
 * - 패키지 코드의 레이어 alias(`@/entities` …)는 `tsconfig.json` `paths` 가 `packages/domain-invest/src` 로 푼다.
 *   셸은 같은 alias 를 자기 `src` 로 푼다 — 한 빌드에 두 패키지의 `@/` 가 섞이지 않는다(셸은 domain-* 를 import 하지 않는다)
 * - 이미지 · 정적 파일(`/narrow-screen/*` · 프로필)은 같은 origin 의 셸이 서비스한다(`/_next/image` 도 셸 경로)
 */
module.exports = withVanillaExtract(
  zoneNextConfig("invest", {
    transpilePackages: ["@repo/ui", "@repo/tokens", "@repo/web-shared", "@repo/domain-invest"],
  })
);
