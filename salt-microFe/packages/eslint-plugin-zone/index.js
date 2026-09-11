"use strict";

const noCrossZoneLink = require("./rules/no-cross-zone-link");

/**
 * Multi-Zones 경계를 강제하는 ESLint 플러그인 (FE-REQ-007 FR-5).
 *
 * eslintrc(`.eslintrc.json`)에서 `"plugins": ["@repo/zone"]`으로 쓴다.
 * CommonJS인 이유는 eslintrc 모드가 ESM 플러그인을 로드하지 못하기 때문이다.
 */
module.exports = {
  rules: {
    "no-cross-zone-link": noCrossZoneLink,
  },
};
