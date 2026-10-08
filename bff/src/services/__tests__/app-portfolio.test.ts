import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { appPortfolioService } from "../app-portfolio.service";
import { backendApi } from "../backend-api.service";

/** 보유 요약 — 국내 주식 이름 · 로고(F011 슬라이스 3b · `BFF-REQ-040` FR-15) */

const ok = (data: unknown) => ({ data: { success: true, data } }) as never;
const summary = (items: Array<{ symbol: string; assetType: string }>) =>
  ok({
    items: items.map((i) => ({ ...i, currentValue: 1_000, profitRate: 1 })),
    totalKrw: 2_000,
    fxRateUsed: null,
    fxBasisCode: null,
  });

describe("AppPortfolioService.getSummary — 국내 주식", () => {
  afterEach(() => mock.restoreAll());

  it("국내 주식 보유가 없으면 국내 주식 목록을 부르지 않는다", async () => {
    mock.method(backendApi, "getMarketOverview", async () => ({ items: [{ symbol: "BTC", koreanName: "비트코인" }] }));
    const call = mock.method(backendApi, "proxyAuthRequest", async () => summary([{ symbol: "BTC", assetType: "crypto" }]));
    const vm = await appPortfolioService.getSummary("t");
    assert.equal(call.mock.callCount(), 1);
    assert.equal(vm.items[0]?.name, "비트코인");
    assert.equal(vm.namesDegraded, false);
  });

  it("국내 주식은 코드 필터로 이름 · 로고를 붙인다", async () => {
    mock.method(backendApi, "getMarketOverview", async () => ({ items: [{ symbol: "BTC", koreanName: "비트코인" }] }));
    const call = mock.method(backendApi, "proxyAuthRequest", async (_m: string, url: string) =>
      url === "/portfolio/summary"
        ? summary([
            { symbol: "BTC", assetType: "crypto" },
            { symbol: "005930", assetType: "kr_stock" },
          ])
        : ok({ items: [{ code: "005930", name: "삼성전자", logoUrl: "https://img.logo.dev/x" }] }),
    );
    const vm = await appPortfolioService.getSummary("t");
    assert.equal(call.mock.calls[1]?.arguments[1], "/market/kr/assets?limit=1&codes=005930");
    assert.deepEqual(
      vm.items.map((i) => [i.symbol, i.name, i.logoUrl]),
      [
        ["BTC", "비트코인", null],
        ["005930", "삼성전자", "https://img.logo.dev/x"],
      ],
    );
    assert.equal(vm.namesDegraded, false);
  });

  it("국내 주식 조회가 실패해도 금액은 내려가고 코드가 이름 자리 · namesDegraded", async () => {
    mock.method(backendApi, "getMarketOverview", async () => ({ items: [] }));
    mock.method(backendApi, "proxyAuthRequest", async (_m: string, url: string) => {
      if (url === "/portfolio/summary") return summary([{ symbol: "005930", assetType: "kr_stock" }]);
      throw Object.assign(new Error("503"), { response: { status: 503 } });
    });
    const vm = await appPortfolioService.getSummary("t");
    assert.equal(vm.items[0]?.name, "005930");
    assert.equal(vm.items[0]?.currentValue, 1_000);
    assert.equal(vm.namesDegraded, true);
  });
});
