import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { weeklyPlanFromHeader } from "../coachConversation.controller";

/**
 * 답 스트림의 이번 주 적립 사실 헤더(서버 S4a `SRV-REQ-049` FR-1) — BFF 가 Kotlin portfolio 에서 읽어 싣는다.
 * 경계: 맞는 모양만 사실, 나머지는 null(답은 "불러올 수 없어요" — 500 아님 · 틀린 금액을 말하지 않는다)
 */
describe("주간 계획 헤더 해석", () => {
  const ok = { configured: true, totalKrw: 300000, items: [{ asset: "btc", amountKrw: 150000, fixed: true }, { asset: "kospi", amountKrw: null, fixed: false }] };
  const table: Array<[string, string | string[] | undefined, boolean]> = [
    ["맞는 모양", JSON.stringify(ok), true],
    ["설정 전(총액 null · 자산 0)", JSON.stringify({ configured: false, totalKrw: null, items: [] }), true],
    ["없음", undefined, false],
    ["빈 글자", "", false],
    ["JSON 아님", "{configured", false],
    ["모르는 자산", JSON.stringify({ ...ok, items: [{ asset: "eth", amountKrw: 1, fixed: true }] }), false],
    ["소수 금액", JSON.stringify({ ...ok, totalKrw: 1.5 }), false],
    ["모르는 키", JSON.stringify({ ...ok, extra: 1 }), false],
    ["자산 셋", JSON.stringify({ ...ok, items: [...ok.items, ok.items[0]] }), false],
    ["헤더 둘(배열)", [JSON.stringify(ok), JSON.stringify(ok)], false],
    ["2,000자 넘음", JSON.stringify(ok) + " ".repeat(2_000), false],
  ];
  for (const [name, raw, accepted] of table) {
    it(`${name} → ${accepted ? "사실" : "null"}`, () => assert.equal(weeklyPlanFromHeader(raw) !== null, accepted));
  }
});
