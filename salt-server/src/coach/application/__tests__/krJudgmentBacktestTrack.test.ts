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

describe("attachJudgmentTrack — 3종 채우기 · 국내 백테스트 성적 출처 (ADR-010 v2)", () => {
  it("라이브 표본 0 · 백테스트 15,311건 48개월 → 백테스트 성적 · 사례로 채우고 live_sample_short", async () => {
    const live = store(stats(0, 0), "LIVE");
    const backtest = store(stats(15_311, 48), "BT");
    const view = await attachJudgmentTrack(live, avoid, {}, "kr_stock", { backtest });
    assert.equal(view.trackRecord.sampleOrigin, "backtest");
    assert.equal(view.trackRecord.sample, 15_311);
    assert.equal(view.failureCases[0].symbol, "BT");
    assert.deepEqual(view.caveats, [{ reason: "live_sample_short", live: 0, min: 20, backtest: 15_311 }]);
    assert.deepEqual(backtest.asked, ["kr_stock.long_term.avoid"]);
  });

  it("라이브 표본이 20 이 되면 라이브만 — 합산하지 않는다", async () => {
    const view = await attachJudgmentTrack(store(stats(20, 2), "LIVE"), avoid, {}, "kr_stock", { backtest: store(stats(15_311, 48), "BT") });
    assert.equal(view.trackRecord.sampleOrigin, "live");
    assert.equal(view.trackRecord.sample, 20);
    assert.equal(view.failureCases[0].symbol, "LIVE");
    assert.deepEqual(view.caveats, []);
  });

  it("라이브 20 인데 빗나간 사례가 0 이면 백테스트로 채운다 — 3종의 실패사례 몫", async () => {
    const perfect = { ...stats(25, 2), hits: 25 };
    const view = await attachJudgmentTrack(store(perfect, "LIVE"), avoid, {}, "kr_stock", { backtest: store(stats(15_311, 48), "BT") });
    assert.equal(view.trackRecord.sampleOrigin, "backtest");
    assert.equal(view.failureCases[0].symbol, "BT");
    assert.equal(view.caveats[0].reason, "live_sample_short");
  });

  it("저장소가 실패하면 판단은 나가고 결함 꼬리표 track_record_unavailable (SRV-REQ-026 FR-72 v2)", async () => {
    const broken = {
      summarize: async () => {
        throw new Error("db");
      },
      recentCases: async () => [],
    } as unknown as SymbolJudgmentStore;
    const view = await attachJudgmentTrack(broken, avoid, {}, "kr_stock", { backtest: null });
    assert.equal(view.judgment.action, "avoid");
    assert.deepEqual(view.caveats, [{ reason: "track_record_unavailable" }]);
    assert.equal(view.trackRecord.sample, 0);
  });

  it("백테스트 판단 달이 12 미만이면 쓰지 않는다 → 막지 않고 결함 꼬리표 backtest_missing", async () => {
    const view = await attachJudgmentTrack(store(stats(0, 0), "LIVE"), avoid, {}, "kr_stock", { backtest: store(stats(500, 11), "BT") });
    assert.equal(view.trackRecord.sampleOrigin, "live");
    assert.deepEqual(view.caveats, [{ reason: "backtest_missing", live: 0, min: 20 }]);
  });

  // signal-skill@1 [display] — 코인 · 국내 단타는 판단 달이 아니라 판단 날 ≥ 10 (2026-11-10 코인 과거 검산이 같은 저장소로 들어옴)
  it("코인도 과거 검산으로 채운다 — 판단 날 ≥ 10 이면 채움, 9 면 결함", async () => {
    const filled = await attachJudgmentTrack(store(stats(0, 0), "LIVE"), { ...avoid, symbol: "BTC" }, {}, "crypto", {
      backtest: store({ ...stats(1_496, 2), judgedDays: 42 }, "ETH"),
    });
    assert.equal(filled.trackRecord.sampleOrigin, "backtest");
    assert.deepEqual(filled.failureCases.map((item) => item.symbol), ["ETH"]);
    assert.ok(filled.caveats.some((caveat) => caveat.reason === "live_sample_short"));

    const short = await attachJudgmentTrack(store(stats(0, 0), "LIVE"), { ...avoid, symbol: "BTC" }, {}, "crypto", {
      backtest: store({ ...stats(23, 1), judgedDays: 9 }, "ETH"),
    });
    assert.equal(short.trackRecord.sampleOrigin, "live");
    assert.ok(short.caveats.some((caveat) => caveat.reason === "backtest_missing"));
  });

  it("국내 단타도 판단 날로 — 국내 장기의 판단 달 조건을 쓰지 않는다", async () => {
    const view = await attachJudgmentTrack(store(stats(0, 0), "LIVE"), { ...avoid, mode: "scalp" }, {}, "kr_stock", {
      backtest: store({ ...stats(14_859, 1), judgedDays: 988 }, "000660"),
    });
    assert.equal(view.trackRecord.sampleOrigin, "backtest");
    assert.equal(view.signalType, "kr_stock.scalp.avoid");
  });
});
