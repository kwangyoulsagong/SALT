import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { appBehaviorMirrorService } from "../app-behavior-mirror.service";
import { backendApi } from "../backend-api.service";
import { toBehaviorMirrorViewModel, toTradeBehaviorPreview } from "../behavior-mirror.viewmodel";
import { toMonthlyReviewViewModel } from "../monthly-review.viewmodel";
import { toRiskBudgetViewModel, toScenarios, toTradePlanViewModel } from "../trade-risk.viewmodel";
import { appTradeRiskService } from "../app-trade-risk.service";

/** F009 슬라이스 6 — 월간 복기 · Brier · 체크리스트 · 시나리오 · 한 종목 상한 (`BFF-REQ-038` FR-10~12). */

const ok = (data: unknown) => ({ data: { success: true, data } }) as never;
const httpError = (status: number) =>
  Object.assign(new Error(`status ${status}`), { response: { status, data: { message: "x" }, headers: {} } });
const metric = (value: number | null, sampleSize = 3, status = "insufficient_sample") => ({ value, sampleSize, status });

const brier = {
  meanScore: metric(0.325, 2),
  baseline: 0.25,
  skill: -0.3,
  missedCount: 1,
  pendingCount: 1,
  unscorableCount: 0,
  recentMisses: [
    { planId: "p", symbol: "BTC", probabilityUp: 0.7, plannedAt: "2026-01-01T12:00:00.000Z", dueAt: "2026-01-02T12:00:00.000Z", referenceClose: 100, outcomeClose: 80, up: false },
    { symbol: "BTC", probabilityUp: 0.7 }, // 깨진 사례 — 뺀다
  ],
};

const review = (over: Record<string, unknown> = {}) => ({
  month: "2026-08",
  from: "2026-07-31T15:00:00.000Z",
  to: "2026-08-31T15:00:00.000Z",
  generatedAt: "2026-09-01T21:40:00.000Z",
  activity: { tradeCount: 3, buyCount: 2, sellCount: 1, closedCount: 1 },
  adherence: {
    rate: metric(0, 1),
    labelCounts: { honored: 0, stop_not_honored: 1, stop_slipped: 0, size_exceeded: 0 },
    honoredAvgReturn: metric(null, 0, "insufficient_data"),
    violatedAvgReturn: metric(-0.063, 1),
  },
  disposition: { pgr: metric(null, 1, "insufficient_data"), plr: metric(0.5, 1), gainHoldingDays: metric(null, 0), lossHoldingDays: metric(17, 1) },
  benchmark: { status: "ok", sampleSize: 27, actualReturn: -0.02, holdReturn: 0.19, difference: -0.21, feeComponent: -0.001, timingComponent: -0.2 },
  turnover: { status: "ok", value: 1.09, tradedNotionalKrw: 9_700_000, feesKrw: 4_850 },
  tagCosts: [{ tag: "chasing", count: 3, netPnlKrw: -310_000, avgReturn: -0.02, avgR: null, rSampleSize: 0, status: "insufficient_sample", noEdge: false }],
  topMistake: { tag: "chasing", count: 3, netPnlKrw: -310_000, avgReturn: -0.02, avgR: null, rSampleSize: 0, status: "insufficient_sample", noEdge: false },
  ipsDeviation: {
    basis: "current_settings",
    observedDays: 31,
    days: 4,
    lossBudget: { status: "ok", days: 2, budgetKrw: 1_500_000 },
    concentration: { status: "ok", days: 3, limit: 0.6 },
    missingCloses: [],
  },
  brier,
  oneThing: "8월에 손익을 가장 많이 깎은 태그는 '급등 추격'(3건)이에요.",
  ...over,
});

afterEach(() => mock.restoreAll());

describe("월간 복기 뷰모델", () => {
  it("서버 숫자 · 문장을 그대로 옮기고 깨진 사례만 뺀다", () => {
    const view = toMonthlyReviewViewModel({ month: "2026-08", status: "ok", review: review(), availableMonths: ["2026-08", "bad"] });
    assert.equal(view.reviewStatus, "ok");
    assert.deepEqual(view.availableMonths, ["2026-08"]);
    assert.equal(view.review?.topMistake?.netPnlKrw, -310_000);
    assert.equal(view.review?.ipsDeviation.lossBudget.budgetKrw, 1_500_000);
    assert.equal(view.review?.brier?.recentMisses.length, 1);
    assert.equal(view.review?.oneThing, "8월에 손익을 가장 많이 깎은 태그는 '급등 추격'(3건)이에요.");
    assert.equal(view.review?.adherence.honoredAvgReturn.status, "insufficient_data");
  });

  it("값 없는 ok 지표 · 모르는 IPS 상태는 데이터 부족으로 내린다", () => {
    const view = toMonthlyReviewViewModel({
      month: "2026-08",
      status: "ok",
      review: review({
        adherence: { rate: { value: null, sampleSize: 3, status: "ok" } },
        ipsDeviation: { lossBudget: { status: "weird", days: "2" }, concentration: {} },
        turnover: { status: "ok", value: null },
      }),
    });
    assert.equal(view.review?.adherence.rate.status, "insufficient_data");
    assert.equal(view.review?.ipsDeviation.lossBudget.status, "insufficient_data");
    assert.equal(view.review?.ipsDeviation.lossBudget.days, null, "문자열 숫자를 0 으로 읽지 않는다");
    assert.equal(view.review?.turnover.status, "insufficient_data");
  });

  it("복기가 없는 상태는 본문 없이 · ok 인데 본문이 없으면 계약 깨짐", () => {
    const pending = toMonthlyReviewViewModel({ month: "2026-09", status: "month_not_closed", review: null, availableMonths: [] });
    assert.equal(pending.review, null);
    assert.throws(() => toMonthlyReviewViewModel({ month: "2026-08", status: "ok", review: null }));
    assert.throws(() => toMonthlyReviewViewModel({ month: "2026-13", status: "ok", review: review() }));
  });

  it("서비스 — 5xx 는 unavailable · 4xx 는 그대로 · 달 쿼리를 옮긴다", async () => {
    const paths: string[] = [];
    mock.method(backendApi, "proxyAuthRequest", async (_m: string, path: string) => {
      paths.push(path);
      return ok({ month: "2026-07", status: "no_ledger", review: null, availableMonths: [] });
    });
    const view = await appBehaviorMirrorService.getMonthlyReview("t", "2026-07");
    assert.deepEqual(paths, ["/coach/review/monthly?month=2026-07"]);
    assert.equal(view.status === "ok" && view.reviewStatus, "no_ledger");

    mock.restoreAll();
    mock.method(backendApi, "proxyAuthRequest", async () => {
      throw httpError(503);
    });
    assert.deepEqual(await appBehaviorMirrorService.getMonthlyReview("t", undefined), { status: "unavailable" });

    mock.restoreAll();
    mock.method(backendApi, "proxyAuthRequest", async () => {
      throw httpError(400);
    });
    await assert.rejects(appBehaviorMirrorService.getMonthlyReview("t", "2026-07"));
  });
});

describe("미러 Brier · 미리보기 체크리스트", () => {
  it("미러에 brier 가 없으면 null — 미러는 그대로", () => {
    const base = { status: "ok", tagCosts: [], turnover: {} };
    assert.equal(toBehaviorMirrorViewModel(base).brier, null);
    assert.equal(toBehaviorMirrorViewModel({ ...base, brier }).brier?.meanScore.value, 0.325);
  });

  it("체크리스트 — 빈 질문 줄은 빼고, 프리모템이 없으면 체크리스트 자체가 없다", () => {
    const preview = (checklist: unknown) =>
      toTradeBehaviorPreview({ status: "ok", candidateTags: [], edgeWarnings: [], checklist });
    const view = preview({
      items: [
        { tag: "chasing", question: "최근 이틀 고점 가까이에서 사는 거래인가요?", count: 3, netPnlKrw: -310_000 },
        { tag: "off_plan", question: "", count: 1, netPnlKrw: -1 },
      ],
      premortemQuestion: "3개월 뒤 이 거래가 실패했다면 이유는 뭘까요?",
    });
    assert.deepEqual(view?.checklist?.items.map((item) => item.tag), ["chasing"]);
    assert.equal(preview({ items: [] })?.checklist, null);
    assert.equal(preview(undefined)?.checklist, null);
  });
});

describe("리스크 예산 — 시나리오 · 한 종목 상한", () => {
  it("금액이 빈 충격 줄은 뺀다 · ok 인데 손실이 없는 구간은 데이터 부족", () => {
    const view = toScenarios({
      status: "ok",
      totalValueKrw: 1000,
      shocks: [
        { shock: -0.1, lossKrw: -100, valueAfterKrw: 900, bySymbol: [{ symbol: "BTC", lossKrw: -70 }] },
        { shock: -0.3, lossKrw: null, valueAfterKrw: 700 },
      ],
      episodes: [{ id: "2022-11-ftx", from: "2022-11-05", to: "2022-11-21", status: "ok", lossKrw: null, bySymbol: [] }],
    });
    assert.equal(view?.shocks.length, 1);
    assert.equal(view?.episodes[0].status, "insufficient_data");
    assert.equal(toScenarios({ status: "weird" }), null);
  });

  it("설정의 maxSingleAssetWeight · 시나리오 없음은 null", () => {
    const view = toRiskBudgetViewModel({ settings: { maxSingleAssetWeight: 0.4 }, gauges: {} });
    assert.equal(view.settings.maxSingleAssetWeight, 0.4);
    // 투자금(F010 슬라이스 5) — 정하지 않았으면 null, 0 이하는 "정하지 않음"과 섞이지 않게 null
    assert.equal(view.settings.investableCapitalKrw, null);
    assert.equal(
      toRiskBudgetViewModel({ settings: { investableCapitalKrw: 20_000_000 }, gauges: {} }).settings.investableCapitalKrw,
      20_000_000,
    );
    assert.equal(toRiskBudgetViewModel({ settings: { investableCapitalKrw: 0 }, gauges: {} }).settings.investableCapitalKrw, null);
    assert.equal(view.scenarios, null);
  });

  it("계획의 체크리스트 기록을 옮긴다", () => {
    const plan = toTradePlanViewModel({
      id: "p1",
      symbol: "BTC",
      side: "buy",
      plannedAt: "2026-09-27T00:00:00.000Z",
      checklist: { shown: ["chasing", 3], checked: ["chasing"] },
    });
    assert.deepEqual(plan.checklist, { shown: ["chasing"], checked: ["chasing"] });
  });
});

describe("거래 + 계획 기록 — 프리모템 · 체크리스트", () => {
  const transaction = { id: "t1", symbol: "BTC", transactionType: "buy", quantity: "0.01", price: "100", transactionDate: "2026-09-27T00:00:00.000Z" };
  const planRow = { id: "p1", symbol: "BTC", side: "buy", plannedAt: "2026-09-27T00:00:00.000Z" };

  it("프리모템 답만 있어도 계획을 만들고 체크리스트를 싣는다", async () => {
    const bodies: unknown[] = [];
    mock.method(backendApi, "proxyAuthRequest", async (_m: string, path: string, _t: string, body: unknown) => {
      bodies.push(body);
      return ok(path === "/portfolio/transactions" ? transaction : planRow);
    });
    const result = await appTradeRiskService.recordTrade("t", {
      symbol: "BTC",
      side: "buy",
      quantity: 0.01,
      price: 100,
      plan: { invalidation: " 거래량 없이 오른 자리였다 ", checklist: { shown: ["chasing"], checked: [] } },
    });
    assert.equal(result.plan.status, "ok");
    assert.deepEqual(bodies[1], {
      symbol: "BTC",
      side: "buy",
      transactionId: "t1",
      invalidation: "거래량 없이 오른 자리였다",
      checklist: { shown: ["chasing"], checked: [] },
    });
  });

  it("체크리스트만으로는 계획을 만들지 않는다 — '계획 없음' 태그가 거짓으로 빠지지 않게", async () => {
    let calls = 0;
    mock.method(backendApi, "proxyAuthRequest", async () => {
      calls += 1;
      return ok(transaction);
    });
    const result = await appTradeRiskService.recordTrade("t", {
      symbol: "BTC",
      side: "buy",
      quantity: 0.01,
      price: 100,
      plan: { checklist: { shown: ["chasing"], checked: ["chasing"] } },
    });
    assert.equal(result.plan.status, "none");
    assert.equal(calls, 1);
  });
});
