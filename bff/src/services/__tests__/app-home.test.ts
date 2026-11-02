import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { appHomeService } from "../app-home.service";
import { appPortfolioService } from "../app-portfolio.service";
import { backendApi } from "../backend-api.service";
import { HOME_CARD_TIMEOUT_MS } from "../home-card.viewmodel";

/** 셸 홈 — 도메인 요약 카드 · 카드별 부분 실패 (`BFF-REQ-046` FR-1~4) */

const portfolio = (items: unknown[], totalKrw: number) =>
  ({ items, totalKrw, fxRateUsed: null, fxBasisCode: null, namesDegraded: false }) as never;

const goalStats = (data: Record<string, number>) => ({ data: { success: true, data } }) as never;

describe("AppHomeService.getHome", () => {
  afterEach(() => mock.restoreAll());

  it("저축 · 투자 카드를 서버 숫자의 표시 문자열로 낸다 — 기본 순서 저축 → 투자", async () => {
    mock.method(backendApi, "proxyAuthRequest", async () =>
      goalStats({ totalGoals: 3, activeGoals: 2, completedGoals: 1, totalSaved: 1234567 }),
    );
    mock.method(appPortfolioService, "getSummary", async () => portfolio([{}, {}], 9876543.4));

    const vm = await appHomeService.getHome("t");

    assert.deepEqual(vm.order, ["savings", "invest"]);
    assert.deepEqual(vm.hidden, []);
    const [savings, invest] = vm.cards;
    assert.equal(savings.state, "ok");
    assert.deepEqual(savings.primary, { label: "모은 돈", value: "1,234,567원" });
    assert.deepEqual(savings.secondary, { label: "진행 중인 목표", value: "2개" });
    assert.equal(invest.state, "ok");
    assert.deepEqual(invest.primary, { label: "보유 평가", value: "9,876,543원" });
    assert.deepEqual(invest.secondary, { label: "보유 종목", value: "2개" });
  });

  it("목표 · 보유가 없으면 empty — 0원을 그리지 않는다", async () => {
    mock.method(backendApi, "proxyAuthRequest", async () => goalStats({ totalGoals: 0, totalSaved: 0 }));
    mock.method(appPortfolioService, "getSummary", async () => portfolio([], 0));

    const vm = await appHomeService.getHome("t");

    assert.deepEqual(
      vm.cards.map((c) => [c.domain, c.state, c.primary?.value]),
      [
        ["savings", "empty", "아직 없어요"],
        ["invest", "empty", "기록이 없어요"],
      ],
    );
  });

  it("한 도메인이 실패해도 홈은 뜨고 그 카드만 degraded(값 null)", async () => {
    mock.method(backendApi, "proxyAuthRequest", async () => {
      throw new Error("503");
    });
    mock.method(appPortfolioService, "getSummary", async () => portfolio([{}], 100));

    const vm = await appHomeService.getHome("t");

    const savings = vm.cards.find((c) => c.domain === "savings")!;
    assert.equal(savings.state, "degraded");
    assert.equal(savings.primary, null);
    assert.equal(savings.href, "/goals/addgoals");
    assert.equal(vm.cards.find((c) => c.domain === "invest")!.state, "ok");
  });

  it(`카드 하나가 ${HOME_CARD_TIMEOUT_MS}ms 를 넘기면 그 카드만 degraded`, async () => {
    mock.method(backendApi, "proxyAuthRequest", async () => goalStats({ totalGoals: 1, activeGoals: 1, totalSaved: 10 }));
    mock.method(
      appPortfolioService,
      "getSummary",
      () => new Promise((resolve) => setTimeout(() => resolve(portfolio([{}], 1)), HOME_CARD_TIMEOUT_MS + 200)),
    );

    const started = Date.now();
    const vm = await appHomeService.getHome("t");

    assert.ok(Date.now() - started < HOME_CARD_TIMEOUT_MS + 150, "가장 느린 카드를 기다리지 않는다");
    assert.equal(vm.cards.find((c) => c.domain === "invest")!.state, "degraded");
    assert.equal(vm.cards.find((c) => c.domain === "savings")!.state, "ok");
  });

  it("카드에 손익률을 싣지 않는다 — 매입가 숨김(F009 FR-27)을 홈에서 깨지 않게", async () => {
    mock.method(backendApi, "proxyAuthRequest", async () => goalStats({ totalGoals: 0 }));
    mock.method(appPortfolioService, "getSummary", async () =>
      portfolio([{ symbol: "BTC", profitRate: 12.3, currentValue: 1 }], 1),
    );

    const vm = await appHomeService.getHome("t");

    assert.ok(!JSON.stringify(vm).includes("12.3"));
    assert.ok(!JSON.stringify(vm).includes("%"));
  });
});
