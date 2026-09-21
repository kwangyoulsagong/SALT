import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type {
  CoachMode,
  CoachProfileStore,
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
  }) as unknown as MarketProbe;

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
      new MemoryJudgmentStore()
    ).execute("user-1", { symbol: "btc" });

    assert.equal("confidence" in view.modeDecision, false);
    assert.equal(view.modes.scalp.judgment.validity.code, "scalp_5m_24h");
    assert.equal(view.modes.scalp.trackRecord.sample, 0);
    assert.equal(view.modes.scalp.trackRecord.winRate, null);
    // 중립 재료라 근거 문장이 없다 → 표본보다 근거가 먼저 막는다
    assert.equal(view.modes.scalp.blockedReason, "reasons_missing");
    assert.ok(view.disclaimer.length > 0);
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
      new MemoryJudgmentStore()
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

    const view = await new GetSymbolCoach(market, portfolio, profiles, store).execute(
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
