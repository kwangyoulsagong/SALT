import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { toAssetSearchVM, toTrackedCounterVM } from "../asset-search.viewmodel";
import { loggableUrl, toUpstreamClientError } from "../../utils/error.util";
import { toWatchlistViewModels } from "../watchlist.viewmodel";

describe("toAssetSearchVM — 종목 검색 화면 계약(BFF-REQ-007 H절)", () => {
  it("서버 값을 그대로 옮긴다 — isTracked · isHeld · tracked 를 다시 계산하지 않는다", () => {
    const vm = toAssetSearchVM({
      items: [
        { assetType: "kr_stock", symbol: "005930", name: "삼성전자", logoUrl: null, currentPrice: 71000, changeRate: -1.2, isTracked: true, isHeld: true },
      ],
      tracked: { count: 3, limit: 10 },
    });
    assert.deepEqual(vm, {
      items: [
        { assetType: "kr_stock", symbol: "005930", name: "삼성전자", logoUrl: null, currentPrice: 71000, changeRate: -1.2, isTracked: true, isHeld: true },
      ],
      tracked: { count: 3, limit: 10 },
    });
  });

  it("가격이 없으면 null — 0 을 만들지 않는다 · 심볼 없는 행은 버린다", () => {
    const vm = toAssetSearchVM({
      items: [{ assetType: "crypto", symbol: "NEW", name: "신규", currentPrice: null }, { assetType: "crypto" }],
    });
    assert.equal(vm.items.length, 1);
    assert.equal(vm.items[0]!.currentPrice, null);
    assert.equal(vm.items[0]!.changeRate, null);
    assert.equal(vm.items[0]!.isTracked, false);
    assert.equal(vm.tracked, null);
  });

  it("카운터는 정수 둘일 때만 — 지어내지 않는다", () => {
    assert.equal(toTrackedCounterVM({ count: "3", limit: 10 }), null);
    assert.equal(toTrackedCounterVM(undefined), null);
  });
});

describe("추적 상한 409 전달(FR-73)", () => {
  it("trackedCount · trackedLimit 을 옮긴다", () => {
    const upstream = toUpstreamClientError({
      response: { status: 409, data: { code: "TRACKED_ASSET_LIMIT", message: "x", trackedCount: 10, trackedLimit: 10 } },
    });
    assert.deepEqual(upstream, { status: 409, code: "TRACKED_ASSET_LIMIT", message: "x", trackedCount: 10, trackedLimit: 10 });
  });
});

describe("loggableUrl — 검색어를 로그에 남기지 않는다", () => {
  it("q 값만 가린다", () => {
    assert.equal(loggableUrl("/api/app/search?q=%EC%82%BC%EC%84%B1&limit=20"), "/api/app/search?q=*&limit=20");
    assert.equal(loggableUrl("/api/app/search?limit=5&q=btc"), "/api/app/search?limit=5&q=*");
    assert.equal(loggableUrl("/api/app/market/overview?limit=100"), "/api/app/market/overview?limit=100");
  });
});

describe("관심 종목 isHeld (FE-REQ-011 FR-7)", () => {
  it("서버 값 그대로 · 없으면 false", () => {
    const base = { id: "w", assetType: "crypto", symbol: "BTC", name: "비트코인", currentPrice: 1, priceChange24h: 0, priceUpdatedAt: null, logoUrl: null };
    const vms = toWatchlistViewModels([{ ...base, isHeld: true }, { ...base, id: "w2" }], new Map(), new Date());
    assert.deepEqual(vms.map((vm) => vm.isHeld), [true, false]);
  });
});
