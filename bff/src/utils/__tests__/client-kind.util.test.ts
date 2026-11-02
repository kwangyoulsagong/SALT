import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { explainClientOf } from "../client-kind.util";

describe("explainClientOf (BFF-REQ-050 FR-1)", () => {
  it("앱 웹뷰 UA(SALTApp/버전)면 mobile — 화면 계약 isAppWebView 와 같은 예시", () => {
    assert.equal(explainClientOf("Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Mobile/15E148 SALTApp/1.0.0"), "mobile");
    assert.equal(explainClientOf("SALTApp/2 Mozilla/5.0"), "mobile");
  });

  it("데스크톱 · 휴대폰 브라우저 · 이름만 비슷한 것 · 없음은 web", () => {
    assert.equal(explainClientOf("Mozilla/5.0 (Macintosh) Chrome/130 Safari/537.36"), "web");
    assert.equal(explainClientOf("Mozilla/5.0 (Linux; Android 14) Chrome/128 Mobile Safari/537.36"), "web");
    assert.equal(explainClientOf("Mozilla/5.0 NotSALTApp/1.0"), "web");
    assert.equal(explainClientOf(undefined), "web");
  });
});
