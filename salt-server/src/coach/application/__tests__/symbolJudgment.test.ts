import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type {
  CoachMode,
  CoachProfileStore,
  GaugeTrackStats,
  GaugeTrackStore,
  JudgmentCase,
  JudgmentEvaluation,
  JudgmentOutcome,
  JudgmentSnapshotDraft,
  JudgmentTrackStats,
  MarketProbe,
  PendingJudgment,
  PortfolioProbe,
  SymbolJudgmentStore,
  TrackedAssetProbe,
} from "../../domain";
import { GetSymbolCoach } from "../GetSymbolCoach";
import { RefreshGaugeTrackRecords } from "../RefreshGaugeTrackRecords";
import {
  EvaluateSymbolJudgments,
  SnapshotSymbolJudgments,
} from "../RecordSymbolJudgments";

/**
 * 종목 판단 스냅샷 → 사후 판정 → 화면 게이트 (F004 · D11 · B39).
 *
 * 저장소는 메모리 구현이다. SQL 집계(`summarize`)를 같은 뜻의 배열 계산으로 흉내 낸다.
 */

const T0 = new Date("2026-09-01T00:00:00Z");
const hoursAfter = (h: number) => new Date(T0.getTime() + h * 3600_000);

type Row = JudgmentSnapshotDraft & {
  id: string;
  exitPrice?: number;
  returnRate?: number;
  outcome?: JudgmentOutcome;
};

class MemoryJudgmentStore implements SymbolJudgmentStore {
  rows: Row[] = [];

  async lastJudgedAt(symbols: string[]) {
    const result = new Map<string, Date>();
    for (const row of this.rows) {
      if (!symbols.includes(row.symbol)) continue;
      const key = `${row.symbol}:${row.mode}`;
      const prev = result.get(key);
      if (!prev || prev < row.judgedAt) result.set(key, row.judgedAt);
    }
    return result;
  }

  async saveSnapshots(drafts: JudgmentSnapshotDraft[]) {
    drafts.forEach((draft) =>
      this.rows.push({ ...draft, id: `${this.rows.length + 1}` })
    );
    return drafts.length;
  }

  async listPending(judgedBefore: Record<CoachMode, Date>, limit: number) {
    return this.rows
      .filter((row) => !row.outcome && row.judgedAt <= judgedBefore[row.mode])
      .slice(0, limit)
      .map(
        (row): PendingJudgment => ({
          id: row.id,
          symbol: row.symbol,
          mode: row.mode,
          action: row.action,
          entryPrice: row.entryPrice,
          judgedAt: row.judgedAt,
        })
      );
  }

  async saveEvaluations(evaluations: JudgmentEvaluation[]) {
    for (const evaluation of evaluations) {
      const row = this.rows.find((item) => item.id === evaluation.id)!;
      Object.assign(row, evaluation);
    }
  }

  async summarize(signalType: string): Promise<JudgmentTrackStats> {
    const done = this.rows.filter(
      (row) => row.signalType === signalType && row.outcome
    );
    const returns = done.map((row) => row.returnRate!);
    return {
      sample: done.length,
      hits: done.filter((row) => row.outcome === "hit").length,
      avgReturn: returns.length
        ? returns.reduce((a, b) => a + b, 0) / returns.length
        : null,
      worstReturn: returns.length ? Math.min(...returns) : null,
    };
  }

  async recentCases(signalType: string, outcome: JudgmentOutcome, limit: number) {
    return this.rows
      .filter((row) => row.signalType === signalType && row.outcome === outcome)
      .slice(-limit)
      .reverse()
      .map(
        (row): JudgmentCase => ({
          symbol: row.symbol,
          judgedAt: row.judgedAt,
          action: row.action,
          returnRate: row.returnRate!,
        })
      );
  }
}

/**
 * 심리·지표·대량 체결이 전부 중립이면 두 모드 다 `wait`(점수 50)이다.
 * 재료가 비면 안 된다 — 3종 이상 빠지면 −12 로 `avoid` 가 된다.
 */
const fakeMarket = (
  prices: Record<string, number>,
  exits: Record<string, number | null> = {}
): MarketProbe =>
  ({
    quotes: async (symbols: string[]) =>
      new Map(
        symbols
          .filter((symbol) => prices[symbol] !== undefined)
          .map((symbol) => [
            symbol,
            {
              symbol,
              assetType: "crypto",
              currentPrice: prices[symbol],
              change24h: 0,
              priceUpdatedAt: T0,
            },
          ])
      ),
    latestSentiments: async (symbols: string[]) =>
      new Map(
        symbols.map((symbol) => [
          symbol,
          { sentimentScore: 50, sentimentLabel: "neutral", priceChange24h: 0, calculatedAt: T0 },
        ])
      ),
    latestIndicators: async (symbols: string[]) =>
      new Map(
        symbols.map((symbol) => [
          symbol,
          { rsi14: 50, ma20: null, ma50: null, volumeAvg20: null, timestamp: T0 },
        ])
      ),
    recentWhales: async () => [
      { transactionType: "buy", amountKRW: 100 },
      { transactionType: "sell", amountKRW: 100 },
    ],
    closeAtOrAfter: async (symbol: string) => exits[symbol] ?? null,
    // 5분봉 24시간 · 일봉 1년이 다 찬 분포
    closePercentiles: async (_symbol: string, timeframe: string) =>
      timeframe === "m5"
        ? { sample: 288, values: [98, 100, 103] }
        : { sample: 365, values: [60, 90, 130] },
  }) as unknown as MarketProbe;

const noGauges: GaugeTrackStore = {
  replace: async () => undefined,
  find: async () => null,
};

const tracked = (symbols: string[]): TrackedAssetProbe => ({
  listTrackedSymbols: async () => symbols,
});

describe("SnapshotSymbolJudgments", () => {
  it("처음에는 종목마다 두 모드를 쓰고, 현재가가 없는 종목은 건너뛴다", async () => {
    const store = new MemoryJudgmentStore();
    const result = await new SnapshotSymbolJudgments(
      tracked(["BTC", "NOPRICE"]),
      fakeMarket({ BTC: 100 }),
      store,
      () => T0
    ).execute();

    assert.equal(result.written, 2);
    assert.deepEqual(result.skippedNoPrice, ["NOPRICE"]);
    assert.deepEqual(
      store.rows.map((row) => row.signalType).sort(),
      ["long_term.wait", "scalp.wait"]
    );
  });

  it("관찰 기간 안에서는 다시 쓰지 않는다 — 단타는 24시간 뒤, 장기는 30일 뒤", async () => {
    const store = new MemoryJudgmentStore();
    const at = (h: number) =>
      new SnapshotSymbolJudgments(
        tracked(["BTC"]),
        fakeMarket({ BTC: 100 }),
        store,
        () => hoursAfter(h)
      ).execute();

    await at(0);
    assert.equal((await at(23)).written, 0);
    assert.equal((await at(24)).written, 1); // 단타만
    assert.equal((await at(24 * 30)).written, 2); // 단타 + 장기
  });
});

describe("EvaluateSymbolJudgments", () => {
  it("만기가 된 것만, 만기 뒤 종가로 판정한다. 종가가 없으면 다음 회차로 미룬다", async () => {
    const store = new MemoryJudgmentStore();
    await new SnapshotSymbolJudgments(
      tracked(["BTC", "ETH"]),
      fakeMarket({ BTC: 100, ETH: 100 }),
      store,
      () => T0
    ).execute();

    const result = await new EvaluateSymbolJudgments(
      fakeMarket({}, { BTC: 101, ETH: null }),
      store,
      () => hoursAfter(25)
    ).execute();

    // 단타 2건이 만기, 그중 ETH 는 종가가 없다. 장기 2건은 아직이다
    assert.deepEqual(result, { evaluated: 1, waitingForPrice: 1 });
    const btc = store.rows.find((row) => row.symbol === "BTC" && row.mode === "scalp")!;
    assert.equal(btc.outcome, "hit"); // wait · +1% ≤ 2%
    assert.equal(
      store.rows.filter((row) => row.mode === "long_term" && row.outcome).length,
      0
    );
  });
});

describe("GetSymbolCoach — 모드별 게이트", () => {
  const portfolio = {
    getHolding: async () => null,
  } as unknown as PortfolioProbe;
  const profiles = {
    findByUser: async () => null,
  } as unknown as CoachProfileStore;

  it("신뢰도가 없고, 표본 0 은 null 승률로 싣는다 (초기 상태)", async () => {
    const view = await new GetSymbolCoach(
      fakeMarket({ BTC: 100 }),
      portfolio,
      profiles,
      new MemoryJudgmentStore(), noGauges
    ).execute("user-1", { symbol: "btc" });

    assert.equal("confidence" in view.modeDecision, false);
    assert.equal(view.modes.scalp.judgment.validity.code, "scalp_24h");
    assert.equal(view.modes.scalp.trackRecord.sample, 0);
    assert.equal(view.modes.scalp.trackRecord.winRate, null);
    // 중립 재료라 근거 문장이 없다 → 표본보다 근거가 먼저 막는다
    assert.equal(view.modes.scalp.blockedReason, "reasons_missing");
    assert.ok(view.disclaimer.length > 0);
  });

  it("mode 가 없으면 사용자 기본 모드 → 없으면 단타다 (FR-48)", async () => {
    const withMode = (defaultMode: "scalp" | "long_term" | null) =>
      ({ findByUser: async () => ({ defaultMode }) }) as unknown as CoachProfileStore;
    const run = (store: CoachProfileStore, mode?: "scalp" | "long_term") =>
      new GetSymbolCoach(
        fakeMarket({ BTC: 100 }),
        portfolio,
        store,
        new MemoryJudgmentStore(), noGauges
      ).execute("user-1", { symbol: "BTC", mode });

    assert.equal((await run(withMode("long_term"))).mode, "long_term");
    assert.equal((await run(withMode(null))).mode, "scalp");
    assert.equal((await run(profiles)).mode, "scalp");
    assert.equal((await run(withMode("long_term"), "scalp")).mode, "scalp", "요청이 이긴다");
  });

  it("근거가 있어도 표본이 20 미만이면 insufficient_sample 이다", async () => {
    const market = {
      ...fakeMarket({ BTC: 100 }),
      // 공포 심리 → 장기 근거 문장이 생긴다
      latestSentiments: async () =>
        new Map([
          ["BTC", { sentimentScore: 30, sentimentLabel: "fear", priceChange24h: 0, calculatedAt: T0 }],
        ]),
    } as unknown as MarketProbe;

    const view = await new GetSymbolCoach(
      market,
      portfolio,
      profiles,
      new MemoryJudgmentStore(), noGauges
    ).execute("user-1", { symbol: "BTC" });

    assert.ok(view.modes.longTerm.judgment.reasons.length > 0);
    assert.equal(view.modes.longTerm.blockedReason, "insufficient_sample");
    assert.deepEqual(view.modes.longTerm.failureCases, []);
  });

  it("같은 판단 유형에 표본 20 + 실패가 있으면 렌더하고 실패사례를 싣는다", async () => {
    const store = new MemoryJudgmentStore();
    for (let i = 0; i < 20; i++) {
      store.rows.push({
        id: `${i}`,
        symbol: "ETH",
        mode: "long_term",
        action: "review_accumulation",
        signalType: "long_term.review_accumulation",
        score: 80,
        reasons: ["x"],
        entryPrice: 100,
        judgedAt: hoursAfter(-24 * 30 * (i + 1)),
        returnRate: i < 5 ? -0.08 : 0.04,
        outcome: i < 5 ? "miss" : "hit",
      });
    }

    // 장기 모아가기 후보가 나오는 재료: 공포 심리(+10) · RSI 침체(+8) · 대량 매수 우세(+8)
    const market = {
      ...fakeMarket({ BTC: 100 }),
      latestSentiments: async () =>
        new Map([
          [
            "BTC",
            {
              sentimentScore: 30,
              sentimentLabel: "fear",
              priceChange24h: 0,
              calculatedAt: T0,
            },
          ],
        ]),
      latestIndicators: async () =>
        new Map([
          ["BTC", { rsi14: 30, ma20: null, ma50: null, volumeAvg20: null, timestamp: T0 }],
        ]),
      recentWhales: async () => [
        { transactionType: "buy", amountKRW: 1000 },
      ],
    } as unknown as MarketProbe;

    const view = await new GetSymbolCoach(market, portfolio, profiles, store, noGauges).execute(
      "user-1",
      { symbol: "BTC", mode: "long_term" }
    );

    const longTerm = view.modes.longTerm;
    assert.equal(longTerm.signalType, "long_term.review_accumulation");
    assert.equal(longTerm.trackRecord.sample, 20);
    assert.equal(longTerm.trackRecord.winRate, 15 / 20);
    assert.equal(longTerm.renderable, true);
    assert.equal(longTerm.failureCases.length, 3);
    assert.equal(longTerm.failureCases[0].outcome, "miss");
    assert.equal(longTerm.failureCases[0].event, "long_term.review_accumulation");
  });
});

describe("GetSymbolCoach — zone (FR-110~116)", () => {
  const profiles = {
    findByUser: async () => null,
  } as unknown as CoachProfileStore;
  const noHolding = { getHolding: async () => null } as unknown as PortfolioProbe;

  it("미보유 크립토는 모드마다 다른 관찰 구간이다", async () => {
    const view = await new GetSymbolCoach(
      fakeMarket({ BTC: 100 }),
      noHolding,
      profiles,
      new MemoryJudgmentStore(), noGauges,
      () => T0
    ).execute("user-1", { symbol: "BTC" });

    const scalp = view.modes.scalp.zone;
    const longTerm = view.modes.longTerm.zone;
    assert.equal(scalp.kind, "observation");
    assert.equal(longTerm.kind, "observation");
    if (scalp.kind !== "observation" || longTerm.kind !== "observation") return;
    assert.deepEqual(scalp.priceGap, { lower: -2, mid: 0, upper: 3 });
    assert.deepEqual(longTerm.lookback, { timeframe: "d1", days: 365 });
  });

  it("보유면 두 모드 다 규칙 가격이다", async () => {
    const holding = {
      getHolding: async () => ({
        symbol: "BTC",
        currentPrice: 100,
        averageBuyPrice: 100,
        unrealizedProfitRate: 0,
      }),
    } as unknown as PortfolioProbe;

    const view = await new GetSymbolCoach(
      fakeMarket({ BTC: 100 }),
      holding,
      profiles,
      new MemoryJudgmentStore(), noGauges,
      () => T0
    ).execute("user-1", { symbol: "BTC" });

    const zone = view.modes.longTerm.zone;
    assert.equal(zone.kind, "held_rule");
    assert.deepEqual(view.modes.scalp.zone, zone);
    if (zone.kind !== "held_rule") return;
    // 평단 100 · 수익률 0 → 손실 제한 92 · 1차 112 · 추세 유지 125
    assert.deepEqual(
      zone.stages.map((stage) => stage.priceGap),
      [-8, 12, 25]
    );
  });

  it("미보유 주식은 out_of_scope (D12), 현재가가 없으면 insufficient_price_history", async () => {
    const base = fakeMarket({ AAPL: 200 });
    const stock = {
      ...base,
      quotes: async (symbols: string[]) =>
        new Map(
          [...(await base.quotes(symbols))].map(([symbol, quote]) => [
            symbol,
            { ...quote, assetType: "stock" as const },
          ])
        ),
    } as MarketProbe;

    const aapl = await new GetSymbolCoach(
      stock,
      noHolding,
      profiles,
      new MemoryJudgmentStore(), noGauges,
      () => T0
    ).execute("user-1", { symbol: "AAPL" });
    assert.deepEqual(aapl.modes.scalp.zone, {
      kind: "unavailable",
      reasonCode: "out_of_scope",
    });

    const unknown = await new GetSymbolCoach(
      fakeMarket({}),
      noHolding,
      profiles,
      new MemoryJudgmentStore(), noGauges,
      () => T0
    ).execute("user-1", { symbol: "NEW" });
    assert.deepEqual(unknown.modes.longTerm.zone, {
      kind: "unavailable",
      reasonCode: "insufficient_price_history",
    });
  });
});

describe("게이지 적중률 (B9 · FR-120~122)", () => {
  const profiles = {
    findByUser: async () => null,
  } as unknown as CoachProfileStore;
  const noHolding = { getHolding: async () => null } as unknown as PortfolioProbe;

  class MemoryGaugeStore implements GaugeTrackStore {
    rows: GaugeTrackStats[] = [];
    async replace(
      gauge: GaugeTrackStats["gauge"],
      records: Omit<GaugeTrackStats, "gauge">[]
    ) {
      this.rows = records.map((record) => ({ ...record, gauge }));
    }
    async find(symbol: string, gauge: string, bucketCode: string) {
      return (
        this.rows.find(
          (row) =>
            row.symbol === symbol &&
            row.gauge === gauge &&
            row.bucketCode === bucketCode
        ) ?? null
      );
    }
  }

  const distribution = (bucketIndex: number, sample: number) => ({
    symbol: "BTC",
    bucketIndex,
    sample,
    p25: -0.05,
    median: 0.02,
    p75: 0.08,
    positiveRate: 0.6,
    windowFrom: T0,
    windowTo: T0,
  });

  const refresh = async (store: MemoryGaugeStore, rows: unknown[]) =>
    new RefreshGaugeTrackRecords(
      { sentimentForwardReturns: async () => rows } as unknown as MarketProbe,
      store,
      () => T0
    ).execute();

  const coach = (store: GaugeTrackStore) =>
    new GetSymbolCoach(
      fakeMarket({ BTC: 100 }), // 심리 50 → 40_60 구간
      noHolding,
      profiles,
      new MemoryJudgmentStore(),
      store,
      () => T0
    ).execute("user-1", { symbol: "BTC" });

  it("구간 번호를 코드로 바꿔 저장하고, 지금 심리 구간의 줄만 싣는다", async () => {
    const store = new MemoryGaugeStore();
    await refresh(store, [distribution(2, 25), distribution(4, 3)]);
    assert.deepEqual(
      store.rows.map((row) => row.bucketCode),
      ["40_60", "80_100"]
    );

    const view = await coach(store);
    assert.deepEqual(view.gaugeTrackRecords, [
      {
        gauge: "sentiment",
        bucketCode: "40_60",
        currentValue: 50,
        horizonDays: 30,
        sample: 25,
        p25: -0.05,
        median: 0.02,
        p75: 0.08,
        positiveRate: 0.6,
        lowSample: false,
      },
    ]);
  });

  it("표본이 20 미만이면 lowSample, 지금 구간에 표본이 없으면 배열에서 빠진다", async () => {
    const store = new MemoryGaugeStore();
    await refresh(store, [distribution(2, 3)]);
    assert.equal((await coach(store)).gaugeTrackRecords[0].lowSample, true);

    await refresh(store, [distribution(4, 30)]);
    assert.deepEqual((await coach(store)).gaugeTrackRecords, []);
  });
});
