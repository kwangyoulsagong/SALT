import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  assembleExplanationFacts,
  completeExplanation,
  explainClientOf,
  guardExplanationLine,
  pickExplainProvider,
  verifyExplanation,
  type ExplainRouteInput,
} from "../policy";
import type { CoachExplanationInput } from "../ports";

/** 해설 다듬기 공급자 라우팅 · 줄 검사 (`SRV-REQ-050` FR-3 · FR-4 · FR-13 · FR-14) */

const base: ExplainRouteInput = {
  local: "local_claude",
  localPaused: false,
  localBusy: false,
  email: "owner@salt.test",
  localUsers: ["Owner@salt.test"],
  client: "web",
};

describe("pickExplainProvider", () => {
  it("로컬 CLI 있음 · 허용 사용자 · 웹 → 로컬(이메일 대소문자 무관)", () => {
    assert.equal(pickExplainProvider(base), "local_claude");
    assert.equal(pickExplainProvider({ ...base, local: "local_codex" }), "local_codex");
  });

  it("모바일 · 허용 밖 · CLI 없음 · 쉬는 중 · 상한 → Gemini", () => {
    assert.equal(pickExplainProvider({ ...base, client: "mobile" }), "gemini");
    assert.equal(pickExplainProvider({ ...base, email: "guest@salt.test" }), "gemini");
    assert.equal(pickExplainProvider({ ...base, email: undefined }), "gemini");
    assert.equal(pickExplainProvider({ ...base, localUsers: [] }), "gemini");
    assert.equal(pickExplainProvider({ ...base, local: null }), "gemini");
    assert.equal(pickExplainProvider({ ...base, localPaused: true }), "gemini");
    assert.equal(pickExplainProvider({ ...base, localBusy: true }), "gemini");
  });

  it("헤더는 mobile 만 모바일 — 없거나 다른 값은 web", () => {
    assert.equal(explainClientOf("mobile"), "mobile");
    assert.equal(explainClientOf(" Mobile "), "mobile");
    assert.equal(explainClientOf(undefined), "web");
    assert.equal(explainClientOf("local_claude"), "web");
  });
});

const input: CoachExplanationInput = {
  symbol: "BTC",
  koreanName: "비트코인",
  mode: "long_term",
  currentPrice: 100_000_000,
  change24h: -1.5,
  tradeValue24h: 5e11,
  evidence: [
    { label: "판단", value: "모아가기 검토" },
    { label: "RSI(14)", value: "30" },
  ],
  stance: "candidate",
  news: [{ title: "비트코인 ETF 순유입 3일째", source: "뉴스", sentiment: "긍정" }],
};

describe("줄 검사 · 묶기 (FR-13)", () => {
  it("사실에 있는 숫자는 통과 · 지어낸 숫자 · 권유는 걸린다", () => {
    assert.deepEqual(guardExplanationLine("keyDrivers", "RSI(14)가 30으로 낮은 편이에요.", input), { ok: true });
    assert.equal(guardExplanationLine("keyDrivers", "RSI가 25까지 내려갔어요.", input).ok, false);
    assert.equal(guardExplanationLine("risks", "지금 매수하세요.", input).ok, false);
  });

  it("금액은 크기 — 근처의 방향 말이 금액을 음수로 만들지 않는다 · 변동률은 방향 대조 유지", () => {
    const line = "24시간 거래대금 5000억원은 하락 구간에서도 거래가 이어진다는 관찰이에요.";
    assert.deepEqual(guardExplanationLine("keyDrivers", line, input), { ok: true });
    assert.equal(guardExplanationLine("keyDrivers", "24시간 동안 1.5% 상승했어요.", input).ok, false);
  });

  it("기사 숫자는 뉴스 칸에서만", () => {
    assert.equal(guardExplanationLine("newsSummary", "ETF 순유입이 3일째 이어졌어요.", input).ok, true);
    assert.equal(guardExplanationLine("keyDrivers", "ETF 순유입이 3일째 이어져 상승 근거예요.", input).ok, false);
  });

  it("빈 칸만 템플릿으로 채우고 그 칸을 알린다", () => {
    const kept = { modeReasoning: ["첫 문장이에요.", "둘째 문장이에요."], keyDrivers: ["근거예요."], risks: [], newsSummary: [] };
    const { explanation, filled } = completeExplanation(kept, input, new Date());
    assert.equal(explanation.modeReasoning, "첫 문장이에요. 둘째 문장이에요.");
    assert.deepEqual(explanation.keyDrivers, ["근거예요."]);
    assert.ok(explanation.risks.length > 0);
    assert.deepEqual(filled.sort(), ["newsSummary", "risks"]);
  });

  it("판단 문단은 문장 단위 — 걸린 문장만 빠진다(FR-14, 예전엔 통째 템플릿)", () => {
    const verified = verifyExplanation(
      {
        modeReasoning: "RSI(14)가 30이라 과열은 아니에요. 지금 바로 매수하세요.",
        timeframe: "",
        keyDrivers: [],
        risks: [],
        newsSummary: [],
        disclaimer: "",
        generatedAt: "",
        cached: false,
      },
      input,
      new Date()
    );
    assert.equal(verified.explanation.modeReasoning, "RSI(14)가 30이라 과열은 아니에요.");
    assert.equal(verified.source, "llm_checked");
  });
});

describe("assembleExplanationFacts — RSI 반올림 (2026-11-02 실측)", () => {
  it("RSI 원값은 소수 1자리로 싣는다 — 모델이 열네 자리를 옮겨 적지 않게", () => {
    const facts = assembleExplanationFacts({
      symbol: "LINK",
      mode: "scalp",
      quote: { currentPrice: 15180, change24h: -0.26, tradeValue24h: 3.5e9, koreanName: "체인링크" } as never,
      judgment: { action: "watch" as never, label: "관망", headline: "관망", reasons: [], risks: [] },
      indicator: { rsi14: 28.42105263157895 } as never,
      sentiment: undefined,
      whale: { buyAmountKRW: 0, sellAmountKRW: 0, count: 0 },
      news: [],
    });
    assert.ok(facts?.evidence.some((e) => e.value === "28.4"));
    assert.ok(!JSON.stringify(facts).includes("28.421"));
  });
});

describe("완곡 권유 — 지켜보라는 말 (2026-11-02 로컬 Claude 블라인드 평가)", () => {
  it("'보는 게 중요해요' · '필요가 있어요/생겨요' · '열어 둘 필요' 는 걸리고, '필요한 근거' 는 통과", () => {
    for (const s of [
      "판단 뒤 30일 동안 거래 흐름을 함께 보는 게 해석에 중요해요.",
      "이 항목의 변화를 함께 보는 게 의미가 있어요.",
      "반대 가능성도 열어 둘 필요가 있어요.",
      "따로 살펴볼 필요가 생겨요.",
    ]) assert.equal(guardExplanationLine("risks", s, input).ok, false, s);
    assert.equal(guardExplanationLine("risks", "판단에 필요한 근거가 부족해요.", input).ok, true);
  });
});
