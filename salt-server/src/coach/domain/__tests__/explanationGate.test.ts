import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { makeModeDecision } from "../policy/modeDecision";
import { explanationFactCatalog, citeSentence } from "../policy/explanationSnapshot";
import {
  EXPLANATION_SECTION_CAP,
  EXPLANATION_TOTAL_CAP,
  createLineGate,
  sentenceSimilarity,
  templateExplanation,
  verifyExplanation,
} from "../policy/explanationTemplate";
import type { CoachExplanationInput } from "../ports";

/**
 * 해설 문지기 — 칸 상한 · 전체 6 · 되풀이 · 원인 숫자(F017 v4 1f · `SRV-REQ-053` FR-16 · `FE-REQ-064` FR-10).
 * 불변식: 배치 검증과 스트림이 같은 문지기라 같은 입력이면 같은 문장이 남는다 · 남는 문장은 늘 6개 이하.
 */

const input = (over: Partial<CoachExplanationInput> = {}): CoachExplanationInput => ({
  symbol: "005930",
  koreanName: "삼성전자",
  mode: "long_term",
  currentPrice: 206000,
  change24h: 3.2,
  tradeValue24h: 1.2e12,
  evidence: [
    { label: "판단", value: "삼성전자 장기 관점은 관망입니다." },
    { label: "근거", value: "RSI 56은 중간 구간이에요" },
  ],
  ...over,
});

const cause: NonNullable<CoachExplanationInput["cause"]> = {
  strength: "likely",
  headline: "주주환원 확대 공시",
  note: "공시 뒤부터 움직였어요",
  evidence: [
    { value: "공시 뒤 30분 +2.1%", compare: null, source: "9:42 공시" },
    { value: "프로그램 매수 312억", compare: "평소(41억)의 7.6배", source: "수급" },
  ],
  result: "오늘 +3.2%",
};

describe("줄 문지기", () => {
  it("칸 상한 — 원인 → 근거 → 결과는 셋까지", () => {
    const gate = createLineGate(input());
    const lines = ["RSI 56은 중간이에요.", "판단은 관망이에요.", "흐름이 아직 엇갈려요.", "한 번 더 보면 관망이에요."];
    const ok = lines.map((l) => gate("keyDrivers", l).ok);
    assert.deepEqual(ok, [true, true, true, false]);
    assert.equal(EXPLANATION_SECTION_CAP.keyDrivers, 3);
  });

  it("전체 6 — 넘치면 뒤 칸(소식)부터 빠진다", () => {
    const gate = createLineGate(input({ news: [{ title: "삼성전자 신제품 공개", source: "언론" }] }));
    const results = [
      gate("modeReasoning", "삼성전자 장기 관점은 관망이에요."),
      gate("modeReasoning", "나눠 들어가면 변동 위험이 작아요."),
      gate("keyDrivers", "RSI 56은 중간 구간이에요."),
      gate("keyDrivers", "흐름이 한쪽으로 기울지 않았어요."),
      gate("keyDrivers", "관망 판단이 유지됐어요."),
      gate("risks", "흐름이 바뀌면 해석도 달라져요."),
      gate("newsSummary", "삼성전자가 신제품을 공개했다는 기사예요."),
    ];
    assert.deepEqual(results.map((r) => r.ok), [true, true, true, true, true, true, false]);
    assert.deepEqual((results[6] as { reasons: string[] }).reasons, ["over_cap"]);
    assert.equal(EXPLANATION_TOTAL_CAP, 6);
  });

  it("되풀이 — 앞 문장과 거의 같은 말은 버린다", () => {
    const gate = createLineGate(input());
    assert.ok(gate("keyDrivers", "RSI 56은 중간 구간이라 방향을 받치지 않아요.").ok);
    const again = gate("risks", "RSI 56은 중간 구간이라 방향을 받치지 않아요!");
    assert.equal(again.ok, false);
    assert.deepEqual((again as { reasons: string[] }).reasons, ["repeated"]);
    assert.ok(gate("risks", "흐름이 바뀌면 해석도 달라져요.").ok);
  });

  it("겹침 경계 — 같은 문장 1 · 다른 문장 낮음", () => {
    assert.equal(sentenceSimilarity("관망이에요", "관망이에요."), 1);
    assert.ok(sentenceSimilarity("RSI 56은 중간이에요", "흐름이 바뀌면 달라져요") < 0.3);
  });
});

describe("원인 재료", () => {
  it("원인 칸의 숫자는 원인이 실렸을 때만 인용할 수 있다", () => {
    const line = "공시 뒤 30분 +2.1% 움직인 것이 가장 유력한 원인으로 보여요.";
    assert.equal(createLineGate(input())("keyDrivers", line).ok, false);
    assert.equal(createLineGate(input({ cause }))("keyDrivers", line).ok, true);
  });

  it("원인 근거 문장은 출처 이름으로 인용된다(번호 아님)", () => {
    const catalog = explanationFactCatalog(input({ cause }), new Date("2026-11-13T06:00:00Z"));
    const cites = citeSentence("keyDrivers", "프로그램 매수 312억은 평소(41억)의 7.6배였어요.", catalog);
    assert.ok(cites.some((c) => c.label === "수급"), JSON.stringify(cites));
  });

  it("배치 검증도 같은 상한 — LLM 이 근거 다섯을 줘도 셋만 남는다", () => {
    const llm = {
      modeReasoning: "삼성전자 장기 관점은 관망이에요.",
      keyDrivers: ["RSI 56은 중간이에요.", "판단은 관망이에요.", "흐름이 아직 엇갈려요.", "넷째 근거예요.", "다섯째 근거예요."],
      risks: ["흐름이 바뀌면 해석도 달라져요."],
      newsSummary: [],
      timeframe: "",
      disclaimer: "",
      generatedAt: "",
      cached: false,
    };
    const v = verifyExplanation(llm, input(), new Date("2026-11-13T06:00:00Z"));
    assert.equal(v.explanation.keyDrivers.length, 3);
    assert.ok(v.dropped.every((d) => d.reasons.includes("over_cap")));
  });
});

describe("판단 머리말은 이름으로", () => {
  const base = { mode: "long_term" as const, symbol: "005930", change24h: 0, whaleBuy: 0, whaleSell: 0, hasHolding: false, missingData: [] };
  it("이름이 있으면 이름 · 없으면 코드(백테스트)", () => {
    assert.match(makeModeDecision({ ...base, displayName: "삼성전자" }).headline, /^삼성전자 장기 관점은/);
    assert.match(makeModeDecision(base).headline, /^005930 장기 관점은/);
  });
});

describe("단계 이름은 문장에 쓰지 않는다(1f 실측 — '확인된 소식 없음 단계로')", () => {
  for (const line of [
    "오늘 움직임은 확인된 소식 없음 단계로, 평소 범위 안이에요.",
    "가장 유력 단계는 공시예요.",
    "원인 후보는 업종 흐름이에요.",
  ]) {
    it(`버림 — ${line}`, () => {
      const r = createLineGate(input())("keyDrivers", line);
      assert.equal(r.ok, false);
    });
  }
  it("통과 — 확인된 소식이 없어요", () => {
    assert.ok(createLineGate(input())("keyDrivers", "오늘은 확인된 소식이 없어요.").ok);
  });
});

describe("사실표 문장 — 칸이 다 차도 6문장(F017 v4 1f)", () => {
  it("판단 두 문장 + 근거 셋 + 주의 둘 + 소식 둘이어도 6 이하", () => {
    const full = input({
      evidence: [
        { label: "판단", value: "삼성전자 장기 관점은 관망입니다. 나눠 들어가면 변동 위험이 작습니다." },
        { label: "근거", value: "근거 하나예요" },
        { label: "근거", value: "근거 둘이에요" },
        { label: "근거", value: "근거 셋이에요" },
        { label: "주의", value: "주의 하나예요" },
        { label: "주의", value: "주의 둘이에요" },
      ],
      news: [
        { title: "기사 하나", source: "언론" },
        { title: "기사 둘", source: "언론" },
      ],
    });
    const t = templateExplanation(full, new Date("2026-11-13T06:00:00Z"));
    const n = [...(t.modeReasoning.match(/.+?[.!?](?=\s|$)|.+$/gs) ?? []), ...t.keyDrivers, ...t.risks, ...t.newsSummary].length;
    assert.ok(n <= EXPLANATION_TOTAL_CAP, `n=${n}`);
    assert.equal(verifyExplanation(t, full, new Date("2026-11-13T06:00:00Z")).dropped.length, 0);
  });
});
