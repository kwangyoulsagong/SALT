/* eslint-disable @typescript-eslint/no-require-imports */
const { zoneNextConfig } = require("@repo/config-next");

/**
 * 금융 팁 zone — `web-tips` (FE-REQ-052 FR-7 → FE-REQ-054 FR-5, ADR-005).
 *
 * 지금은 **빈 골격**이다 — 화면은 없고, 셸 rewrites(`fallback`)가 가리킬 수 있게만 서 있다.
 * 화면은 `@repo/domain-tips` 에 생기고 여기 `app/` 은 re-export 만 한다(화면 REQ: FE-REQ-058). 그때 vanilla-extract 로 감싼다.
 *
 * 설정은 zone 공용 프리셋(`@repo/config-next`) — `basePath` 없음(경로 prefix `/tips` 는 라우트 폴더 이름),
 * `assetPrefix` 는 레지스트리 값.
 */
module.exports = zoneNextConfig("tips");
