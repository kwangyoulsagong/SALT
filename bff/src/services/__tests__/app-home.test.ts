import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { appAICoachService } from "../app-ai-coach.service";
import { appHomeService } from "../app-home.service";
import { appPortfolioService } from "../app-portfolio.service";
import { backendApi } from "../backend-api.service";
import { HOME_CARD_TIMEOUT_MS } from "../home-card.viewmodel";

/** 셸 홈 — 도메인 요약 카드 · 카드별 부분 실패 (`BFF-REQ-046` FR-1~4) */

const portfolio = (items: unknown[], totalKrw: number) =>
  ({ items, totalKrw, fxRateUsed: null, fxBasisCode: null, namesDegraded: false }) as never;

const goalStats = (data: Record<string, number>) => ({ data: { success: true, data } }) as never;

/** 서버 경로별 응답 — `/goals/statistics` 와 `/portfolio/stats` 를 같은 목으로 받는다 */
const byPath =
  (goals: Record<string, number>, profitRate: number | null = 12.34) =>
  async (_method: string, url: string) => {
    if (url === "/portfolio/stats") {
      if (profitRate === null) throw new Error("503");
      return { data: { success: true, data: { profitRate } } } as never;
    }
    return goalStats(goals);
  };

const profile = (hidePurchasePrice: boolean) => async () => ({ hidePurchasePrice }) as never;

describe("AppHomeService.getHome", () => {
  afterEach(() => mock.restoreAll());
  // 기본: 매입가 숨김 켬 — 손익률 칸이 없는 쪽. 손익률 케이스는 아래에서 따로 바꾼다
  const hideByDefault = () => mock.method(appAICoachService, "getProfile", profile(true));

  it("저축 · 투자 카드를 서버 숫자의 표시 문자열로 낸다 — 기본 순서 저축 → 투자", async () => {
    hideByDefault();
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
    hideByDefault();
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
    hideByDefault();
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

  it("인증 거절(401)은 카드 degraded 가 아니라 홈 전체 401 — 프론트가 토큰 갱신 · 로그인으로 간다", async () => {
    hideByDefault();
    const unauthorized = Object.assign(new Error("401"), { response: { status: 401 } });
    mock.method(backendApi, "proxyAuthRequest", async () => {
      throw unauthorized;
    });
    mock.method(appPortfolioService, "getSummary", async () => {
      throw unauthorized;
    });

    await assert.rejects(appHomeService.getHome("t"), (error) => error === unauthorized);
  });

  it(`카드 하나가 ${HOME_CARD_TIMEOUT_MS}ms 를 넘기면 그 카드만 degraded`, async () => {
    hideByDefault();
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

  it("매입가 숨김을 끈 사람 — 투자 카드 둘째 줄이 서버 총 손익률(포맷만)", async () => {
    mock.method(appAICoachService, "getProfile", profile(false));
    mock.method(backendApi, "proxyAuthRequest", byPath({ totalGoals: 0 }, 12.34));
    mock.method(appPortfolioService, "getSummary", async () => portfolio([{}], 1));

    const invest = (await appHomeService.getHome("t")).cards.find((c) => c.domain === "invest")!;

    assert.deepEqual(invest.secondary, { label: "손익률", value: "+12.3%" });
  });

  it("음수 손익률은 부호를 글자로", async () => {
    mock.method(appAICoachService, "getProfile", profile(false));
    mock.method(backendApi, "proxyAuthRequest", byPath({ totalGoals: 0 }, -3.05));
    mock.method(appPortfolioService, "getSummary", async () => portfolio([{}], 1));

    const invest = (await appHomeService.getHome("t")).cards.find((c) => c.domain === "invest")!;

    assert.equal(invest.secondary?.value, "-3.0%");
  });

  it("매입가 숨김을 켠 사람 — 손익률 0건(F009 FR-27), 종목 수만", async () => {
    mock.method(appAICoachService, "getProfile", profile(true));
    mock.method(backendApi, "proxyAuthRequest", byPath({ totalGoals: 0 }, 12.34));
    mock.method(appPortfolioService, "getSummary", async () => portfolio([{}], 1));

    const vm = await appHomeService.getHome("t");

    assert.ok(!JSON.stringify(vm).includes("%"));
    assert.deepEqual(vm.cards.find((c) => c.domain === "invest")!.secondary, { label: "보유 종목", value: "1개" });
  });

  it("설정을 못 받았으면 숨김 쪽으로 — 손익률 0건, 카드는 ok", async () => {
    mock.method(appAICoachService, "getProfile", async () => {
      throw new Error("500");
    });
    mock.method(backendApi, "proxyAuthRequest", byPath({ totalGoals: 0 }, 12.34));
    mock.method(appPortfolioService, "getSummary", async () => portfolio([{}], 1));

    const vm = await appHomeService.getHome("t");
    const invest = vm.cards.find((c) => c.domain === "invest")!;

    assert.equal(invest.state, "ok");
    assert.ok(!JSON.stringify(vm).includes("%"));
  });

  it("통계를 못 받았으면 손익률만 빠지고 카드는 ok", async () => {
    mock.method(appAICoachService, "getProfile", profile(false));
    mock.method(backendApi, "proxyAuthRequest", byPath({ totalGoals: 0 }, null));
    mock.method(appPortfolioService, "getSummary", async () => portfolio([{}], 1));

    const invest = (await appHomeService.getHome("t")).cards.find((c) => c.domain === "invest")!;

    assert.equal(invest.state, "ok");
    assert.equal(invest.secondary?.label, "보유 종목");
  });
});
