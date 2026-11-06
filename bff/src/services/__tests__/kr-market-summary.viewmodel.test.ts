import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { KrContractError, toKrMarketSummaryVM } from "../kr-stock.viewmodel";

/** 국내 요약 띠 뷰모델(`BFF-REQ-044`). 서버 응답 모양은 `salt-server` `GetKrMarketSummary` + 컨트롤러 반올림 그대로(2026-11-02 실측 값) */

const item = (over: Record<string, unknown> = {}) => ({
  symbol: "0001",
  kind: "index",
  koreanName: "코스피",
  logoUrl: null,
  currentPrice: 5872.32,
  change24h: 2.47,
  change24hAmount: 141.58,
  tags: [],
  sparkline: [5700, 5750, 5872.32],
  high24h: 5907.21,
  low24h: 5616.5,
  tradeValue24h: 11260878000000,
  priceUpdatedAt: "2026-11-02T05:06:00.000Z",
  ...over,
});
const summary = (over: Record<string, unknown> = {}) => ({
  assetClass: "kr_stock",
  changeBasis: "prev_close",
  featured: item(),
  items: [
    item({ symbol: "1001", koreanName: "코스닥", tags: ["wide_move", "unknown_tag"] }),
    item({ symbol: "005930", kind: "stock", koreanName: "삼성전자", logoUrl: "https://img/x.png", currentPrice: 229500, change24hAmount: 4500, sparkline: [1], high24h: null }),
  ],
  sparklineWindowMinutes: 390,
  sparklineDate: "2026-11-02",
  breadth: { up: 1718, flat: 96, down: 837, total: 2651 },
  headlines: [],
  schedule: [
    { kind: "kr_cpi", eventAt: "2026-11-02T23:00:00.000Z", daysUntil: 1 },
    { kind: "unknown", eventAt: "2026-11-03T00:00:00.000Z", daysUntil: 1 },
  ],
  degraded: true,
  ...over,
});

describe("toKrMarketSummaryVM", () => {
  it("코인 칸과 같은 이름으로 옮기고 금액은 서버 값 그대로", () => {
    const vm = toKrMarketSummaryVM(summary());
    assert.equal(vm.assetClass, "kr_stock");
    assert.equal(vm.changeBasis, "prev_close");
    assert.equal(vm.featured?.name, "코스피");
    assert.equal(vm.featured?.change24hAmount, 141.58);
    assert.equal(vm.featured?.logoUrl, null);
    assert.equal(vm.items[1]?.kind, "stock");
    assert.equal(vm.items[1]?.change24hAmount, 4500);
  });

  it("모르는 태그 · 일정 종류는 버리고, 점 하나 선은 null, 없는 고가는 null 그대로(0 이 아니다)", () => {
    const vm = toKrMarketSummaryVM(summary());
    assert.deepEqual(vm.items[0]?.tags, ["wide_move"]);
    assert.equal(vm.items[1]?.sparkline, null);
    assert.equal(vm.items[1]?.high24h, null);
    assert.deepEqual(vm.schedule.map((s) => s.kind), ["kr_cpi"]);
  });

  it("서버 degraded 를 지우지 않는다 · 뉴스는 늘 빈 배열", () => {
    const vm = toKrMarketSummaryVM(summary());
    assert.equal(vm.degraded, true);
    assert.deepEqual(vm.headlines, []);
  });

  it("분위기 합이 0 이면 null", () => {
    assert.equal(toKrMarketSummaryVM(summary({ breadth: { up: 0, flat: 0, down: 0, total: 0 } })).breadth, null);
    assert.equal(toKrMarketSummaryVM(summary({ breadth: null })).breadth, null);
  });

  it("계약이 깨지면 던진다 — 자산군이 다르거나 가격이 없으면", () => {
    assert.throws(() => toKrMarketSummaryVM(summary({ assetClass: "crypto" })), KrContractError);
    assert.throws(() => toKrMarketSummaryVM(summary({ featured: item({ currentPrice: null }) })), KrContractError);
    assert.throws(() => toKrMarketSummaryVM(summary({ items: [item({ kind: "etf" })] })), KrContractError);
  });
});

describe("국내 요약 띠 시장 조치(F016 단계 A · BFF-REQ-051 FR-2)", () => {
  it("서버 marketActions 를 그대로 · 없는 옛 서버는 빈 배열", () => {
    const cb = {
      market: "KOSPI", kind: "circuit_breaker", stage: 1, direction: "down", startedAt: "2026-11-06T00:04:00.000Z",
      endedAt: "2026-11-06T00:34:00.000Z", resumesAt: "2026-11-06T00:24:00.000Z", source: "inferred", active: false,
    };
    const base = toKrMarketSummaryVM(summary());
    assert.deepEqual(base.marketActions, []);
    assert.deepEqual(toKrMarketSummaryVM(summary({ marketActions: [cb] })).marketActions, [cb]);
  });
});
