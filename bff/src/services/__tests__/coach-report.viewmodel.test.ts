import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  toCoachReportViewModel,
  toReportRecommendation,
  type ServerCoachDetail,
} from "../coach-report.viewmodel";

/** 코치 리포트 뷰모델 (`BFF-REQ-023` FR-1~6 · 10~14 · 30~32 · 40). */

const blocked = {
  action: "sell",
  symbol: "BTC",
  assetType: "crypto",
  score: 64,
  scoreNote: "점수는 확률이 아닙니다",
  renderable: false,
  blockedReason: "failure_cases_missing",
  reasons: [{ type: "rsi", message: "RSI" }],
  topFactors: [{ key: "rsi", score: 10, message: "RSI" }],
  signalTrackRecord: { signalType: "coach.sell", sample: 1, winRate: 1, avgReturn: 0.09, worstObservedReturn: 0.09, lowSample: true },
  failureCases: [],
  explanation: { text: "규칙 문장", source: "rule" },
  confidence: 0.4,
};

const open = {
  ...blocked,
  renderable: true,
  blockedReason: null,
  failureCases: [{ date: "2026-08-01", event: "coach.sell", outcome: "miss" }],
};

const detail = (over: Partial<ServerCoachDetail> = {}): ServerCoachDetail => ({
  generatedAt: "2026-09-23T03:03:21.745Z",
  staleHours: 27,
  regime: "sideways",
  recommendation: blocked,
  risks: [],
  candidates: [{ action: "sell", symbol: "BTC", score: 64, reasons: [] }],
  exitPlans: [
    {
      symbol: "BTC",
      assetType: "crypto",
      currentPrice: 116257000,
      stopLoss: { price: 109281580, priceGap: -6975420 },
      firstTakeProfit: { price: 116257000, priceGap: 0 },
      trendHold: { conditionCode: "hold_or_trail_stop" },
    },
  ],
  behaviorFacts: [{ factCode: "over_trading", params: { windowHours: 24, trades: 15, threshold: 12 }, amountKrw: null }],
  excluded: [{ assetType: "kr_stock", reasonCode: "no_realtime_data" }],
  disclaimer: "과거 판단의 결과이며…",
  ...over,
});

describe("toReportRecommendation", () => {
  it("막힌 추천에는 행동 · 종목 · 점수 · 근거가 없다 — 사유와 표본 수만", () => {
    assert.deepEqual(toReportRecommendation(blocked), {
      renderable: false,
      blockedReason: "failure_cases_missing",
      trackSample: 1,
    });
  });

  it("열린 추천은 골라 옮긴다 — confidence 가 끊긴다", () => {
    const view = toReportRecommendation(open);

    assert.equal(view?.renderable, true);
    assert.equal("confidence" in (view as object), false);
    if (view?.renderable) {
      assert.equal(view.signalTrackRecord.signalType, "coach.sell");
      assert.equal(view.failureCases.length, 1);
    }
  });

  it("서버가 열었어도 3종 세트 · scoreNote 가 비면 막는다 — 열 수는 없다", () => {
    for (const broken of [
      { ...open, failureCases: [] },
      { ...open, reasons: [] },
      { ...open, signalTrackRecord: null },
      { ...open, signalTrackRecord: { ...open.signalTrackRecord, sample: 0 } },
      { ...open, scoreNote: "" },
      { ...open, action: "moon" },
    ]) {
      assert.equal(toReportRecommendation(broken), undefined);
    }
  });

  it("renderable 이 불리언이 아니거나 사유를 모르면 계약 깨짐이다", () => {
    assert.equal(toReportRecommendation({ ...blocked, renderable: "false" }), undefined);
    assert.equal(toReportRecommendation({ ...blocked, blockedReason: "insufficient_sample" }), undefined);
  });

  it("추천이 없으면 null — 깨짐과 구분된다", () => {
    assert.equal(toReportRecommendation(null), null);
  });
});

describe("toCoachReportViewModel", () => {
  it("서버 값을 그대로 옮긴다 — staleHours · 가격 거리 · 조건 코드 · 행동 코드", () => {
    const view = toCoachReportViewModel(detail());

    assert.equal(view.status, "ok");
    if (view.status !== "ok") return;
    assert.equal(view.staleHours, 27);
    assert.equal(view.exitPlans[0].stopLoss.priceGap, -6975420);
    assert.equal(view.exitPlans[0].trendHold.conditionCode, "hold_or_trail_stop");
    assert.equal(view.behaviorFacts[0].factCode, "over_trading");
    assert.deepEqual(view.degradedFields, []);
  });

  it("추천 계약이 깨지면 추천만 막고 나머지 블록은 간다", () => {
    const view = toCoachReportViewModel(detail({ recommendation: { ...open, failureCases: [] } }));

    assert.equal(view.status, "ok");
    if (view.status !== "ok") return;
    assert.equal(view.recommendation, null);
    assert.deepEqual(view.degradedFields, ["recommendation"]);
    assert.equal(view.exitPlans.length, 1);
  });

  it("목록 필드가 배열이 아니면 빈 배열 + degradedFields", () => {
    const view = toCoachReportViewModel(detail({ exitPlans: null, behaviorFacts: undefined }));

    if (view.status !== "ok") return assert.fail("ok 여야 한다");
    assert.deepEqual(view.exitPlans, []);
    assert.deepEqual(view.degradedFields, ["exitPlans", "behaviorFacts"]);
  });

  it("면책 · 제외 사실이 없으면 리포트 전체가 unavailable 이다", () => {
    assert.deepEqual(toCoachReportViewModel(detail({ disclaimer: "" })), { status: "unavailable" });
    assert.deepEqual(toCoachReportViewModel(detail({ excluded: undefined })), { status: "unavailable" });
  });
});
