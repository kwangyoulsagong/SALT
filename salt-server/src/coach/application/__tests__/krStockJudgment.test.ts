import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type {
  CoachProfileStore,
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
import { EvaluateSymbolJudgments, SnapshotSymbolJudgments } from "../RecordSymbolJudgments";

/**
 * 국내 주식 종목 판단 — 자산군 분리 · 장기만 · 이력 조건 · 거래일 채점 (F011 슬라이스 4 · FR-60~66).
 *
 * 시각은 KST 로 읽는다. `2026-10-08T07:00Z` = 목요일 16:00 KST(정규장 종가 확정 뒤).
 */

const NOW = new Date("2026-10-08T07:00:00Z");
const CLOSE_TODAY = new Date("2026-10-08T06:30:00Z"); // 15:30 KST
const DAILY_BAR_TODAY = new Date("2026-10-07T15:00:00Z"); // 10-08 00:00 KST — 일봉 시각
const OWNER = "owner@salt.test";

type Row = JudgmentSnapshotDraft & { id: string; returnRate?: number; outcome?: JudgmentOutcome; exitPrice?: number };

class MemoryStore implements SymbolJudgmentStore {
  rows: Row[] = [];
  async lastJudgedAt() {
    return new Map<string, Date>();
  }
  async saveSnapshots(drafts: JudgmentSnapshotDraft[]) {
    drafts.forEach((draft) => this.rows.push({ ...draft, id: `${this.rows.length + 1}` }));
    return drafts.length;
  }
  async listPending(): Promise<PendingJudgment[]> {
    return this.rows
      .filter((row) => !row.outcome)
      .map((row) => ({
        id: row.id,
        symbol: row.symbol,
        signalType: row.signalType,
        mode: row.mode,
        action: row.action,
        entryPrice: row.entryPrice,
        judgedAt: row.judgedAt,
      }));
  }
  async saveEvaluations(evaluations: JudgmentEvaluation[]) {
    for (const evaluation of evaluations) Object.assign(this.rows.find((row) => row.id === evaluation.id)!, evaluation);
  }
  async summarize(signalType: string): Promise<JudgmentTrackStats> {
    const done = this.rows.filter((row) => row.signalType === signalType && row.outcome);
    return {
      sample: done.length,
      hits: done.filter((row) => row.outcome === "hit").length,
      aboveCost: 0,
      avgReturn: null,
      worstReturn: null,
      firstScoredAt: null,
      lastScoredAt: null,
    };
  }
  async recentCases(): Promise<JudgmentCase[]> {
    return [];
  }
  async scoreboard() {
    return [];
  }
  async recentCasesByGroup() {
    return new Map();
  }
}

interface KrFixture {
  price?: number;
  /** 전일 대비(%) */
  change?: number;
  priceUpdatedAt?: Date;
  dailyBars?: number;
  dailyIndicatorAt?: Date | null;
}

/** 코인 `BTC` 하나 + 국내 주식 여럿. 국내 주식은 심리 · 대량 체결이 없다 */
const market = (kr: Record<string, KrFixture>, extra: Partial<Record<keyof MarketProbe, unknown>> = {}): MarketProbe =>
  ({
    quotes: async (symbols: string[]) =>
      new Map(
        symbols.flatMap((symbol) => {
          if (symbol === "BTC") {
            return [[symbol, { symbol, assetType: "crypto", currentPrice: 100, change24h: 0, priceUpdatedAt: NOW }]];
          }
          const fixture = kr[symbol];
          if (!fixture) return [];
          return [
            [
              symbol,
              {
                symbol,
                assetType: "kr_stock",
                koreanName: symbol,
                currentPrice: fixture.price ?? 70_000,
                change24h: fixture.change ?? 0,
                tradeValue24h: 1,
                priceUpdatedAt: fixture.priceUpdatedAt ?? CLOSE_TODAY,
              },
            ],
          ];
        })
      ),
    latestSentiments: async (symbols: string[]) =>
      new Map(
        symbols
          .filter((symbol) => symbol === "BTC")
          .map((symbol) => [symbol, { sentimentScore: 50, sentimentLabel: "neutral", priceChange24h: 0, calculatedAt: NOW }])
      ),
    latestIndicators: async (symbols: string[], timeframe: string) =>
      new Map(
        symbols.flatMap((symbol) => {
          const at = symbol === "BTC" ? NOW : kr[symbol]?.dailyIndicatorAt === undefined ? DAILY_BAR_TODAY : kr[symbol].dailyIndicatorAt;
          // 국내 주식은 일봉 지표만 본다 — 1시간봉도 만들지만 장기 판단엔 쓰지 않는다
          if (!at || (symbol !== "BTC" && timeframe !== "d1")) return [];
          return [[symbol, { rsi14: 50, ma20: null, ma50: null, volumeAvg20: null, timestamp: at }]];
        })
      ),
    recentWhales: async (symbols: string[]) =>
      symbols.includes("BTC")
        ? [
            { transactionType: "buy", amountKRW: 100 },
            { transactionType: "sell", amountKRW: 100 },
          ]
        : [],
    dailyBarCounts: async (symbols: string[]) =>
      new Map(symbols.map((symbol) => [symbol, kr[symbol]?.dailyBars ?? 486])),
    closePercentiles: async () => ({ sample: 365, values: [60, 90, 130] }),
    ...extra,
  }) as unknown as MarketProbe;

const tracked = (symbols: string[]): TrackedAssetProbe => ({ listTrackedSymbols: async () => symbols });

describe("SnapshotSymbolJudgments — 국내 주식", () => {
  it("국내 주식은 장기만, 자산군 접두로 남긴다 — 코인은 그대로 두 모드 (FR-61 · 63)", async () => {
    const store = new MemoryStore();
    const result = await new SnapshotSymbolJudgments(
      tracked(["005930", "BTC"]),
      market({ "005930": {} }),
      store,
      () => NOW
    ).execute();

    assert.equal(result.written, 3);
    assert.deepEqual(store.rows.map((row) => row.signalType).sort(), [
      "kr_stock.long_term.wait",
      "long_term.wait",
      "scalp.wait",
    ]);
    // 국내 주식 진입가는 원 정수 시세 그대로
    assert.equal(store.rows.find((row) => row.symbol === "005930")?.entryPrice, 70_000);
  });

  it("이력이 모자라거나(일봉 120 · 일봉 지표) 1 거래일 넘게 밀린 종목은 표본으로 남기지 않는다 (FR-62 · 66)", async () => {
    const store = new MemoryStore();
    const result = await new SnapshotSymbolJudgments(
      tracked(["000660", "035420", "051910", "005930"]),
      market({
        "000660": { dailyBars: 63 },
        "035420": { dailyIndicatorAt: null },
        // 월요일 종가 뒤로 시세가 멈췄다 — 목요일 16시엔 화 · 수 · 목 세 거래일이 밀렸다
        "051910": { priceUpdatedAt: new Date("2026-10-05T06:30:00Z") },
        "005930": {},
      }),
      store,
      () => NOW
    ).execute();

    assert.deepEqual(result.skippedNotReady.sort(), ["000660", "035420", "051910"]);
    assert.deepEqual(store.rows.map((row) => row.symbol), ["005930"]);
  });
});

describe("EvaluateSymbolJudgments — 국내 주식 거래일 채점 (FR-64)", () => {
  const judged = (store: MemoryStore, judgedAt: Date, action: Row["action"] = "review_accumulation") =>
    store.rows.push({
      id: `${store.rows.length + 1}`,
      symbol: "005930",
      mode: "long_term",
      action,
      signalType: `kr_stock.long_term.${action}`,
      score: 75,
      reasons: [],
      entryPrice: 100,
      judgedAt,
      ruleVersion: "mode-decision@2",
    });

  it("만기일(일요일)이면 직전 거래일(금요일) 종가로, 국내 주식 비용 경계로 채점한다", async () => {
    const store = new MemoryStore();
    // 금 16:00 KST 판단 → +30일 = 10-04(일)
    judged(store, new Date("2026-09-04T07:00:00Z"));
    const asked: Array<{ at: string; timeframe: string; notBefore: string }> = [];
    const probe = market(
      {},
      {
        closeAtOrBefore: async (_symbol: string, at: Date, timeframe: string, notBefore: Date) => {
          asked.push({ at: at.toISOString(), timeframe, notBefore: notBefore.toISOString() });
          return { close: 100.2, timestamp: new Date("2026-10-01T15:00:00Z") }; // 10-02(금) 봉
        },
        closeAtOrAfter: async () => {
          throw new Error("국내 주식은 만기 뒤 첫 종가를 쓰지 않는다");
        },
      }
    );

    const result = await new EvaluateSymbolJudgments(probe, store, () => new Date("2026-10-05T01:00:00Z"), {
      crypto: 0.001,
      kr_stock: 0.0023,
    }).execute();

    assert.equal(result.evaluated, 1);
    assert.deepEqual(asked, [
      { at: "2026-10-03T15:00:00.000Z", timeframe: "d1", notBefore: "2026-09-23T15:00:00.000Z" },
    ]);
    // +0.2% 는 코인 비용(0.1%)이면 적중이지만 국내 주식 비용(0.23%)은 못 넘었다
    assert.equal(store.rows[0].outcome, "miss");
  });

  it("평일 만기인데 그날 봉이 아직 없으면 사흘 기다린다 — 평일 휴장은 그 뒤에야 직전 거래일로 받는다", async () => {
    const store = new MemoryStore();
    // 화 16:00 KST 판단 → +30일 = 10-08(목)
    judged(store, new Date("2026-09-08T07:00:00Z"), "wait");
    const probe = market(
      {},
      { closeAtOrBefore: async () => ({ close: 101, timestamp: new Date("2026-10-06T15:00:00Z") }) } // 10-07(수) 봉
    );

    const early = await new EvaluateSymbolJudgments(probe, store, () => new Date("2026-10-08T07:30:00Z")).execute();
    assert.equal(early.evaluated, 0);
    assert.equal(early.waitingForPrice, 1);

    const late = await new EvaluateSymbolJudgments(probe, store, () => new Date("2026-10-11T07:30:00Z")).execute();
    assert.equal(late.evaluated, 1);
    assert.equal(store.rows[0].outcome, "hit");
  });

  it("만기일 종가가 확정되기 전(16시 KST 전)엔 봉을 묻지도 않는다", async () => {
    const store = new MemoryStore();
    judged(store, new Date("2026-09-08T07:00:00Z"));
    let asked = 0;
    const probe = market({}, { closeAtOrBefore: async () => (asked++, null) });
    const result = await new EvaluateSymbolJudgments(probe, store, () => new Date("2026-10-08T05:00:00Z")).execute();
    assert.equal(result.evaluated, 0);
    assert.equal(asked, 0);
  });
});

describe("GetSymbolCoach — 국내 주식", () => {
  const profiles = {
    findByUser: async () => ({ defaultMode: "scalp" }),
  } as unknown as CoachProfileStore;
  const gauges: GaugeTrackStore = {
    replace: async () => undefined,
    find: async () => null,
    baselinePositiveRate: async () => null,
  };
  const holdingCalls: string[] = [];
  const portfolio = {
    getHolding: async (_userId: string, symbol: string, assetType = "crypto") => {
      holdingCalls.push(`${symbol}:${assetType}`);
      return null;
    },
  } as unknown as PortfolioProbe;
  const coach = (kr: Record<string, KrFixture>) =>
    new GetSymbolCoach(market(kr), portfolio, profiles, new MemoryStore(), gauges, () => NOW, null, [OWNER]);

  it("비소유자에겐 국내 주식 판단이 없다 — 시세 경로와 같은 404", async () => {
    await assert.rejects(
      coach({ "005930": {} }).execute("u2", { symbol: "005930", viewerEmail: "other@salt.test" }),
      (error: { code?: string }) => error.code === "COACH_KR_STOCK_NOT_AVAILABLE"
    );
  });

  it("일봉 63 이면 장기는 insufficient_history + 수치, 단타는 mode_not_open, 기본 모드는 장기 (FR-62 · 63)", async () => {
    holdingCalls.length = 0;
    const view = await coach({ "005930": { dailyBars: 63 } }).execute("u1", { symbol: "005930", viewerEmail: OWNER });

    assert.equal(view.mode, "long_term");
    assert.equal(view.modes.longTerm.blockedReason, "insufficient_history");
    assert.equal(view.modes.longTerm.signalType, "kr_stock.long_term.wait");
    assert.equal(view.modes.longTerm.assetClass, "kr_stock");
    assert.deepEqual(view.modes.longTerm.history, {
      ready: false,
      dailyBars: 63,
      requiredDailyBars: 120,
      dailyIndicator: true,
    });
    assert.equal(view.modes.scalp.blockedReason, "mode_not_open");
    // 심리 · 대량 체결은 국내 주식에 없는 재료다 — 빠졌다고 하지 않는다
    assert.deepEqual(view.missingData, []);
    // 보유는 국내 주식 자산군으로 읽는다
    assert.deepEqual(holdingCalls, ["005930:crypto", "005930:kr_stock"]);
  });

  it("이력이 차면 그다음 게이트(표본 20)로 막힌다 — 주말엔 금요일 종가가 오래된 재료가 아니다", async () => {
    const saturday = new Date("2026-10-10T03:00:00Z");
    const view = await new GetSymbolCoach(
      // 금요일 15:30 종가 · 금요일 일봉 — 토요일엔 밀린 거래일이 없다
      market({
        "005930": {
          priceUpdatedAt: new Date("2026-10-09T06:30:00Z"),
          dailyIndicatorAt: new Date("2026-10-08T15:00:00Z"),
          // 근거 문장이 하나 있어야 근거 게이트를 지나 표본 게이트에 닿는다
          change: -4,
        },
      }),
      portfolio,
      profiles,
      new MemoryStore(),
      gauges,
      () => saturday,
      null,
      [OWNER]
    ).execute("u1", { symbol: "005930", viewerEmail: OWNER });
    assert.equal(view.modes.longTerm.blockedReason, "insufficient_sample");
    assert.equal(view.modes.longTerm.history?.ready, true);
  });

  it("사용자가 단타를 골라도 국내 주식 단타는 열리지 않는다", async () => {
    const view = await coach({ "005930": {} }).execute("u1", { symbol: "005930", mode: "scalp", viewerEmail: OWNER });
    assert.equal(view.mode, "scalp");
    assert.equal(view.modes.scalp.blockedReason, "mode_not_open");
  });
});
