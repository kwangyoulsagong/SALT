import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type {
  BaseRateReader,
  BaseRateRow,
  BaseRateTriggerRow,
  CoachHolding,
  CoachQuote,
  MarketProbe,
  PortfolioProbe,
  TradeCheckLedger,
  TradeCheckRecord,
} from "../../domain";
import { CheckTradeOdds } from "../CheckTradeOdds";

/** 점검 유스케이스(F017 v2 단계 2) — 막지 않기(예측 뷰가 없어도 200) · 원장 한 줄 · 팔기 전 보유는 펼침 칸에만 */

const NOW = new Date("2026-11-11T03:00:00Z");
const REF = new Date("2026-11-11T00:00:00Z");

const market = (q: Partial<CoachQuote> = {}) =>
  ({
    quotes: async (symbols: string[]) =>
      new Map(
        symbols.map((s) => [
          s,
          {
            symbol: s,
            assetType: "crypto",
            koreanName: "비트코인",
            currentPrice: 90_000_000,
            change24h: -8,
            tradeValue24h: 1e11,
            priceUpdatedAt: NOW,
            ...q,
          } satisfies CoachQuote,
        ])
      ),
  }) as unknown as MarketProbe;

const portfolio = (h: Partial<CoachHolding> | null) =>
  ({ getHolding: async () => (h ? ({ unrealizedProfitRate: 12.5, ...h } as CoachHolding) : null) }) as unknown as PortfolioProbe;

const stat = (p: Partial<BaseRateRow>): BaseRateRow => ({
  market: "crypto",
  conditionId: "ALL",
  horizon: 1,
  asOf: NOW,
  kind: "usual",
  status: "ok",
  sample: 326_916,
  sampleEff: 5_908,
  sampleDays: 3_311,
  upRate: 0.459,
  upLow: 0.446,
  upHigh: 0.472,
  mean: -0.001,
  q10: -0.055,
  q50: -0.001,
  q90: 0.047,
  holdUpRate: 0.5,
  holdQ10: -0.053,
  holdQ50: 0,
  holdQ90: 0.049,
  differs: null,
  recentDiffers: true,
  ...p,
});

const C3L = stat({ conditionId: "C3L", kind: "test", sample: 978, sampleEff: 288, upRate: 0.56, upLow: 0.503, upHigh: 0.617, differs: "higher" });
const trigger: BaseRateTriggerRow = {
  conditionId: "C3L",
  appliesTo: "next",
  refClose: 100_000_000,
  refAt: REF,
  priceAtLeast: null,
  priceAtMost: 92_000_000,
  openAtLeast: null,
  valueAtLeast: null,
};

const reader = (stats: BaseRateRow[], triggers: BaseRateTriggerRow[]): BaseRateReader => ({
  stats: async () => stats,
  triggers: async () => triggers,
});

const recorder = () => {
  const rows: TradeCheckRecord[] = [];
  const ledger: TradeCheckLedger = { record: async (e) => void rows.push(e) };
  return { rows, ledger };
};

describe("CheckTradeOdds", () => {
  it("조건 성립 — 요약 · 범위 · 평소와 다름 · 원장 한 줄(사용자 열 없음)", async () => {
    const { rows, ledger } = recorder();
    const uc = new CheckTradeOdds(market(), portfolio(null), reader([stat({}), C3L], [trigger]), ledger, () => NOW);
    const v = await uc.execute("u1", { symbol: "btc", side: "buy" });
    assert.equal(v.status, "ok");
    assert.equal(v.condition?.id, "C3L");
    assert.equal(v.upRate, 0.56);
    assert.deepEqual(v.upRange, { low: 0.503, high: 0.617 });
    assert.equal(v.differsFromUsual, "higher");
    assert.match(v.summary, /100번 중 56번/);
    assert.equal(v.holding, null);
    await new Promise((r) => setImmediate(r));
    assert.equal(rows.length, 1);
    assert.equal(rows[0].conditionId, "C3L");
    assert.equal(rows[0].symbol, "BTC");
    assert.ok(!("userId" in rows[0]));
  });

  it("예측 뷰를 못 읽어도 200 — no_condition · not_covered, 원장 0", async () => {
    const { rows, ledger } = recorder();
    const broken: BaseRateReader = {
      stats: async () => {
        throw new Error('relation "forecast.v_base_rate" does not exist');
      },
      triggers: async () => [],
    };
    const v = await new CheckTradeOdds(market(), portfolio(null), broken, ledger, () => NOW).execute("u1", { symbol: "BTC", side: "buy" });
    assert.equal(v.status, "no_condition");
    assert.equal(v.conditionReason, "not_covered");
    assert.equal(v.summary, "지금은 과거와 견줄 기록이 없어요.");
    assert.equal(rows.length, 0);
  });

  it("문턱 밖 — 평소 값으로 말하고 조건은 null", async () => {
    const { ledger } = recorder();
    const uc = new CheckTradeOdds(market({ currentPrice: 99_000_000 }), portfolio(null), reader([stat({}), C3L], [trigger]), ledger, () => NOW);
    const v = await uc.execute("u1", { symbol: "BTC", side: "buy" });
    assert.equal(v.status, "no_condition");
    assert.equal(v.conditionReason, "none_matched");
    assert.equal(v.condition, null);
    assert.equal(v.upRate, 0.459);
    assert.equal(v.differsFromUsual, null);
  });

  it("팔기 전 — 보유 연장 비율 · 확정 수익률은 holding 칸에만", async () => {
    const { ledger } = recorder();
    const uc = new CheckTradeOdds(market(), portfolio({}), reader([stat({}), C3L], [trigger]), ledger, () => NOW);
    const v = await uc.execute("u1", { symbol: "BTC", side: "sell" });
    assert.equal(v.upRate, 0.5); // C3L holdUpRate 기본값
    assert.equal(v.upRange, null);
    assert.equal(v.differsFromUsual, null);
    assert.deepEqual(v.holding, { realizedPct: 12.5 });
    assert.doesNotMatch(v.summary, /12\.5|매입|손익/);
  });

  it("below_min — 비율 null · 이유 문장", async () => {
    const { ledger } = recorder();
    const thin = stat({ conditionId: "C3L", kind: "test", status: "below_min", upRate: null, upLow: null, upHigh: null, holdUpRate: null, sampleEff: 41 });
    const v = await new CheckTradeOdds(market(), portfolio(null), reader([stat({}), thin], [trigger]), ledger, () => NOW).execute("u1", { symbol: "BTC", side: "buy" });
    assert.equal(v.status, "below_min");
    assert.equal(v.upRate, null);
    assert.match(v.summary, /아직 41번뿐/);
  });
});
