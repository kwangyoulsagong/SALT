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

/** 서버 경로별 응답 — `/savings/home-card`(Kotlin savings) 와 `/portfolio/stats` 를 같은 목으로 받는다 */
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

  it("저축 카드는 Kotlin savings 의 home-card 를 부르고, 진척이 가장 큰 목표를 한 줄로 싣는다(서버 퍼센트 그대로)", async () => {
    mock.method(appAICoachService, "getProfile", profile(true));
    const calls: string[] = [];
    mock.method(backendApi, "proxyAuthRequest", async (_m: string, url: string) => {
      calls.push(url);
      return goalStats({ totalGoals: 2, activeGoals: 2, totalSaved: 600000, nearest: { title: "제주 여행", progressPercent: 50 } } as never);
    });
    mock.method(appPortfolioService, "getSummary", async () => portfolio([], 0));
    const vm = await appHomeService.getHome("t");
    const savings = vm.cards.find((c) => c.domain === "savings")!;
    assert.ok(calls.includes("/savings/home-card"));
    assert.ok(!calls.some((u) => u.startsWith("/goals")));
    assert.equal(savings.note, "제주 여행 50.0%");
    assert.equal(savings.href, "/goals");
  });
  // 기본: 매입가 숨김 켬 — 손익률 칸이 없는 쪽. 손익률 케이스는 아래에서 따로 바꾼다
  const hideByDefault = () => mock.method(appAICoachService, "getProfile", profile(true));

  it("저축 · 가계부 · 투자 카드를 서버 숫자의 표시 문자열로 낸다 — 기본 순서 저축 → 가계부 → 투자", async () => {
    hideByDefault();
    mock.method(backendApi, "proxyAuthRequest", async (_m: string, url: string) =>
      url === "/household/home-card"
        ? goalStats({ spent: 432100, count: 12, remaining: -3000, landing: { low: 800000, high: 950000 } } as never)
        : goalStats({ totalGoals: 3, activeGoals: 2, completedGoals: 1, totalSaved: 1234567 }),
    );
    mock.method(appPortfolioService, "getSummary", async () => portfolio([{}, {}], 9876543.4));

    const vm = await appHomeService.getHome("t");

    assert.deepEqual(vm.order, ["savings", "household", "invest"]);
    assert.deepEqual(vm.hidden, []);
    const [savings, household, invest] = vm.cards;
    // 넘친 예산도 숫자만(음수) — 경고 문구 · 상태 0(FEATURE-013 정책)
    assert.equal(household.state, "ok");
    assert.equal(household.href, "/household");
    assert.deepEqual(household.primary, { label: "이번 달 지출", value: "432,100원" });
    assert.deepEqual(household.secondary, { label: "예산 남은 금액", value: "-3,000원" });
    assert.equal(savings.state, "ok");
    assert.deepEqual(savings.primary, { label: "모은 돈", value: "1,234,567원" });
    assert.deepEqual(savings.secondary, { label: "진행 중인 목표", value: "2개" });
    assert.equal(invest.state, "ok");
    assert.deepEqual(invest.primary, { label: "보유 평가", value: "9,876,543원" });
    assert.deepEqual(invest.secondary, { label: "보유 종목", value: "2개" });
  });

  it("목표 · 보유가 없으면 empty — 0원을 그리지 않는다", async () => {
    hideByDefault();
    mock.method(backendApi, "proxyAuthRequest", async (_m: string, url: string) =>
      url === "/household/home-card"
        ? goalStats({ spent: 0, count: 0, remaining: null, landing: { low: null, high: null } } as never)
        : goalStats({ totalGoals: 0, totalSaved: 0 }),
    );
    mock.method(appPortfolioService, "getSummary", async () => portfolio([], 0));

    const vm = await appHomeService.getHome("t");

    assert.deepEqual(
      vm.cards.map((c) => [c.domain, c.state, c.primary?.value]),
      [
        ["savings", "empty", "아직 없어요"],
        ["household", "empty", "기록이 없어요"],
        ["invest", "empty", "기록이 없어요"],
      ],
    );
  });

  it("가계부 — 예산이 없으면 둘째 칸이 월말 예상 구간, 구간도 없으면(기록 14일 전) 비운다", async () => {
    hideByDefault();
    let landing: { low: number | null; high: number | null } = { low: 800000, high: 950000 };
    mock.method(backendApi, "proxyAuthRequest", async (_m: string, url: string) =>
      url === "/household/home-card" ? goalStats({ spent: 1000, count: 1, remaining: null, landing } as never) : goalStats({ totalGoals: 0 }),
    );
    mock.method(appPortfolioService, "getSummary", async () => portfolio([], 0));
    const card = async () => (await appHomeService.getHome("t")).cards.find((c) => c.domain === "household")!;
    assert.deepEqual((await card()).secondary, { label: "월말 예상", value: "800,000원 ~ 950,000원" });
    landing = { low: null, high: null };
    assert.equal((await card()).secondary, null);
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
    assert.equal(savings.href, "/goals");
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
    assert.equal(invest.note, null);
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
    const invest = vm.cards.find((c) => c.domain === "invest")!;
    assert.deepEqual(invest.secondary, { label: "보유 종목", value: "1개" });
    // 숨김을 켠 사람에게는 산 값 대신 지금 값으로 보게 하는 한 줄(F009 FR-27 — 전에 홈 보유 요약 아래 있던 줄)
    assert.equal(invest.note, "오늘 처음 본다면, 지금 값으로 이만큼 담을까요?");
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
    // 숨김인지 모르면 "숨김" 문장도 달지 않는다 — 확인된 사람에게만
    assert.equal(invest.note, null);
  });

  it("통계를 못 받았으면 손익률만 빠지고 카드는 ok", async () => {
    mock.method(appAICoachService, "getProfile", profile(false));
    mock.method(backendApi, "proxyAuthRequest", byPath({ totalGoals: 0 }, null));
    mock.method(appPortfolioService, "getSummary", async () => portfolio([{}], 1));

    const invest = (await appHomeService.getHome("t")).cards.find((c) => c.domain === "invest")!;

    assert.equal(invest.state, "ok");
    assert.equal(invest.secondary?.label, "보유 종목");
  });

  // 홈 배치 — 서버 identity(`BFF-REQ-046` FR-4 · 5, 서버 S3a 2026-11-06)
  const shell = (layout: unknown) => ({ data: { success: true, data: { layout } } }) as never;
  const cardsWithLayout = (layout: unknown | Error) => async (_m: string, url: string) => {
    if (url === "/identity/shell") {
      if (layout instanceof Error) throw layout;
      return shell(layout);
    }
    if (url === "/portfolio/stats") return { data: { success: true, data: { profitRate: 1 } } } as never;
    return goalStats({ totalGoals: 1, activeGoals: 1, totalSaved: 10 });
  };

  it("배치는 identity 가 정한 순서 · 숨김 — 카드가 없는 도메인(팁)은 빠진다", async () => {
    hideByDefault();
    mock.method(backendApi, "proxyAuthRequest", cardsWithLayout({ order: ["tips", "invest", "household", "savings"], hidden: ["invest", "tips"] }));
    mock.method(appPortfolioService, "getSummary", async () => portfolio([{}], 1));
    const vm = await appHomeService.getHome("t");
    assert.deepEqual(vm.order, ["invest", "household", "savings"]);
    assert.deepEqual(vm.hidden, ["invest"]);
  });

  it("배치를 못 받으면 기본 순서 · 숨김 0 — 카드는 그대로(배치 실패는 카드 실패가 아니다)", async () => {
    hideByDefault();
    mock.method(backendApi, "proxyAuthRequest", cardsWithLayout(new Error("503")));
    mock.method(appPortfolioService, "getSummary", async () => portfolio([{}], 1));
    const vm = await appHomeService.getHome("t");
    assert.deepEqual(vm.order, ["savings", "household", "invest"]);
    assert.deepEqual(vm.hidden, []);
    assert.ok(vm.cards.every((c) => c.state === "ok"));
  });

  it("배치 401 은 홈 전체 401", async () => {
    hideByDefault();
    const unauthorized = Object.assign(new Error("401"), { response: { status: 401 } });
    mock.method(backendApi, "proxyAuthRequest", cardsWithLayout(unauthorized));
    mock.method(appPortfolioService, "getSummary", async () => portfolio([{}], 1));
    await assert.rejects(appHomeService.getHome("t"), (error) => error === unauthorized);
  });

  it("서버 순서에 없는 카드는 기본 순서로 뒤에 · 모르는 키는 버린다", async () => {
    hideByDefault();
    mock.method(backendApi, "proxyAuthRequest", cardsWithLayout({ order: ["invest", "coach"], hidden: ["coach"] }));
    mock.method(appPortfolioService, "getSummary", async () => portfolio([{}], 1));
    const vm = await appHomeService.getHome("t");
    assert.deepEqual(vm.order, ["invest", "savings", "household"]);
    assert.deepEqual(vm.hidden, []);
  });

  it("배치 저장은 identity 로 그대로 보내고(값 검사는 서버) 서버 답을 배치로 돌려준다", async () => {
    const calls: Array<{ method: string; url: string; body: unknown }> = [];
    mock.method(backendApi, "proxyAuthRequest", async (method: string, url: string, _t: string, body: unknown) => {
      calls.push({ method, url, body });
      return shell({ order: ["tips", "savings", "household", "invest"], hidden: ["tips"] });
    });
    const layout = await appHomeService.arrangeHome("t", ["tips", "savings", "household", "invest"], ["tips"]);
    assert.deepEqual(calls, [{ method: "PUT", url: "/identity/shell/layout", body: { order: ["tips", "savings", "household", "invest"], hidden: ["tips"] } }]);
    assert.deepEqual(layout, { order: ["tips", "savings", "household", "invest"], hidden: ["tips"] });
  });

  it("화면이 보이는 카드 셋의 순서만 보내면 모르는 칸(팁)을 뒤에 붙여 보낸다 · 배열이 아니면 그대로(서버 400)", async () => {
    const bodies: unknown[] = [];
    mock.method(backendApi, "proxyAuthRequest", async (_m: string, _u: string, _t: string, body: unknown) => {
      bodies.push(body);
      return shell({ order: ["invest", "savings", "household", "tips"], hidden: [] });
    });
    await appHomeService.arrangeHome("t", ["invest", "savings", "household"], []);
    await appHomeService.arrangeHome("t", "invest", []);
    assert.deepEqual(bodies, [
      { order: ["invest", "savings", "household", "tips"], hidden: [] },
      { order: "invest", hidden: [] },
    ]);
  });
});
