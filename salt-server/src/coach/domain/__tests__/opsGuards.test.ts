import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DEFAULT_LLM_BUDGET,
  isForecastStale,
  isPriceFresh,
  judgmentGate,
  llmBudgetVerdict,
  resolveLlmLimits,
  staleJudgmentInputs,
  type JudgmentTrackRecord,
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

describe("judgmentGate — stale_inputs", () => {
  const record = { lowSample: false } as JudgmentTrackRecord;
  const full = {
    action: "wait" as const,
    reasons: ["근거"],
    risks: [],
    trackRecord: record,
    failureCases: [{ symbol: "BTC", judgedAt: NOW, action: "wait" as const, returnRate: -0.1 }],
  };

  it("오래된 재료가 하나라도 있으면 성적과 무관하게 막는다 · 투자유의가 먼저다", () => {
    assert.deepEqual(judgmentGate(full), { renderable: true, blockedReason: null });
    assert.deepEqual(judgmentGate({ ...full, staleInputs: ["price"] }), {
      renderable: false,
      blockedReason: "stale_inputs",
    });
    assert.equal(judgmentGate({ ...full, staleInputs: [] }).renderable, true);
    assert.equal(
      judgmentGate({ ...full, staleInputs: ["price"], exchangeWarning: true }).blockedReason,
      "exchange_warning"
    );
  });
});

describe("llmBudgetVerdict — 24시간 시도 · 토큰", () => {
  const usage = (user: number, total: number, tokens = 0) => ({
    user: { calls: user, tokens: 0 },
    total: { calls: total, tokens },
  });

  it("상한에 닿으면(같으면) 막고, 어느 상한인지 말한다", () => {
    assert.deepEqual(llmBudgetVerdict(usage(29, 299, 1_499_999), DEFAULT_LLM_BUDGET), {
      allowed: true,
      exceeded: null,
    });
    assert.equal(llmBudgetVerdict(usage(30, 30), DEFAULT_LLM_BUDGET).exceeded, "user_calls");
    assert.equal(llmBudgetVerdict(usage(0, 300), DEFAULT_LLM_BUDGET).exceeded, "total_calls");
    assert.equal(llmBudgetVerdict(usage(0, 0, 1_500_000), DEFAULT_LLM_BUDGET).exceeded, "total_tokens");
  });

  it("env 덮어쓰기는 준 칸만 바꾼다", () => {
    assert.deepEqual(resolveLlmLimits({ userCalls: 5, totalCalls: undefined }), {
      ...DEFAULT_LLM_BUDGET,
      userCalls: 5,
    });
    assert.deepEqual(resolveLlmLimits(), DEFAULT_LLM_BUDGET);
  });
});
