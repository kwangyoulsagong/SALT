import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  FACT_MAX_PER_BODY,
  LLM_RESERVED_CALLS,
  DEFAULT_LLM_BUDGET,
  canonicalNumber,
  checkExtractedFacts,
  llmBudgetVerdict,
  numbersInSource,
  parseFactArray,
  reservedCallsBehind,
} from "..";

/** F017 v4 2c — 사실 추출 검사(SRV-REQ-053 FR-14 · ADR-009 v4): 숫자 원문 대조 · 문장 금지 · 출력 모양 */

const SOURCE = [
  "씨티씨바이오 3분기 누적 영업익 182% 증가…수익성 개선",
  "씨티씨바이오는 3분기 누적 영업이익이 52억원으로 전년 동기 대비 182% 늘었다고 13일 공시했다.",
  "매출액은 1,234.50억원이었다. 순손실은 -3.2% 줄었다.",
].join("\n");

const fact = (over: Record<string, unknown> = {}) => ({
  who: "씨티씨바이오", what: "3분기 누적 영업이익", amount: 52, unit: "억원", compared_to: "전년 동기 대비", when: "3분기", ...over,
});

describe("숫자 원문 대조 (경계 표)", () => {
  const cases: Array<[string, Record<string, unknown>, "kept" | string]> = [
    ["원문 숫자 · 원문 단위", {}, "kept"],
    ["숫자 문자열", { amount: "52" }, "kept"],
    ["쉼표 · 끝 0 표기 차이", { what: "매출액", amount: "1234.5" }, "kept"],
    ["원문 쉼표 그대로", { what: "매출액", amount: "1,234.50" }, "kept"],
    ["퍼센트", { what: "영업이익 증가율", amount: 182, unit: "%" }, "kept"],
    ["원문에 빼기표가 붙은 음수", { what: "순손실 변화", amount: -3.2, unit: "%" }, "kept"],
    ["원문에 없는 숫자(환산)", { amount: 5200000000, unit: "원" }, "amount_not_in_source"],
    ["원문에 없는 음수", { amount: -52 }, "amount_not_in_source"],
    ["반올림한 숫자", { what: "매출액", amount: 1235 }, "amount_not_in_source"],
    ["숫자가 아님", { amount: "많이" }, "amount_not_number"],
    ["숫자에 단위 없음", { unit: null }, "unit_missing"],
    ["원문에 없는 단위", { unit: "달러" }, "unit_not_in_source"],
    ["숫자 없는 사실", { what: "대표이사 변경", amount: null, unit: null }, "kept"],
    ["무엇이 문장(~했다)", { what: "영업이익이 늘었다" }, "sentence"],
    ["무엇이 문장(해요체)", { what: "수익성이 좋아졌어요" }, "sentence"],
    ["무엇이 마침표로 끝남", { what: "영업이익 증가." }, "sentence"],
    ["무엇이 너무 김(41자)", { what: "가".repeat(41) }, "what"],
    ["누가 없음", { who: "" }, "who"],
  ];
  for (const [name, over, want] of cases) {
    it(name, () => {
      const r = checkExtractedFacts(JSON.stringify([fact(over)]), SOURCE);
      if (want === "kept") assert.equal(r.kept.length, 1, JSON.stringify(r.dropped));
      else assert.deepEqual(r.dropped, [want]);
    });
  }
  it("남은 사실의 숫자는 한 꼴 · 음수는 부호 그대로", () => {
    const r = checkExtractedFacts(JSON.stringify([fact({ what: "매출액", amount: "1,234.50" }), fact({ what: "순손실 변화", amount: -3.2, unit: "%" })]), SOURCE);
    assert.deepEqual(r.kept.map((k) => k.amount), ["1234.5", "-3.2"]);
  });
});

describe("출력 모양", () => {
  it("코드 울타리 · 앞뒤 말을 견딘다", () => assert.equal(parseFactArray("결과입니다:\n```json\n[{\"a\":1}]\n```")?.length, 1));
  it("{ facts: [...] } 도 받는다", () => assert.equal(parseFactArray('{"facts":[{"a":1},{"b":2}]}')?.length, 2));
  it("배열이 아니면 malformed(사실 0 과 구분)", () => {
    assert.equal(checkExtractedFacts("모르겠어요", SOURCE).malformed, true);
    assert.equal(checkExtractedFacts("[]", SOURCE).malformed, false);
  });
  it("같은 무엇은 한 번 · 상한", () => {
    const many = Array.from({ length: FACT_MAX_PER_BODY + 3 }, (_, i) => fact({ what: `사실 ${i}`, amount: null, unit: null }));
    const r = checkExtractedFacts(JSON.stringify([fact(), fact(), ...many]), SOURCE);
    assert.equal(r.kept.length, FACT_MAX_PER_BODY);
    assert.ok(r.dropped.includes("duplicate") && r.dropped.includes("over_limit"));
  });
  it("배열 안 객체가 아닌 것", () => assert.deepEqual(checkExtractedFacts('["문장", 3]', SOURCE).dropped, ["not_object", "not_object"]));
});

describe("숫자 한 꼴", () => {
  it("canonicalNumber", () => {
    assert.equal(canonicalNumber("1,234.50"), "1234.5");
    assert.equal(canonicalNumber("+007"), "7");
    assert.equal(canonicalNumber("1.0"), "1");
    assert.equal(canonicalNumber("abc"), null);
  });
  it("원문 숫자 모음", () => {
    const n = numbersInSource("영업이익 52억원 · 손실 −3.2% · 2억8410만달러");
    for (const v of ["52", "3.2", "-3.2", "2", "8410"]) assert.ok(n.has(v), v);
    assert.ok(!n.has("284100000"));
  });
});

describe("LLM 상한 — 세 배치 몫(해설 → 한 줄 → 사실 추출)", () => {
  it("앞 배치는 뒤 배치 몫 합만큼 남긴다 · 맨 뒤는 상한까지", () => {
    assert.equal(reservedCallsBehind("explanation"), LLM_RESERVED_CALLS.moveSummary + LLM_RESERVED_CALLS.factExtract);
    assert.equal(reservedCallsBehind("moveSummary"), LLM_RESERVED_CALLS.factExtract);
    assert.equal(reservedCallsBehind("factExtract"), 0);
  });
  it("경계 — 해설은 270 에서 멈추고(사실 추출 전과 같은 몫), 한 줄은 300, 추출은 360", () => {
    const at = (calls: number, batch: Parameters<typeof reservedCallsBehind>[0]) =>
      llmBudgetVerdict({ calls, tokens: 0 }, DEFAULT_LLM_BUDGET, reservedCallsBehind(batch)).allowed;
    assert.deepEqual([at(269, "explanation"), at(270, "explanation")], [true, false]);
    assert.deepEqual([at(299, "moveSummary"), at(300, "moveSummary")], [true, false]);
    assert.deepEqual([at(359, "factExtract"), at(360, "factExtract")], [true, false]);
  });
});
