import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { KstDate } from "../../../shared/domain";
import {
  coachExclusions,
  isKrExitSettled,
  judgeOutcome,
  judgmentActionOf,
  judgmentAssetClassOf,
  judgmentGate,
  judgmentModeOf,
  judgmentSignalType,
  krJudgmentExitWindow,
  krLatestClosedSession,
  staleKrJudgmentInputs,
  summarizeJudgmentTrack,
  toScoreboardGroup,
  weekdaysBetween,
} from "../policy";

/**
 * 국내 주식 판단 규칙 (F011 슬라이스 4) — 그룹 키 접두 · 비용 · 게이트 순서 · 거래일 신선도 · 채점 창.
 */

describe("그룹 키 — 자산군 접두 (FR-61)", () => {
  it("코인은 접두 없이 그대로, 국내 주식은 kr_stock. 을 붙이고 읽을 때 뗀다", () => {
    assert.equal(judgmentSignalType("long_term", "wait"), "long_term.wait");
    const kr = judgmentSignalType("long_term", "review_accumulation", "kr_stock");
    assert.equal(kr, "kr_stock.long_term.review_accumulation");
    assert.equal(judgmentAssetClassOf(kr), "kr_stock");
    assert.equal(judgmentAssetClassOf("scalp.avoid"), "crypto");
    assert.equal(judgmentActionOf(kr), "review_accumulation");
    assert.equal(judgmentActionOf("scalp.avoid"), "avoid");
    assert.equal(judgmentModeOf(kr), "long_term");
    assert.equal(judgmentModeOf("coach.buy"), null);
  });

  it("성적표 그룹에 자산군 라벨이 붙는다 — 합산하지 않는다 (FR-65)", () => {
    const stats = {
      sample: 0,
      hits: 0,
      aboveCost: 0,
      avgReturn: null,
      worstReturn: null,
      firstScoredAt: null,
      lastScoredAt: null,
      bucketCounts: {},
      p25: null,
      median: null,
      p75: null,
    };
    assert.equal(toScoreboardGroup("long_term", { ...stats, signalType: "kr_stock.long_term.wait" }).assetClass, "kr_stock");
    assert.equal(toScoreboardGroup("long_term", { ...stats, signalType: "long_term.wait" }).assetClass, "crypto");
  });
});

describe("적중 경계 — 자산군 비용 (FR-64)", () => {
  it("같은 +0.2% 가 코인 비용(0.1%)으론 적중, 국내 주식 비용(0.23%)으론 빗나감", () => {
    assert.equal(judgeOutcome("long_term", "review_accumulation", 0.002), "hit");
    assert.equal(judgeOutcome("long_term", "review_accumulation", 0.002, 0.0023), "miss");
    assert.equal(judgeOutcome("long_term", "avoid", 0.002, 0.0023), "hit");
  });
});

describe("게이트 순서 — 열지 않은 모드 · 이력이 먼저 (FR-62 · 63)", () => {
  const track = summarizeJudgmentTrack("long_term", "kr_stock.long_term.wait", {
    sample: 0,
    hits: 0,
    aboveCost: 0,
    avgReturn: null,
    worstReturn: null,
    firstScoredAt: null,
    lastScoredAt: null,
  });
  const base = { action: "wait" as const, reasons: [], risks: [], trackRecord: track, failureCases: [] };

  it("열지 않은 모드 > 이력 부족 > 투자유의 > 오래된 재료 > 근거 > 표본", () => {
    assert.equal(
      judgmentGate({ ...base, modeNotOpen: true, historyShort: true, exchangeWarning: true }).blockedReason,
      "mode_not_open"
    );
    assert.equal(
      judgmentGate({ ...base, historyShort: true, exchangeWarning: true, staleInputs: ["price"] }).blockedReason,
      "insufficient_history"
    );
    assert.equal(judgmentGate({ ...base, reasons: ["r"] }).blockedReason, "insufficient_sample");
  });
});

describe("거래일 신선도 (FR-66)", () => {
  const kst = (iso: string) => new Date(`${iso}+09:00`);

  it("종가 확정 전 평일 · 주말은 직전 평일이 마지막 장이다", () => {
    assert.equal(krLatestClosedSession(kst("2026-10-08T15:59:00")).toString(), "2026-10-07");
    assert.equal(krLatestClosedSession(kst("2026-10-08T16:00:00")).toString(), "2026-10-08");
    assert.equal(krLatestClosedSession(kst("2026-10-11T12:00:00")).toString(), "2026-10-09");
    assert.equal(krLatestClosedSession(kst("2026-10-12T09:30:00")).toString(), "2026-10-09");
  });

  it("평일만 센다 — 금요일에서 다음 화요일까지 2", () => {
    assert.equal(weekdaysBetween(KstDate.parse("2026-10-09"), KstDate.parse("2026-10-13")), 2);
    assert.equal(weekdaysBetween(KstDate.parse("2026-10-09"), KstDate.parse("2026-10-09")), 0);
    assert.equal(weekdaysBetween(KstDate.parse("2026-10-13"), KstDate.parse("2026-10-09")), 0);
  });

  it("주말 · 저녁엔 오래되지 않고, 1 거래일 넘게 밀리면 오래됐다", () => {
    const friClose = kst("2026-10-09T15:30:00");
    const friBar = kst("2026-10-09T00:00:00");
    // 일요일 — 금요일 값 그대로
    assert.deepEqual(staleKrJudgmentInputs({ priceUpdatedAt: friClose, dailyIndicatorAt: friBar, now: kst("2026-10-11T20:00:00") }), []);
    // 월요일 종가 뒤 — 하루 밀림(평일 휴장 하나는 허용 폭)
    assert.deepEqual(staleKrJudgmentInputs({ priceUpdatedAt: friClose, dailyIndicatorAt: friBar, now: kst("2026-10-12T17:00:00") }), []);
    // 화요일 종가 뒤 — 이틀 밀림
    assert.deepEqual(
      staleKrJudgmentInputs({ priceUpdatedAt: friClose, dailyIndicatorAt: friBar, now: kst("2026-10-13T17:00:00") }),
      ["price", "technical_indicator"]
    );
    // 시각을 모르면 오래됐다고 하지 않는다
    assert.deepEqual(staleKrJudgmentInputs({ priceUpdatedAt: null, dailyIndicatorAt: null, now: kst("2026-10-13T17:00:00") }), []);
  });
});

describe("채점 창 — 만기일 이전 마지막 거래일 종가 (FR-64)", () => {
  const kst = (iso: string) => new Date(`${iso}+09:00`);

  it("만기 = 판단 + 30일(KST 날짜), 종가 확정은 그날 16시, 열흘 넘게 오래된 봉은 쓰지 않는다", () => {
    const window = krJudgmentExitWindow(kst("2026-09-08T10:00:00"));
    assert.equal(window.exitBarAt.toISOString(), kst("2026-10-08T00:00:00").toISOString());
    assert.equal(window.readyAt.toISOString(), kst("2026-10-08T16:00:00").toISOString());
    assert.equal(window.notBefore.toISOString(), kst("2026-09-28T00:00:00").toISOString());
  });

  it("주말 만기는 금요일 봉이면 바로 받는다", () => {
    const window = krJudgmentExitWindow(kst("2026-09-04T16:00:00")); // → 10-04(일)
    assert.equal(isKrExitSettled(window, kst("2026-10-02T00:00:00"), kst("2026-10-05T09:00:00")), true);
    // 목요일 봉이면(금요일 봉이 안 옴) 사흘 기다린다
    assert.equal(isKrExitSettled(window, kst("2026-10-01T00:00:00"), kst("2026-10-05T09:00:00")), false);
    assert.equal(isKrExitSettled(window, kst("2026-10-01T00:00:00"), kst("2026-10-07T16:00:00")), true);
  });

  it("평일 만기는 그날 봉이면 16시 뒤 바로, 전날 봉이면 사흘 뒤(평일 휴장)", () => {
    const window = krJudgmentExitWindow(kst("2026-09-08T10:00:00")); // → 10-08(목)
    assert.equal(isKrExitSettled(window, kst("2026-10-08T00:00:00"), kst("2026-10-08T15:00:00")), false);
    assert.equal(isKrExitSettled(window, kst("2026-10-08T00:00:00"), kst("2026-10-08T16:00:00")), true);
    assert.equal(isKrExitSettled(window, kst("2026-10-07T00:00:00"), kst("2026-10-09T16:00:00")), false);
    assert.equal(isKrExitSettled(window, kst("2026-10-07T00:00:00"), kst("2026-10-11T16:00:00")), true);
  });
});

describe("코치 상세 제외 사유 (FR-62)", () => {
  it("장기 유형 어느 것도 표본 20 이 아니면 insufficient_history + 가장 많이 쌓인 수, 차면 symbol_judgment_only", () => {
    assert.deepEqual(coachExclusions([3, 12, 0]), [
      { assetType: "kr_stock", reasonCode: "insufficient_history", progress: { largestGroupSample: 12, requiredSample: 20 } },
    ]);
    assert.equal(coachExclusions([20, 1, 0])[0].reasonCode, "symbol_judgment_only");
    assert.equal(coachExclusions([])[0].progress.largestGroupSample, 0);
  });
});
