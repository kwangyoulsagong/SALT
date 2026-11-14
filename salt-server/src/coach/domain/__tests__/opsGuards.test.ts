import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DEFAULT_LLM_BUDGET,
  isForecastStale,
  isPriceFresh,
  judgmentCaveats,
  LLM_RESERVED_CALLS,
  llmBudgetVerdict,
  resolveLlmLimits,
  staleJudgmentInputs,
} from "../index";

/** 운영 게이트 — 재료 신선도 · LLM 비용 상한 (F010 슬라이스 7 · `SRV-REQ-024` FR-194~196 · `SRV-REQ-025` FR-62~64) */

const NOW = new Date("2026-10-07T02:00:00Z");
const ago = (minutes: number) => new Date(NOW.getTime() - minutes * 60_000);

describe("staleJudgmentInputs — 모드별 기준", () => {
  it("시세 30분 · 단타 지표 3시간 · 장기 지표 3일을 넘으면 오래됐다", () => {
    assert.deepEqual(
      staleJudgmentInputs({ mode: "scalp", priceUpdatedAt: ago(29), indicatorTimestamp: ago(179), now: NOW }),
      []
    );
    assert.deepEqual(
      staleJudgmentInputs({ mode: "scalp", priceUpdatedAt: ago(31), indicatorTimestamp: ago(181), now: NOW }),
      ["price", "technical_indicator"]
    );
    // 같은 4시간 묵은 봉이 장기에선 정상 — 일봉은 정상이어도 이틀 가까이 늙어 있다
    assert.deepEqual(
      staleJudgmentInputs({ mode: "long_term", priceUpdatedAt: ago(1), indicatorTimestamp: ago(48 * 60), now: NOW }),
      []
    );
    assert.deepEqual(
      staleJudgmentInputs({ mode: "long_term", priceUpdatedAt: ago(1), indicatorTimestamp: ago(73 * 60), now: NOW }),
      ["technical_indicator"]
    );
  });

  it("시각을 모르는 재료는 오래됐다고 하지 않는다 — 없음은 missingData 가 말한다", () => {
    assert.deepEqual(
      staleJudgmentInputs({ mode: "scalp", priceUpdatedAt: null, indicatorTimestamp: null, now: NOW }),
      []
    );
    assert.equal(isPriceFresh(undefined, NOW), true);
    assert.equal(isForecastStale(null, NOW), false);
  });

  it("forecast 산출은 사흘 · 시세는 30분", () => {
    assert.equal(isForecastStale(ago(3 * 24 * 60 - 1), NOW), false);
    assert.equal(isForecastStale(ago(3 * 24 * 60 + 1), NOW), true);
    assert.equal(isPriceFresh(ago(30), NOW), true);
    assert.equal(isPriceFresh(ago(31), NOW), false);
  });
});

describe("judgmentCaveats — stale_inputs (ADR-010 v2: 막지 않고 꼬리표)", () => {
  const full = {
    action: "wait" as const,
    reasons: ["근거"],
    risks: [] as string[],
    observations: [],
    triad: { origin: "live" as const, caveat: null },
  };

  it("오래된 재료는 판단을 숨기지 않고 꼬리표 · 투자유의가 먼저 온다", () => {
    assert.deepEqual(judgmentCaveats(full), []);
    assert.deepEqual(judgmentCaveats({ ...full, staleInputs: ["price"] }), ["stale_inputs"]);
    assert.deepEqual(judgmentCaveats({ ...full, staleInputs: [] }), []);
    assert.deepEqual(judgmentCaveats({ ...full, staleInputs: ["price"], exchangeWarning: true }), [
      "exchange_warning",
      "stale_inputs",
    ]);
  });
});

describe("llmBudgetVerdict — 24시간 서버 전체 시도 · 토큰", () => {
  it("상한에 닿으면(같으면) 막고, 어느 상한인지 말한다", () => {
    assert.deepEqual(llmBudgetVerdict({ calls: DEFAULT_LLM_BUDGET.totalCalls - 1, tokens: DEFAULT_LLM_BUDGET.totalTokens - 1 }, DEFAULT_LLM_BUDGET), { allowed: true, exceeded: null });
    assert.equal(llmBudgetVerdict({ calls: DEFAULT_LLM_BUDGET.totalCalls, tokens: 0 }, DEFAULT_LLM_BUDGET).exceeded, "total_calls");
    assert.equal(llmBudgetVerdict({ calls: 0, tokens: DEFAULT_LLM_BUDGET.totalTokens }, DEFAULT_LLM_BUDGET).exceeded, "total_tokens");
  });

  it("남길 몫(reservedCalls) — 몫 r 을 받으면 상한 끝 r 회 앞에서 멈춘다 · 몫 없이는 상한까지(F016 단계 D — 배치 순서 셋은 factExtraction.test)", () => {
    const r = LLM_RESERVED_CALLS.moveSummary;
    assert.equal(llmBudgetVerdict({ calls: DEFAULT_LLM_BUDGET.totalCalls - r - 1, tokens: 0 }, DEFAULT_LLM_BUDGET, r).allowed, true);
    assert.equal(llmBudgetVerdict({ calls: DEFAULT_LLM_BUDGET.totalCalls - r, tokens: 0 }, DEFAULT_LLM_BUDGET, r).exceeded, "total_calls");
    assert.equal(llmBudgetVerdict({ calls: DEFAULT_LLM_BUDGET.totalCalls - r, tokens: 0 }, DEFAULT_LLM_BUDGET).allowed, true);
    assert.equal(llmBudgetVerdict({ calls: 0, tokens: 0 }, { totalCalls: 5, totalTokens: 1 }, 99).allowed, false);
  });

  it("env 덮어쓰기는 준 칸만 바꾼다", () => {
    assert.deepEqual(resolveLlmLimits({ totalCalls: 5, totalTokens: undefined }), { ...DEFAULT_LLM_BUDGET, totalCalls: 5 });
    assert.deepEqual(resolveLlmLimits(), DEFAULT_LLM_BUDGET);
  });
});
