"use strict";

const layers = require("./rules/layers");
const noRenderRead = require("./rules/no-render-read");
const noClientEnumExport = require("./rules/no-client-enum-export");

/**
 * FSD 레이어 경계를 강제하는 ESLint 플러그인 (`FE-REQ-009` FR-21).
 *
 * eslintrc(`.eslintrc.json`)에서 `"plugins": ["@repo/fsd"]` 로 쓴다.
 * CommonJS 인 이유는 eslintrc 모드가 ESM 플러그인을 로드하지 못하기 때문이다.
 *
 * 규칙 표는 `layer-rules.cjs` **한 곳**에 있고 `.claude/hooks/layer-check.mjs` 가
 * 같은 파일을 읽는다. 피드백 시점만 다르고 판정은 하나다.
 */
module.exports = {
  rules: {
    layers,
    // 렌더 중 토큰 · 시각 · 난수 · 저장소 읽기 금지 — 레이어 규칙은 아니지만 zone 앱 · 도메인 패키지 lint 가 모두 이 플러그인을 싣는다(`DEV-001`)
    "no-render-read": noRenderRead,
    // "use client" 파일의 enum 은 서버 컴포넌트에서 undefined — 실화면에서만 보였다(`FE-REQ-058`, 2026-11-05)
    "no-client-enum-export": noClientEnumExport,
  },
};
