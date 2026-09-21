import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isMarketOverviewPeriod,
  MarketOverviewPeriod,
  periodBaseline,
  periodChange,
  rankByPeriodChange,
} from "../index";

const NOW = new Date("2026-09-21T03:00:00Z");
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

describe("periodBaseline", () => {
  it("실시간은 기준을 찾지 않는다 — 거래소 24시간 변동률이 곧 값이다", () => {
    assert.equal(periodBaseline(MarketOverviewPeriod.Realtime, NOW), null);
  });

  it("1일은 5분봉 롤링 24시간이다. 기준 캔들이 24시간 전까지 **닫혀 있어야** 한다", () => {
    const b = periodBaseline(MarketOverviewPeriod.OneDay, NOW)!;
    assert.equal(b.timeframe, "5m");
    // 시작이 24시간 5분 전 이하 → 종가가 24시간 전 이하
    assert.equal(b.candleStartAtOrBefore.getTime(), NOW.getTime() - DAY - 5 * 60 * 1000);
    assert.equal(
      b.candleStartAtOrBefore.getTime() - b.candleStartNotBefore.getTime(),
      30 * 60 * 1000
    );
  });

  it("1주~1년은 일봉이고, 수집이 빠졌으면 3일보다 먼 과거와 비교하지 않는다", () => {
    const spans: Array<[MarketOverviewPeriod, number]> = [
      [MarketOverviewPeriod.OneWeek, 7],
      [MarketOverviewPeriod.OneMonth, 30],
      [MarketOverviewPeriod.ThreeMonths, 91],
      [MarketOverviewPeriod.SixMonths, 182],
      [MarketOverviewPeriod.OneYear, 365],
    ];
    for (const [period, days] of spans) {
      const b = periodBaseline(period, NOW)!;
      assert.equal(b.timeframe, "1d", period);
      assert.equal(b.candleStartAtOrBefore.getTime(), NOW.getTime() - (days + 1) * DAY, period);
      assert.equal(b.candleStartNotBefore.getTime(), NOW.getTime() - (days + 4) * DAY, period);
    }
  });
});

describe("periodChange", () => {
  it("기준 종가 대비 % 다", () => {
    assert.equal(periodChange(110, 100), 10);
    assert.equal(periodChange(90, 100), -10);
  });

  it("기준이 없거나 0 이하면 null 이다 — 24시간 값으로 채우지 않는다", () => {
    assert.equal(periodChange(100, undefined), null);
    assert.equal(periodChange(100, 0), null);
    // 현재가 0 은 저장소가 null 을 0 으로 떨어뜨린 값이다(원문 동작). -100% 가 아니다
    assert.equal(periodChange(0, 100), null);
  });
});

describe("rankByPeriodChange", () => {
  const rows = [
    { symbol: "A", periodChange: 5, tradeValue24h: 1 },
    { symbol: "N1", periodChange: null, tradeValue24h: 50 },
    { symbol: "B", periodChange: -3, tradeValue24h: 1 },
    { symbol: "C", periodChange: 5, tradeValue24h: 9 },
    { symbol: "N2", periodChange: null, tradeValue24h: 80 },
  ];

  it("내림차순. 같은 값은 거래대금 순, 값이 없는 종목은 뒤로", () => {
    assert.deepEqual(
      rankByPeriodChange(rows, "desc").map((r) => r.symbol),
      ["C", "A", "B", "N2", "N1"]
    );
  });

  it("오름차순에서도 값이 없는 종목은 **뒤**다 — 첫 화면이 '—' 로 채워지지 않는다", () => {
    assert.deepEqual(
      rankByPeriodChange(rows, "asc").map((r) => r.symbol),
      ["B", "C", "A", "N2", "N1"]
    );
  });

  it("입력을 바꾸지 않는다", () => {
    const before = rows.map((r) => r.symbol);
    rankByPeriodChange(rows, "asc");
    assert.deepEqual(rows.map((r) => r.symbol), before);
  });
});

describe("isMarketOverviewPeriod", () => {
  it("화면 필터 7개의 값만 받는다. 빈 문자열은 여기서 받지 않는다(presentation 이 번역)", () => {
    for (const v of ["realtime", "1d", "7d", "1m", "3m", "6m", "1y"]) {
      assert.equal(isMarketOverviewPeriod(v), true, v);
    }
    for (const v of ["", "1w", "12m", "week", undefined, 7]) {
      assert.equal(isMarketOverviewPeriod(v), false, String(v));
    }
  });
});
