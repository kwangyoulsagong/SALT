import assert from "node:assert/strict";
import { describe, it } from "node:test";

import Decimal from "decimal.js";

import type { CoachLedgerEntry, TagCost } from "..";
import { edgeWarningsFor, previewBuyTags, replayLedger, sellFramingFor, sortLedgerAscending } from "..";

/**
 * 입력 중 미리보기 (`SRV-REQ-038` FR-12) — 배치와 같은 규칙인가 · 엣지 없음만 걸러지는가 · 남은 매수의 계획만 보는가.
 */

const tx = (id: string, side: "buy" | "sell", iso: string, price: number, quantity = 1): CoachLedgerEntry => ({
  id,
  symbol: "BTC",
  side,
  quantity,
  price,
  totalAmount: price * quantity,
  fee: 0,
  transactionDate: new Date(iso),
});

const NOW = new Date("2026-03-01T12:00:00Z");

const preview = (entries: CoachLedgerEntry[], price: number, overrides: { high?: number | null; hasPlan?: boolean } = {}) =>
  previewBuyTags({
    entries,
    symbol: "btc",
    quantity: new Decimal(1),
    price: new Decimal(price),
    fee: new Decimal(0),
    at: NOW,
    highBefore: overrides.high === undefined ? new Decimal(1000) : overrides.high === null ? null : new Decimal(overrides.high),
    hasPlan: overrides.hasPlan ?? true,
  });

describe("previewBuyTags", () => {
  it("48시간 최고가의 98% 이상이면 추격", () => {
    assert.deepEqual(preview([], 980).tags, ["chasing"]);
    assert.deepEqual(preview([], 979).tags, []);
  });

  it("최고가를 모르면 추격을 판정하지 않고 모른다고 알린다", () => {
    const result = preview([], 5000, { high: null });
    assert.deepEqual(result.tags, []);
    assert.equal(result.chasingUnknown, true);
  });

  it("들고 있는 평단보다 싸게 사면 물타기 — 배치와 같은 되감기", () => {
    const entries = [tx("b1", "buy", "2026-02-01T00:00:00Z", 900)];
    assert.deepEqual(preview(entries, 800).tags, ["averaging_down"]);
    assert.deepEqual(preview(entries, 950).tags, []);
  });

  it("손실 청산 24시간 안의 재매수는 복수", () => {
    const entries = [tx("b1", "buy", "2026-02-01T00:00:00Z", 900), tx("s1", "sell", "2026-03-01T06:00:00Z", 700)];
    assert.deepEqual(preview(entries, 700).tags, ["revenge"]);
  });

  it("계획이 없으면 계획 외", () => {
    assert.deepEqual(preview([], 500, { hasPlan: false }).tags, ["off_plan"]);
  });
});

const cost = (tag: string, noEdge: boolean): TagCost => ({
  tag,
  count: 25,
  netPnlKrw: new Decimal(-1000),
  avgReturn: new Decimal(-0.02),
  avgR: null,
  rSampleSize: 0,
  status: "ok",
  noEdge,
});

describe("edgeWarningsFor", () => {
  it("후보 태그 중 엣지 없음만 남긴다", () => {
    const costs = [cost("chasing", true), cost("off_plan", false), cost("revenge", true)];
    assert.deepEqual(
      edgeWarningsFor(["chasing", "off_plan"], costs).map((warning) => warning.tag),
      ["chasing"]
    );
  });
});

describe("sellFramingFor", () => {
  const plan = (id: string, transactionId: string, createdAt: string, stop: number | null) => ({
    id,
    transactionId,
    side: "buy" as const,
    stopPrice: stop === null ? null : new Decimal(stop),
    createdAt: new Date(createdAt),
  });

  it("아직 남은 매수에 연결된 최신 계획의 손절가만 쓴다 — 다 판 포지션의 옛 손절가는 안 본다", () => {
    const replay = replayLedger(
      sortLedgerAscending([
        tx("b1", "buy", "2026-01-01T00:00:00Z", 100),
        tx("s1", "sell", "2026-01-05T00:00:00Z", 120),
        tx("b2", "buy", "2026-02-01T00:00:00Z", 110),
      ])
    );
    const framing = sellFramingFor(
      "btc",
      replay,
      [plan("p-old", "b1", "2026-01-01T00:00:00Z", 90), plan("p-new", "b2", "2026-02-01T00:00:00Z", 100)],
      new Decimal(130)
    );
    assert.equal(framing.planId, "p-new");
    assert.equal(framing.stopPrice?.toNumber(), 100);
    assert.equal(framing.currentPrice?.toNumber(), 130);
  });

  it("손절가 없는 계획 · 계획 없음이면 손절가 null, 현재가는 그대로", () => {
    const replay = replayLedger([tx("b1", "buy", "2026-01-01T00:00:00Z", 100)]);
    const framing = sellFramingFor("BTC", replay, [plan("p1", "b1", "2026-01-01T00:00:00Z", null)], new Decimal(99));
    assert.deepEqual(framing, { planId: null, stopPrice: null, currentPrice: new Decimal(99) });
  });
});
