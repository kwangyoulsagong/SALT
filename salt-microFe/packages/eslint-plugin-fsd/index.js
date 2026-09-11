"use strict";

const layers = require("./rules/layers");

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
  },
};
