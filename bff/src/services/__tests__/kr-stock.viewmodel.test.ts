import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  KrContractError,
  toKrChartVM,
  toKrDetailVM,
  toKrMarketStatusVM,
  toKrOverviewVM,
  toKrPriceUpdate,
  toKrSearchVM,
} from "../kr-stock.viewmodel";

/** 국내 주식 뷰모델 (F011 · `BFF-REQ-040`). 서버 응답 모양은 `salt-server` `ReadKrStock.ts` 그대로 */

const session = {
  session: "closed",
  now: "2026-10-08T12:00:00.000Z",
  lastCloseAt: "2026-10-08T06:30:00.000Z",
  nextOpenAt: "2026-10-09T00:00:00.000Z",
  calendarKnown: true,
};

const quote = (over: Record<string, unknown> = {}) => ({
  code: "005930",
  name: "삼성전자",
  market: "KOSPI",
  price: 286_500,
  change: 3_500,
  changeRate: 1.24,
  volume: "12345678",
  tradeValue: 3_500_000_000_000,
  marketCap: 1_700_000_000_000_000,
  basePrice: 283_000,
  upperLimit: 367_500,
  lowerLimit: 198_500,
  openPrice: 284_000,
  highPrice: 287_000,
  lowPrice: 283_500,
  limitState: null,
  status: [],
  isHalted: false,
  feed: "realtime",
  priceUpdatedAt: "2026-10-08T06:30:00.000Z",
  logoUrl: "https://financialmodelingprep.com/image-stock/005930.KS.png",
  ...over,
});

describe("toKrMarketStatusVM", () => {
  it("장 상태 + KIS 상태. 슬롯 수(운영 정보)는 옮기지 않는다", () => {
    const vm = toKrMarketStatusVM({
      ...session,
      provider: {
        status: "degraded",
        since: "2026-10-08T05:00:00.000Z",
        lastSuccessAt: "2026-10-08T04:59:00.000Z",
        realtime: { state: "open", subscribed: 41, lastTickAt: "2026-10-08T06:29:59.000Z" },
      },
    });
    assert.deepEqual(vm, {
      ...session,
      provider: {
        status: "degraded",
        since: "2026-10-08T05:00:00.000Z",
        lastSuccessAt: "2026-10-08T04:59:00.000Z",
        realtime: { state: "open", lastTickAt: "2026-10-08T06:29:59.000Z" },
      },
    });
  });

  it("모르는 장 상태는 계약 깨짐 — 화면 분기가 그 값에 걸려 있다", () => {
    assert.throws(
      () => toKrMarketStatusVM({ ...session, session: "lunch", provider: { status: "ok", since: null, lastSuccessAt: null, realtime: { state: "idle", lastTickAt: null } } }),
      KrContractError,
    );
  });
});

describe("toKrQuoteVM logoUrl", () => {
  it("로고 주소가 없는 옛 서버 응답은 null — 계약 깨짐으로 보지 않는다", () => {
    const { logoUrl: _omit, ...withoutLogo } = quote();
    const vm = toKrOverviewVM({ session, items: [withoutLogo], nextOffset: null });
    assert.equal(vm.items[0]!.logoUrl, null);
  });
});

describe("toKrOverviewVM", () => {
  it("필드를 골라 옮긴다 — 서버가 늘린 필드는 화면 계약에 새지 않는다", () => {
    const vm = toKrOverviewVM({
      session,
      items: [quote({ per: 12.3, rawKis: { stck_prpr: "286500" }, periodChange: 3.2 })],
      nextOffset: 50,
    });
    assert.equal(vm.items.length, 1);
    assert.deepEqual(vm.items[0], { ...quote(), periodChange: 3.2 });
    assert.equal(vm.nextOffset, 50);
    assert.deepEqual(vm.session, session);
  });

  it("상태 배지는 아는 것만 — 모르는 배지는 화면에 문구가 없다", () => {
    const vm = toKrOverviewVM({ session, items: [quote({ status: ["halted", "delisting_soon", "caution"] })], nextOffset: null });
    assert.deepEqual(vm.items[0]!.status, ["halted", "caution"]);
  });

  it("가격이 없으면 0 으로 채우지 않고 계약 깨짐 — 0원은 '가격이 0원'으로 읽힌다", () => {
    assert.throws(() => toKrOverviewVM({ session, items: [quote({ price: null })], nextOffset: null }), KrContractError);
    assert.throws(() => toKrOverviewVM({ session, items: [quote({ feed: "push" })], nextOffset: null }), KrContractError);
  });

  it("값이 없는 금액(시총 · 상하한)은 null 그대로", () => {
    const vm = toKrOverviewVM({ session, items: [quote({ marketCap: null, upperLimit: null, lowerLimit: null })], nextOffset: null });
    assert.equal(vm.items[0]!.marketCap, null);
    assert.equal(vm.items[0]!.upperLimit, null);
  });

  it("당일 시 · 고 · 저 · 기간 변동률이 없으면 null — 옛 서버(필드 없음)도 계약 깨짐이 아니다", () => {
    const { openPrice: _o, highPrice: _h, lowPrice: _l, ...old } = quote();
    const vm = toKrOverviewVM({ session, items: [old], nextOffset: null });
    assert.deepEqual([vm.items[0]!.openPrice, vm.items[0]!.highPrice, vm.items[0]!.lowPrice, vm.items[0]!.periodChange], [null, null, null, null]);
  });
});

describe("toKrDetailVM · toKrChartVM · toKrSearchVM", () => {
  it("상세 — 호가 단위는 서버 값", () => {
    const detail = { per: 12.3, pbr: 1.4, eps: 6_000, bps: 55_000, week52High: 300_000, week52Low: 180_000, foreignRate: 51.2, tickSize: 500 };
    const vm = toKrDetailVM({ session, quote: quote({ limitState: "upper" }), detail });
    assert.equal(vm.detail.tickSize, 500);
    assert.equal(vm.quote.limitState, "upper");
  });

  it("차트 — 몇 거래일치인지 함께(5분봉 쌓이는 중)", () => {
    const vm = toKrChartVM({
      period: "5m",
      candles: [{ timestamp: "2026-10-08T00:00:00.000Z", open: 1, high: 2, low: 1, close: 2, volume: 10 }],
      coverage: { from: "2026-10-08T00:00:00.000Z", to: "2026-10-08T00:00:00.000Z", tradingDays: 1 },
    });
    assert.equal(vm.coverage.tradingDays, 1);
    assert.equal(vm.candles.length, 1);
  });

  it("차트 — 봉이 없으면 coverage from/to null", () => {
    const vm = toKrChartVM({ period: "1d", candles: [], coverage: { from: null, to: null, tradingDays: 0 } });
    assert.deepEqual(vm.coverage, { from: null, to: null, tradingDays: 0 });
  });

  it("검색 — 수집 유니버스 안인지 함께", () => {
    const vm = toKrSearchVM({ items: [{ code: "005930", name: "삼성전자", market: "KOSPI", inUniverse: true }] });
    assert.deepEqual(vm.items, [{ code: "005930", name: "삼성전자", market: "KOSPI", inUniverse: true }]);
  });
});

describe("toKrPriceUpdate", () => {
  it("체결 → 코인과 같은 price_update 필드 + assetType", () => {
    assert.deepEqual(
      toKrPriceUpdate({ code: "005930", price: 286_500, change: 3_500, changeRate: 1.24, volume: "1", at: "2026-10-08T01:00:00.000Z" }),
      {
        assetType: "kr_stock",
        symbol: "005930",
        currentPrice: 286_500,
        change24h: 1.24,
        change24hAmount: 3_500,
        timestamp: "2026-10-08T01:00:00.000Z",
      },
    );
  });

  it("모양이 틀린 체결은 null — 던지지 않는다", () => {
    assert.equal(toKrPriceUpdate({ code: "005930", price: "286500" }), null);
    assert.equal(toKrPriceUpdate(null), null);
  });
});
