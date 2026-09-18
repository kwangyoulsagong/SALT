import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  PRICE_STALE_AFTER_MS,
  toWatchlistViewModels,
  type CachedPrice,
  type ServerWatchlistItem,
} from "../watchlist.viewmodel";

const NOW = new Date("2026-09-18T12:00:00.000Z");

const serverItem = (
  overrides: Partial<ServerWatchlistItem> = {},
): ServerWatchlistItem => ({
  id: "w1",
  assetType: "crypto",
  symbol: "BTC",
  name: "비트코인",
  currentPrice: 100,
  priceChange24h: 1,
  priceUpdatedAt: new Date(NOW.getTime() - 5_000).toISOString(),
  logoUrl: "https://static.upbit.com/logos/BTC.png",
  ...overrides,
});

const cache = (entries: CachedPrice[]) =>
  new Map(entries.map((entry) => [entry.symbol, entry]));

describe("toWatchlistViewModels", () => {
  it("서버 필드를 화면 이름으로 옮긴다 (priceChange24h → changeRate)", () => {
    const [vm] = toWatchlistViewModels([serverItem()], new Map(), NOW);

    assert.equal(vm.changeRate, 1);
    assert.equal(vm.currentPrice, 100);
    assert.equal(vm.priceStale, false);
  });

  /**
   * 캐시가 비어 있어도 답이 맞아야 한다 — 구독을 부르는 것은 별도 프로세스(worker)라
   * REST 만 띄우면 캐시가 늘 비어 있다. 적중으로 판정하면 그때 전부 "지연"이 된다.
   */
  it("캐시가 비어도 서버 값이 최신이면 지연이 아니다", () => {
    const [vm] = toWatchlistViewModels([serverItem()], new Map(), NOW);

    assert.equal(vm.priceStale, false);
    assert.equal(vm.currentPrice, 100);
  });

  it("임계값을 넘은 서버 값은 지연이다", () => {
    const old = new Date(
      NOW.getTime() - PRICE_STALE_AFTER_MS - 1,
    ).toISOString();

    const [vm] = toWatchlistViewModels(
      [serverItem({ priceUpdatedAt: old })],
      new Map(),
      NOW,
    );

    assert.equal(vm.priceStale, true);
    // 지연이어도 **값은 준다.** 화면이 배지로 알리고 숫자는 보여준다
    assert.equal(vm.currentPrice, 100);
  });

  it("캐시가 서버보다 새로우면 캐시 값이 이긴다", () => {
    const [vm] = toWatchlistViewModels(
      [serverItem()],
      cache([
        {
          symbol: "BTC",
          currentPrice: 999,
          change24h: 9,
          timestamp: new Date(NOW.getTime() - 1_000),
        },
      ]),
      NOW,
    );

    assert.equal(vm.currentPrice, 999);
    assert.equal(vm.changeRate, 9);
    assert.equal(vm.priceStale, false);
  });

  it("캐시가 서버보다 오래됐으면 서버 값을 유지한다", () => {
    const [vm] = toWatchlistViewModels(
      [serverItem()],
      cache([
        {
          symbol: "BTC",
          currentPrice: 999,
          change24h: 9,
          timestamp: new Date(NOW.getTime() - 30_000),
        },
      ]),
      NOW,
    );

    assert.equal(vm.currentPrice, 100);
  });

  /** 주식은 시세를 밀어 넣는 워커가 없다 (FR-42). */
  it("가격이 없으면 null 이고 지연이다 — 0 을 내려보내지 않는다", () => {
    const [vm] = toWatchlistViewModels(
      [
        serverItem({
          assetType: "stock",
          symbol: "AAPL",
          name: "애플",
          currentPrice: null,
          priceChange24h: null,
          priceUpdatedAt: null,
          logoUrl: null,
        }),
      ],
      new Map(),
      NOW,
    );

    assert.equal(vm.currentPrice, null);
    assert.equal(vm.changeRate, null);
    assert.equal(vm.priceStale, true);
    assert.equal(vm.logoUrl, null);
  });

  it("가격이 없고 캐시에 있으면 캐시로 채운다", () => {
    const [vm] = toWatchlistViewModels(
      [serverItem({ currentPrice: null, priceUpdatedAt: null })],
      cache([
        {
          symbol: "BTC",
          currentPrice: 777,
          change24h: 2,
          timestamp: new Date(NOW.getTime() - 1_000),
        },
      ]),
      NOW,
    );

    assert.equal(vm.currentPrice, 777);
    assert.equal(vm.priceStale, false);
  });

  it("심볼 대소문자가 달라도 캐시를 찾는다", () => {
    const [vm] = toWatchlistViewModels(
      [serverItem({ symbol: "btc", currentPrice: null, priceUpdatedAt: null })],
      cache([
        {
          symbol: "BTC",
          currentPrice: 555,
          change24h: 0,
          timestamp: NOW,
        },
      ]),
      NOW,
    );

    assert.equal(vm.currentPrice, 555);
  });

  it("깨진 priceUpdatedAt 은 시각 없음으로 본다", () => {
    const [vm] = toWatchlistViewModels(
      [serverItem({ priceUpdatedAt: "not-a-date" })],
      new Map(),
      NOW,
    );

    assert.equal(vm.priceUpdatedAt, null);
    assert.equal(vm.priceStale, true);
  });

  it("0건이면 빈 배열이다", () => {
    assert.deepEqual(toWatchlistViewModels([], new Map(), NOW), []);
  });
});
