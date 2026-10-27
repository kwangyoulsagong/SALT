import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { appHomeService } from "../app-home.service";
import { appPortfolioService } from "../app-portfolio.service";
import { backendApi } from "../backend-api.service";

/** F000 최소 홈 — 동면 소스 제거 · 블록별 부분 실패 (`BFF-REQ-007` B절) */

const portfolioVm = { items: [], totalKrw: 0, namesDegraded: false } as never;

describe("AppHomeService.getHome", () => {
  afterEach(() => mock.restoreAll());

  it("동면 경로(/dashboard · /investment-insight/top)를 부르지 않는다", async () => {
    mock.method(appPortfolioService, "getSummary", async () => portfolioVm);
    mock.method(backendApi, "getMarketOverview", async () => ({ items: [] }));
    const call = mock.method(backendApi, "proxyAuthRequest", async () => ({
      data: { success: true, data: { unreadCount: 3 } },
    }));

    const vm = await appHomeService.getHome("t");

    assert.deepEqual(
      call.mock.calls.map((c) => c.arguments[1]),
      ["/investment-notifications/unread-count"],
    );
    assert.equal(vm.unreadNotifications, 3);
    assert.deepEqual(vm.degradedBlocks, []);
  });

  it("한 블록이 실패해도 나머지는 내려가고 실패 블록만 null + degradedBlocks", async () => {
    mock.method(appPortfolioService, "getSummary", async () => portfolioVm);
    mock.method(backendApi, "getMarketOverview", async () => {
      throw new Error("503");
    });
    mock.method(backendApi, "proxyAuthRequest", async () => {
      throw new Error("410");
    });

    const vm = await appHomeService.getHome("t");

    assert.equal(vm.portfolio, portfolioVm);
    assert.equal(vm.unreadNotifications, null);
    assert.equal(vm.marketOverview, null);
    assert.deepEqual(vm.degradedBlocks, ["unreadNotifications", "marketOverview"]);
  });
});
