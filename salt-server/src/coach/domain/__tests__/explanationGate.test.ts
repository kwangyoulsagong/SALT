import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { makeModeDecision } from "../policy/modeDecision";
import { explanationFactCatalog, citeSentence } from "../policy/explanationSnapshot";
import {
  EXPLANATION_SECTION_CAP,
  EXPLANATION_TOTAL_CAP,
  createLineGate,
  fixedCauseLine,
  guardExplanationLine,
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

/**
 * 입력이 말하지 않은 "마감"(`SRV-REQ-060` FR-4) — 해설은 장중 · 24시간 코인에도 만들어진다.
 * 불변식: 판단 · 근거 · 주의 칸의 "마감"은 입력 사실(뉴스 제외)에 마감이 있을 때만 통과 · 뉴스 칸은 제목 인용이라 건너뛴다
 */
describe("입력이 말하지 않은 마감", () => {
  const withCause = input({ cause: { ...cause, result: "오늘 +3.20%" } });
  const news = input({ news: [{ title: "도지코인 22일 주봉 마감 반등 분수령" }] });
  const closedFact = input({ evidence: [...input().evidence, { label: "근거", value: "장 마감 뒤 판단이에요" }] });
  const cases: Array<[string, Parameters<typeof guardExplanationLine>[0], string, CoachExplanationInput, boolean]> = [
    ["근거 칸 — 마감 없는 입력", "keyDrivers", "그 결과 오늘 +3.20%로 마감했어요.", withCause, false],
    ["판단 칸 — 마감 흐름", "modeReasoning", "삼성전자 장기 관점은 관망이고 오늘 마감 흐름이에요.", withCause, false],
    ["주의 칸 — 마감 없는 입력", "risks", "마감 뒤 흐름이 바뀌면 이 판단은 약해질 수 있어요.", withCause, false],
    ["근거 칸 — 마감 아닌 같은 문장", "keyDrivers", "그 결과 오늘 +3.20% 움직였어요.", withCause, true],
    ["뉴스 칸 — 제목 인용", "newsSummary", "도지코인이 22일 주봉 마감이 반등 분수령이라는 기사가 나왔어요.", news, true],
    ["뉴스 제목의 마감은 근거 칸을 받치지 않는다", "keyDrivers", "주봉 마감이 반등 분수령이에요.", news, false],
    ["입력 사실이 마감을 말하면 통과", "keyDrivers", "장 마감 뒤 판단이에요.", closedFact, true],
  ];
  for (const [name, section, text, inp, ok] of cases) {
    it(name, () => {
      const r = guardExplanationLine(section, text, inp);
      assert.equal(r.ok, ok);
      if (!ok) assert.deepEqual(r.ok ? [] : r.reasons, ["unsupported_close"]);
    });
  }
});

/**
 * 원인 단계 '없음'의 원인 줄은 서버 문장(`SRV-REQ-060` FR-6) — 모델이 바꿔 쓰면 "평소 범위 안이라 소식이 없어요"로 인과가 뒤집혔다.
 * 불변식: 단계 '없음'이면 원인 줄은 서버 문장 하나 · 모델이 판단 · 근거 칸에서 원인을 다시 말하면 버린다 · 단계가 있으면 지금 그대로
 */
describe("서버 원인 줄 — 단계 '없음'", () => {
  const quiet = input({
    cause: { strength: "none", headline: "평소 범위 안의 움직임이에요", note: "따로 볼 만한 원인을 찾지 않았어요", evidence: [], result: "오늘 +3.20%" },
  });
  const noNews = input({
    cause: { strength: "none", headline: "확인된 소식이 없어요", note: "아직 알려지지 않은 이유일 수 있어요", evidence: [], result: "오늘 +3.20%" },
  });

  it("문장은 서버 머리말 — 맺음말 그대로", () => {
    assert.equal(fixedCauseLine(quiet), "평소 범위 안의 움직임이에요 — 따로 볼 만한 원인을 찾지 않았어요.");
    assert.equal(fixedCauseLine(noNews), "확인된 소식이 없어요 — 아직 알려지지 않은 이유일 수 있어요.");
    assert.equal(fixedCauseLine(input({ cause })), null);
    assert.equal(fixedCauseLine(input()), null);
  });

  const cases: Array<[string, Parameters<typeof guardExplanationLine>[0], string, CoachExplanationInput, boolean]> = [
    ["뒤집기 — 범위 안이라 소식 없음", "keyDrivers", "오늘 움직임은 평소 범위 안이라 따로 확인된 소식이 없어요.", quiet, false],
    ["원인을 다시 말함", "keyDrivers", "뚜렷한 원인은 확인되지 않았어요.", noNews, false],
    ["판단 칸에서도", "modeReasoning", "확인된 소식이 없어 관망이에요.", noNews, false],
    ["원인 말 없는 근거는 통과", "keyDrivers", "RSI 56은 중간 구간이에요.", quiet, true],
    ["주의 칸은 원인 규칙 밖", "risks", "새 소식이 나오면 이 판단은 약해질 수 있어요.", quiet, true],
    ["단계가 있으면 모델이 옮긴다", "keyDrivers", "주주환원 확대 공시가 원인으로 보여요.", input({ cause }), true],
  ];
  for (const [name, section, text, inp, ok] of cases) {
    it(name, () => {
      const r = guardExplanationLine(section, text, inp);
      assert.equal(r.ok, ok);
      if (!ok) assert.deepEqual(r.ok ? [] : r.reasons, ["cause_rewrite"]);
    });
  }

  it("배치 검증 — 원인 줄이 근거 첫 줄 · 모델의 원인 문장은 빠짐 · 상한에 센다", () => {
    const v = verifyExplanation(
      {
        modeReasoning: "삼성전자 장기 관점은 관망이에요.",
        timeframe: "",
        keyDrivers: ["오늘 움직임은 평소 범위 안이라 확인된 소식이 없어요.", "RSI 56은 중간 구간이에요.", "판단은 관망이에요.", "흐름이 엇갈려요."],
        risks: [],
        newsSummary: [],
        disclaimer: "",
        generatedAt: "",
        cached: false,
      },
      quiet,
      new Date("2026-11-18T04:00:00Z")
    );
    assert.equal(v.explanation.keyDrivers[0], fixedCauseLine(quiet));
    assert.ok(!v.explanation.keyDrivers.some((l) => l.includes("범위 안이라")));
    assert.equal(v.explanation.keyDrivers.length, EXPLANATION_SECTION_CAP.keyDrivers);
    assert.deepEqual(v.explanation.risks, []);
  });

  it("줄 문지기 — 원인 줄 몫을 미리 센다(근거 칸 둘만 더)", () => {
    const gate = createLineGate(quiet);
    assert.deepEqual(["RSI 56은 중간이에요.", "판단은 관망이에요.", "흐름이 엇갈려요."].map((l) => gate("keyDrivers", l).ok), [true, true, false]);
  });
});
