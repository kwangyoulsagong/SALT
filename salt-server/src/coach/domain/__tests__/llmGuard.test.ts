import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  contradictsStance,
  languageViolations,
  stanceOf,
  verifyExplanation,
  type CoachExplanation,
  type CoachExplanationInput,
} from "../index";

/** LLM 가드 보강 — F010 슬라이스 6 · `SRV-REQ-025` FR-61 · 리서치 §2-4 8 */

const input: CoachExplanationInput = {
  symbol: "BTC",
  koreanName: "비트코인",
  mode: "long_term",
  currentPrice: 115_650_000,
  change24h: -1.23,
  tradeValue24h: 312_000_000_000,
  evidence: [
    { label: "판단", value: "관망" },
    { label: "근거", value: "RSI 31" },
    { label: "주의", value: "거래대금 감소" },
  ],
  stance: "wait",
  news: [{ title: "BTC 20% 급등 전망 나와", source: "코인데스크" }],
};

const llm = (patch: Partial<CoachExplanation>): CoachExplanation => ({
  modeReasoning: "장기 관점에서 RSI 31 구간을 관찰하는 단계예요.",
  timeframe: "",
  keyDrivers: ["RSI 31로 침체권에 가까워요."],
  risks: ["거래대금이 줄고 있어요."],
  newsSummary: ["BTC 20% 급등 전망 기사가 나왔어요."],
  disclaimer: "",
  generatedAt: "",
  cached: false,
  ...patch,
});

describe("영어 패턴", () => {
  it("확신 · 명령형 매매 · 목표가를 잡는다", () => {
    assert.deepEqual(languageViolations("Upside is guaranteed."), ["certainty"]);
    assert.deepEqual(languageViolations("This is a risk-free entry."), ["certainty"]);
    assert.deepEqual(languageViolations("Buy now before it runs."), ["imperative_trade"]);
    assert.deepEqual(languageViolations("You should sell this week."), ["imperative_trade"]);
    assert.deepEqual(languageViolations("Strong buy signal."), ["imperative_trade"]);
    assert.deepEqual(languageViolations("Analysts set a price target of 150k."), ["target_price"]);
  });

  it("부정형 면책 · 사실 서술은 통과한다", () => {
    for (const ok of ["Returns are not guaranteed.", "ETF inflows rose for 3 days.", "Buyers stepped in after the dip."]) {
      assert.deepEqual(languageViolations(ok), [], ok);
    }
  });
});

describe("판단 극성", () => {
  it("관망 · 피하기에 강세 전망, 후보에 약세 전망은 반대다", () => {
    assert.equal(contradictsStance("지금이 매수 적기예요.", "wait"), true);
    assert.equal(contradictsStance("반등 가능성이 높아 보여요.", "avoid"), true);
    assert.equal(contradictsStance("Looks bullish from here.", "wait"), true);
    // 2026-10-06 실호출에서 관망 판단에 통과했던 문장
    assert.equal(contradictsStance("RSI 지표가 41로 과매도 구간에 근접하고 있어, 향후 반등 가능성을 시사합니다.", "wait"), true);
    assert.equal(contradictsStance("하락 전망이 우세해요.", "candidate"), true);
  });

  it("관찰 · 같은 방향은 통과한다", () => {
    assert.equal(contradictsStance("어제 3% 올랐어요.", "avoid"), false);
    assert.equal(contradictsStance("하락 전망이 우세해요.", "wait"), false);
    assert.equal(contradictsStance("반등 가능성이 높아 보여요.", "candidate"), false);
  });

  it("규칙 행동에서 방향을 만든다", () => {
    assert.equal(stanceOf("review_accumulation"), "candidate");
    assert.equal(stanceOf("review_short_opportunity"), "candidate");
    assert.equal(stanceOf("wait"), "wait");
    assert.equal(stanceOf("avoid"), "avoid");
  });

  it("판단 · 근거 칸에서 걸리고 주의 칸은 대조하지 않는다", () => {
    const v = verifyExplanation(
      llm({
        modeReasoning: "RSI 31이라 지금이 매수 적기예요.",
        keyDrivers: ["반등 가능성이 높아요.", "RSI 31로 침체권이에요."],
        risks: ["반등 가능성이 높아도 거래대금이 줄고 있어요."],
      }),
      input,
      new Date()
    );
    assert.deepEqual(
      v.dropped.map((d) => [d.field, d.reasons]),
      [
        ["modeReasoning", ["judgment_polarity"]],
        ["keyDrivers", ["judgment_polarity"]],
      ]
    );
    assert.deepEqual(v.explanation.keyDrivers, ["RSI 31로 침체권이에요."]);
    assert.equal(v.explanation.risks.length, 1);
  });

  it("방향이 없으면 대조하지 않는다", () => {
    const { stance: _omit, ...noStance } = input;
    const v = verifyExplanation(llm({ keyDrivers: ["반등 가능성이 높아요."] }), noStance, new Date());
    assert.equal(v.dropped.length, 0);
  });
});

describe("뉴스 속 숫자는 뉴스 칸에서만", () => {
  it("뉴스 요약 칸은 기사 숫자를 쓸 수 있다", () => {
    const v = verifyExplanation(llm({}), input, new Date());
    assert.deepEqual(v.dropped, []);
    assert.deepEqual(v.explanation.newsSummary, ["BTC 20% 급등 전망 기사가 나왔어요."]);
  });

  it("근거 · 판단 칸에 기사 숫자가 오면 지어낸 숫자다", () => {
    const v = verifyExplanation(
      llm({ modeReasoning: "가격이 20% 상승한 흐름이에요.", keyDrivers: ["20% 상승 흐름이 이어져요.", "RSI 31이에요."] }),
      input,
      new Date()
    );
    assert.deepEqual(
      v.dropped.map((d) => [d.field, d.reasons]),
      [
        ["modeReasoning", ["unverified_number"]],
        ["keyDrivers", ["unverified_number"]],
      ]
    );
    assert.deepEqual(v.explanation.keyDrivers, ["RSI 31이에요."]);
  });
});
