import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { attachJudgmentTrack } from "../lib/judgmentTrack";
import type { JudgmentCase, JudgmentTrackStats, ModeDecision, SymbolJudgmentStore } from "../../domain";

/**
 * 국내 판단 성적 출처(사전등록 `kr-judgment-backtest@1` [display]) — 라이브 표본이 모자랄 동안만 백테스트, 국내만, 합산 없음
 */

const stats = (sample: number, judgedMonths: number): JudgmentTrackStats => ({
  sample,
  hits: Math.floor(sample * 0.6),
  aboveCost: Math.floor(sample * 0.4),
  poolSample: sample * 3,
  poolAboveCost: Math.floor(sample * 3 * 0.42),
  judgedMonths,
  avgReturn: 0,
  worstReturn: -0.3,
  firstScoredAt: new Date("2022-11-14T07:00:00Z"),
  lastScoredAt: new Date("2026-10-07T07:00:00Z"),
});

const store = (s: JudgmentTrackStats, symbol: string): SymbolJudgmentStore & { asked: string[] } => {
  const asked: string[] = [];
  return {
    asked,
    summarize: async (signalType: string) => {
      asked.push(signalType);
      return s;
    },
    recentCases: async (): Promise<JudgmentCase[]> =>
      s.sample === 0 ? [] : [{ symbol, judgedAt: new Date("2025-03-03T07:00:00Z"), action: "avoid", returnRate: 0.08 }],
  } as unknown as SymbolJudgmentStore & { asked: string[] };
};

const avoid: ModeDecision = {
  mode: "long_term",
  symbol: "005930",
  label: "지금은 피하기",
  action: "avoid",
  riskLevel: "high",
  timeframe: "30d",
  headline: "h",
  reasons: [],
  risks: ["기술 지표가 과열권에 가깝습니다."],
} as unknown as ModeDecision;

describe("attachJudgmentTrack — 국내 백테스트 성적 출처", () => {
  it("라이브 표본 0 · 백테스트 15,311건 48개월 → 백테스트 성적 · 백테스트 사례로 열린다", async () => {
    const live = store(stats(0, 0), "LIVE");
    const backtest = store(stats(15_311, 48), "BT");
    const view = await attachJudgmentTrack(live, avoid, {}, "kr_stock", backtest);
    assert.equal(view.trackRecord.sampleOrigin, "backtest");
    assert.equal(view.trackRecord.sample, 15_311);
    assert.equal(view.failureCases[0].symbol, "BT");
    assert.equal(view.renderable, true);
    assert.deepEqual(backtest.asked, ["kr_stock.long_term.avoid"]);
  });

  it("라이브 표본이 20 이 되면 라이브만 — 합산하지 않는다", async () => {
    const view = await attachJudgmentTrack(store(stats(20, 2), "LIVE"), avoid, {}, "kr_stock", store(stats(15_311, 48), "BT"));
    assert.equal(view.trackRecord.sampleOrigin, "live");
    assert.equal(view.trackRecord.sample, 20);
    assert.equal(view.failureCases[0].symbol, "LIVE");
  });

  it("백테스트 판단 달이 12 미만이면 쓰지 않는다 → 표본 부족으로 막힘", async () => {
    const view = await attachJudgmentTrack(store(stats(0, 0), "LIVE"), avoid, {}, "kr_stock", store(stats(500, 11), "BT"));
    assert.equal(view.trackRecord.sampleOrigin, "live");
    assert.equal(view.blockedReason, "insufficient_sample");
  });

  it("코인은 백테스트 저장소가 있어도 묻지 않는다", async () => {
    const backtest = store(stats(15_311, 48), "BT");
    const view = await attachJudgmentTrack(store(stats(0, 0), "LIVE"), { ...avoid, symbol: "BTC" }, {}, "crypto", backtest);
    assert.equal(view.trackRecord.sampleOrigin, "live");
    assert.equal(backtest.asked.length, 0);
  });
});
