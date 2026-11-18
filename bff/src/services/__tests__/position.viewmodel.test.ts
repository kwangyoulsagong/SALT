import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { toPositionOverviewViewModel, type ServerPositionOverview } from "../position.viewmodel";

const server = (patch: Partial<ServerPositionOverview> = {}): ServerPositionOverview => ({
  empty: false,
  hero: {
    totalValueKrw: 1_000_000,
    unrealizedProfitKrw: -50_000,
    unrealizedProfitRatePct: null,
    investedKrw: 1_050_000,
    holdingsCount: 2,
    topWeight: { symbol: "BTC", assetType: "crypto", pct: 72.5 },
    return30dPct: null,
  },
  radar: [
    { key: "concentration", value: 72.5, raw: 72.5, limit: 60, breached: true, reasonCode: "over_limit", subject: "BTC" },
    { key: "news", value: null, raw: null, limit: 40, breached: false, reasonCode: "insufficient_data", subject: null },
  ],
  degraded: true,
  degradedReasons: ["missing_close"],
  ...patch,
});

describe("toPositionOverviewViewModel", () => {
  it("null 을 0 으로 바꾸지 않는다 — 수익률 · 레이더 값", () => {
    const vm = toPositionOverviewViewModel(server(), new Map(), false);
    assert.equal(vm.hero?.unrealizedProfitRatePct, null);
    assert.equal(vm.hero?.return30dPct, null);
    assert.equal(vm.radar?.[1].value, null);
  });

  it("서버 degraded 를 지우지 않고 전달한다", () => {
    const vm = toPositionOverviewViewModel(server(), new Map(), false);
    assert.equal(vm.degraded, true);
    assert.deepEqual(vm.degradedReasons, ["missing_close"]);
  });

  it("이름이 있으면 붙이고, 없으면 심볼을 이름 자리에", () => {
    const named = toPositionOverviewViewModel(server(), new Map([["BTC", { name: "비트코인", logoUrl: "https://x/btc.png" }]]), false);
    assert.equal(named.hero?.topWeight?.name, "비트코인");
    assert.equal(named.radar?.[0].subjectName, "비트코인");
    const bare = toPositionOverviewViewModel(server(), new Map(), true);
    assert.equal(bare.hero?.topWeight?.name, "BTC");
    assert.equal(bare.hero?.topWeight?.logoUrl, null);
    assert.equal(bare.namesDegraded, true);
  });

  it("모르는 축 키는 싣지 않는다", () => {
    const vm = toPositionOverviewViewModel(
      server({ radar: [{ key: "cash" as never, value: 10, raw: 10, limit: 50, breached: false, reasonCode: "within_limit", subject: null }] }),
      new Map(),
      false,
    );
    assert.deepEqual(vm.radar, []);
  });

  it("보유 0 이면 hero · radar 가 null 그대로", () => {
    const vm = toPositionOverviewViewModel(server({ empty: true, hero: null, radar: null, degraded: false, degradedReasons: [] }), new Map(), false);
    assert.equal(vm.empty, true);
    assert.equal(vm.hero, null);
    assert.equal(vm.radar, null);
  });
});
