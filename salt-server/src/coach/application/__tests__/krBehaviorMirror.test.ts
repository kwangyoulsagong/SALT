import assert from "node:assert/strict";
import { describe, it } from "node:test";

import Decimal from "decimal.js";

import { ErrorKind } from "../../../shared/domain";
import type {
  CoachLedgerEntry,
  DecisionOutcome,
  DailyBar,
  DecisionOutcomeStore,
  ForecastReader,
  MarketProbe,
  PortfolioProbe,
  TradePlanStore,
} from "../../domain";
import { GetKrBehaviorMirror } from "../GetKrBehaviorMirror";

/**
 * F011 FR-47 — 국내 미러 유스케이스: 소유자 전용 · 국내 거래만 · 잘린 거래 · 최근 1년 매수 달 단면만 묻는다.
 */

const DAY = 24 * 60 * 60 * 1000;
const OWNER = "owner@example.com";

const bars: DailyBar[] = [];
for (let t = Date.parse("2026-06-01T00:00:00Z"); t < Date.parse("2026-10-24T00:00:00Z"); t += DAY) {
  const weekday = new Date(t).getUTCDay();
  if (weekday !== 0 && weekday !== 6) bars.push({ openTime: new Date(t), close: new Decimal(100) });
}

const entry = (id: string, side: "buy" | "sell", date: string, price: number): CoachLedgerEntry => ({
  id,
  symbol: "005930",
  side,
  quantity: 1,
  price,
  totalAmount: price,
  fee: 0,
  transactionDate: new Date(`${date}T00:00:00+09:00`),
});

const setup = (ledger: CoachLedgerEntry[], truncated = false, storedOutcomes: DecisionOutcome[] = []) => {
  const calls = { assetTypes: [] as unknown[], windows: [] as string[], outcomeAssetTypes: [] as unknown[] };
  const portfolio = {
    async listLedgerSince(_userId: string, _since: Date, _limit: number, assetTypes?: unknown) {
      calls.assetTypes.push(assetTypes);
      return { entries: [...ledger].reverse(), truncated };
    },
  } as unknown as PortfolioProbe;
  const forecasts = {
    async dailyCloses() {
      return new Map([["005930", bars]]);
    },
  } as unknown as ForecastReader;
  const market = {
    async krDailyReturnProfiles(from: Date, to: Date) {
      calls.windows.push(`${from.toISOString()}~${to.toISOString()}`);
      return [{ symbol: "005930", lastClose: 100, returns: 120, volatility: 0.02, skewness: 0.1 }];
    },
  } as unknown as MarketProbe;
  const tradePlans = {
    async listLinked() {
      return [];
    },
  } as unknown as TradePlanStore;
  const outcomes = {
    async listOwned(_userId: string, _limit: number, assetType?: string) {
      calls.outcomeAssetTypes.push(assetType);
      return storedOutcomes;
    },
  } as unknown as DecisionOutcomeStore;
  const useCase = new GetKrBehaviorMirror(
    portfolio,
    forecasts,
    market,
    tradePlans,
    outcomes,
    [OWNER],
    () => new Date("2026-10-24T03:00:00Z")
  );
  return { calls, useCase };
};

describe("GetKrBehaviorMirror", () => {
  it("소유자가 아니면 국내 주식 경로와 같은 404", async () => {
    const { useCase, calls } = setup([]);
    await assert.rejects(
      useCase.execute({ userId: "u1", viewerEmail: "other@example.com" }),
      (error: unknown) =>
        (error as { code?: string }).code === "COACH_KR_STOCK_NOT_AVAILABLE" &&
        (error as { kind?: ErrorKind }).kind === ErrorKind.NotFound
    );
    assert.equal(calls.assetTypes.length, 0, "거래를 읽기 전에 막는다");
  });

  it("국내 거래만 읽고 · 최근 1년 매수 달마다 단면을 한 번씩 묻는다", async () => {
    const { useCase, calls } = setup([
      entry("b1", "buy", "2026-09-07", 100),
      entry("b2", "buy", "2026-09-21", 100),
      entry("b3", "buy", "2026-10-05", 100),
      entry("s1", "sell", "2026-10-06", 110),
    ]);
    const view = await useCase.execute({ userId: "u1", viewerEmail: OWNER });
    assert.deepEqual(calls.assetTypes, [["kr_stock"]]);
    assert.deepEqual(calls.outcomeAssetTypes, ["kr_stock"], "저장된 결과도 국내 청산만");
    assert.deepEqual(calls.windows, [
      "2026-02-28T15:00:00.000Z~2026-08-31T15:00:00.000Z",
      "2026-03-31T15:00:00.000Z~2026-09-30T15:00:00.000Z",
    ]);
    assert.equal(view.status, "ok");
    assert.equal(view.tradeCount, 4);
    assert.equal(view.chase.mirror?.counts.measured, 3, "6월부터 봉이 있어 40거래일 창이 찬다");
    assert.equal(view.lottery.mirror?.counts.judgedBuys, 3);
    assert.equal(view.disposition?.counts.realizedGains, 1);
    assert.equal(view.chase.baseline.priorReturn.toNumber(), 0.258);
  });

  it("배치가 저장한 국내 결과로 태그 손익 · 연승 · 손실 비대칭을 센다 — 원장이 잘려도", async () => {
    const outcome = (id: string, pnl: number, tags: string[]): DecisionOutcome => ({
      id,
      userId: "u1",
      planId: null,
      closingTransactionId: id,
      symbol: "005930",
      openedAt: new Date("2026-09-07T01:00:00Z"),
      closedAt: new Date("2026-10-06T01:00:00Z"),
      holdingDays: new Decimal(29),
      quantity: new Decimal(1),
      netPnlKrw: new Decimal(pnl),
      feesKrw: new Decimal(0),
      netReturn: new Decimal(pnl / 100),
      rMultiple: null,
      benchmarkReturn: null,
      adherenceLabel: null,
      autoTags: tags,
      userTags: [],
      userTagsConfirmedAt: null,
      sampleOrigin: "live",
      computedAt: new Date("2026-10-24T00:00:00Z"),
    });
    const stored = [outcome("s1", -10, ["off_plan"]), outcome("s2", 20, [])];
    const { useCase } = setup([entry("b1", "buy", "2026-09-07", 100)], true, stored);
    const view = await useCase.execute({ userId: "u1", viewerEmail: OWNER });
    assert.equal(view.status, "truncated");
    assert.deepEqual(view.tagCosts.map((cost) => [cost.tag, cost.netPnlKrw.toNumber()]), [["off_plan", -10]]);
    assert.equal(view.outcomeCount, 2);
    assert.equal(view.lossAsymmetry.ratio.value?.toNumber(), 0.5);
    assert.equal(view.adherence, null, "원장이 잘리면 계획 연결을 믿을 수 없다");
  });

  it("거래가 상한에 잘리면 값을 만들지 않는다", async () => {
    const { useCase, calls } = setup([entry("b1", "buy", "2026-09-07", 100)], true);
    const view = await useCase.execute({ userId: "u1", viewerEmail: OWNER });
    assert.equal(view.status, "truncated");
    assert.equal(view.turnover.mirror, null);
    assert.equal(view.lottery.mirror, null);
    assert.equal(calls.windows.length, 0);
  });
});
