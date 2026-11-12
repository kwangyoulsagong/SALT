import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isForecastOwner } from "../policy";

/** 전망 소유자 판정 (F008 `SRV-REQ-037` · `ADR-003`). 주간 변동 범위 카드 테스트는 2026-11-12 카드와 같이 삭제 */

describe("isForecastOwner", () => {
  it("대소문자 · 공백을 무시하고, 목록이 비면 아무도 아니다", () => {
    assert.equal(isForecastOwner(" Me@Example.com ", ["me@example.com"]), true);
    assert.equal(isForecastOwner("other@example.com", ["me@example.com"]), false);
    assert.equal(isForecastOwner("me@example.com", []), false);
    assert.equal(isForecastOwner(undefined, ["me@example.com"]), false);
  });
});
