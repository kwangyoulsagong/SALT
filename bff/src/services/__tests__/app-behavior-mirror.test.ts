import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { appBehaviorMirrorService } from "../app-behavior-mirror.service";
import { backendApi } from "../backend-api.service";
import {
  toBehaviorMirrorViewModel,
  toDecisionOutcomeList,
  toStreakView,
  toTradeBehaviorPreview,
  toTradeTimingView,
} from "../behavior-mirror.viewmodel";
import { toSizeCheckViewModel } from "../trade-risk.viewmodel";

/** F009 슬라이스 5 — 미러 · 결정 결과 · 태그 확정 · 입력 중 미리보기 (`BFF-REQ-038` FR-7~9). */

const ok = (data: unknown) => ({ data: { success: true, data } }) as never;
const httpError = (status: number) =>
  Object.assign(new Error(`status ${status}`), { response: { status, data: { message: "x" }, headers: {} } });

const metric = (value: number | null, sampleSize = 25, status = "ok") => ({ value, sampleSize, status });

const tagCost = (over: Record<string, unknown> = {}) => ({
  tag: "chasing",
  count: 22,
  netPnlKrw: -310_000,
  avgReturn: -0.021,
  avgR: -0.8,
  rSampleSize: 12,
  status: "ok",
  noEdge: true,
  ...over,
});

const mirror = (over: Record<string, unknown> = {}) => ({
  status: "ok",
  adherence: {
    rate: metric(0.79, 14, "insufficient_sample"),
    labelCounts: { honored: 11, stop_not_honored: 2, stop_slipped: 1, size_exceeded: 0 },
    honoredAvgReturn: metric(0.019, 11, "insufficient_sample"),
    violatedAvgReturn: metric(-0.044, 3, "insufficient_sample"),
  },
  disposition: {
    pgr: metric(0.62),
    plr: metric(0.38),
    counts: { realizedGains: 5, paperGains: 3, realizedLosses: 3, paperLosses: 5 },
    gainHoldingDays: metric(3.1),
    lossHoldingDays: metric(19),
    missingCloses: [],
  },
  benchmark: {
    status: "ok",
    sampleSize: 120,
    actualReturn: -0.018,
    holdReturn: 0.042,
    difference: -0.06,
    feeComponent: -0.012,
    timingComponent: -0.048,
    from: "2026-05-01T00:00:00.000Z",
    to: "2026-09-26T00:00:00.000Z",
    missingCloses: [],
    assumptions: ["twr_daily_close"],
  },
  tagCosts: [tagCost(), tagCost({ tag: "off_plan", noEdge: false, netPnlKrw: -95_000 })],
  turnover: {
    trailingYearTurnover: 3.2,
    feesYearToDateKrw: 184_000,
    tradeCount: 48,
    status: "ok",
    baseline: {
      source: "자본시장연구원(2021)",
      url: "https://www.kcmi.re.kr/report/report_view?report_no=1243",
      period: "2020-03~2020-10",
      market: "국내 주식",
      unit: "daily",
      newRetailDailyTurnover: 0.068,
      marketDailyTurnover: 0.014,
    },
  },
  outcomeCount: 25,
  outcomesComputedAt: "2026-09-27T00:35:00.000Z",
  minSample: 20,
  asOf: "2026-09-27T01:00:00.000Z",
  ...over,
});

const outcome = (over: Record<string, unknown> = {}) => ({
  id: "0b3c9b1e-6f1a-4b8e-9a52-2b8d6f0c1a11",
  planId: null,
  closingTransactionId: "0b3c9b1e-6f1a-4b8e-9a52-2b8d6f0c1a12",
  symbol: "BTC",
  openedAt: "2026-09-01T00:00:00.000Z",
  closedAt: "2026-09-10T00:00:00.000Z",
  holdingDays: 9,
  quantity: 0.01,
  netPnlKrw: -42_000,
  feesKrw: 900,
  netReturn: -0.045,
  rMultiple: null,
  heldReturn30d: null,
  adherenceLabel: null,
  autoTags: ["chasing", "off_plan"],
  userTags: [],
  tagsConfirmedAt: null,
  computedAt: "2026-09-27T00:35:00.000Z",
  ...over,
});

describe("toBehaviorMirrorViewModel", () => {
  it("서버 숫자를 옮기고 표본 상태를 그대로 둔다 — 표본 부족도 값은 있다", () => {
    const v = toBehaviorMirrorViewModel(mirror());
    assert.equal(v.status, "ok");
    assert.equal(v.historyStatus, "ok");
    assert.deepEqual(v.adherence?.rate, { value: 0.79, sampleSize: 14, status: "insufficient_sample" });
    assert.equal(v.disposition?.pgr.value, 0.62);
    assert.equal(v.benchmark?.difference, -0.06);
    assert.equal(v.turnover.baseline?.newRetailDailyTurnover, 0.068);
    assert.equal(v.tagCosts.length, 2);
  });

  it("화면이 안 쓰는 필드(counts · assumptions · missingCloses)는 옮기지 않는다", () => {
    const v = toBehaviorMirrorViewModel(mirror());
    assert.ok(!("counts" in (v.disposition ?? {})));
    assert.ok(!("assumptions" in (v.benchmark ?? {})));
    assert.ok(!("missingCloses" in (v.benchmark ?? {})));
  });

  it("값이 깨지면 null + insufficient_data — 0 으로 채우거나 ok 로 올리지 않는다", () => {
    const v = toBehaviorMirrorViewModel(
      mirror({
        disposition: { pgr: { value: "0.6", sampleSize: 25, status: "ok" }, plr: { value: 0.4, sampleSize: 25, status: "great" } },
      }),
    );
    assert.deepEqual(v.disposition?.pgr, { value: null, sampleSize: 25, status: "insufficient_data" });
    assert.equal(v.disposition?.plr.status, "insufficient_data");
    assert.equal(v.disposition?.gainHoldingDays.value, null);
  });

  it("잘린 거래는 historyStatus truncated · 블록 null", () => {
    const v = toBehaviorMirrorViewModel(
      mirror({ status: "truncated", adherence: null, disposition: null, benchmark: null }),
    );
    assert.equal(v.historyStatus, "truncated");
    assert.equal(v.adherence, null);
    assert.equal(v.benchmark, null);
  });

  it("모르는 준수 라벨 수는 0, 깨진 태그 줄은 뺀다, 기준선 출처가 빠지면 기준선도 없다", () => {
    const v = toBehaviorMirrorViewModel(
      mirror({
        adherence: { ...mirror().adherence, labelCounts: { honored: 3 } },
        tagCosts: [tagCost(), { tag: "", count: 1, netPnlKrw: 0 }, { tag: "revenge", count: "2", netPnlKrw: -1 }],
        turnover: { ...mirror().turnover, baseline: { ...mirror().turnover.baseline, url: null } },
      }),
    );
    assert.deepEqual(v.adherence?.labelCounts, { honored: 3, stop_not_honored: 0, stop_slipped: 0, size_exceeded: 0 });
    assert.deepEqual(v.tagCosts.map((cost) => cost.tag), ["chasing"]);
    assert.equal(v.turnover.baseline, null);
  });

  it("뼈대가 깨지면 던진다(서비스가 unavailable 로 바꾼다)", () => {
    assert.throws(() => toBehaviorMirrorViewModel(mirror({ status: "weird" })));
    assert.throws(() => toBehaviorMirrorViewModel(mirror({ tagCosts: null })));
  });
});

describe("연승 · 연패 · 시간대 (슬라이스 7, BFF-REQ-038 FR-13)", () => {
  const streak = (over: Record<string, unknown> = {}) => ({
    current: { kind: "win", length: 4 },
    longestWin: 5,
    longestLoss: 3,
    sampleSize: 40,
    minLength: 3,
    afterWins: { ratio: metric(1.34, 21), observed: true },
    afterLosses: { ratio: metric(0.9, 8, "insufficient_sample"), observed: false },
    basis: "buy_amount_excl_fee_not_capital_adjusted",
    ...over,
  });

  it("서버 값을 옮기고 basis 는 옮기지 않는다", () => {
    const view = toStreakView(streak());
    assert.deepEqual(view?.current, { kind: "win", length: 4 });
    assert.equal(view?.afterWins?.observed, true);
    assert.equal(view?.afterLosses?.ratio.status, "insufficient_sample");
    assert.equal("basis" in (view ?? {}), false);
  });

  it("모르는 연속 종류는 null, 비율 값이 없으면 observed 를 켜지 않는다, 뼈대가 깨지면 null", () => {
    assert.equal(toStreakView(streak({ current: { kind: "draw", length: 2 } }))?.current, null);
    assert.equal(
      toStreakView(streak({ afterWins: { ratio: { value: null, sampleSize: 0, status: "ok" }, observed: true } }))?.afterWins
        ?.observed,
      false,
    );
    assert.equal(toStreakView(streak({ longestWin: "5" })), null);
    assert.equal(toStreakView(undefined), null);
  });

  it("시간대 · 요일은 고정 순서, 빠진 칸은 0건 · insufficient_data, 시간대가 null 이면 섹션 없음", () => {
    const view = toTradeTimingView({
      bands: [{ key: "evening", count: 3, winRate: 0.33, avgReturn: -0.01, netPnlKrw: -12000, status: "insufficient_sample" }],
      weekdays: [{ key: "sun", count: 2, winRate: 0.5, avgReturn: 0.01, netPnlKrw: 500, status: "insufficient_sample" }],
      timedCount: 3,
      untimedCount: 1,
    });
    assert.deepEqual(view?.bands?.map((band) => band.key), ["dawn", "morning", "afternoon", "evening"]);
    assert.equal(view?.bands?.[0].status, "insufficient_data");
    assert.equal(view?.bands?.[3].netPnlKrw, -12000);
    assert.equal(view?.weekdays.length, 7);
    assert.equal(view?.weekdays[6].count, 2);
    assert.equal(toTradeTimingView({ bands: null, weekdays: [], timedCount: 0, untimedCount: 2 })?.bands, null);
    assert.equal(toTradeTimingView({ bands: [] }), null);
  });

  it("미러에 실리고, 서버가 아직 안 주면 null — 미러 전체는 산다", () => {
    const view = toBehaviorMirrorViewModel(mirror({ streak: streak(), timing: { bands: null, weekdays: [], timedCount: 0, untimedCount: 0 } }));
    assert.equal(view.streak?.longestWin, 5);
    assert.equal(view.timing?.weekdays.length, 7);
    const old = toBehaviorMirrorViewModel(mirror());
    assert.equal(old.streak, null);
    assert.equal(old.timing, null);
  });
});

describe("toDecisionOutcomeList", () => {
  it("깨진 행만 빼고 나머지는 둔다", () => {
    const list = toDecisionOutcomeList([outcome(), outcome({ id: null }), outcome({ netPnlKrw: "1" }), "x"]);
    assert.equal(list.length, 1);
    assert.deepEqual(list[0].autoTags, ["chasing", "off_plan"]);
    assert.ok(!("quantity" in list[0]));
  });

  it("목록 자리가 배열이 아니면 던진다", () => {
    assert.throws(() => toDecisionOutcomeList(undefined));
  });
});

describe("toTradeBehaviorPreview · 사이즈 계산 behavior", () => {
  it("엣지 없음만 남기고 planId 는 옮기지 않는다", () => {
    const preview = toTradeBehaviorPreview({
      status: "ok",
      candidateTags: ["chasing", "off_plan", 3],
      chasingUnknown: false,
      edgeWarnings: [tagCost(), tagCost({ tag: "off_plan", noEdge: false })],
      sellFraming: { planId: "p1", stopPrice: 88_300_000, currentPrice: "91200000" },
    });
    assert.deepEqual(preview?.candidateTags, ["chasing", "off_plan"]);
    assert.deepEqual(preview?.edgeWarnings.map((cost) => cost.tag), ["chasing"]);
    assert.deepEqual(preview?.sellFraming, { stopPrice: 88_300_000, currentPrice: null });
  });

  it("null · truncated · 깨진 모양은 null 이고 던지지 않는다", () => {
    assert.equal(toTradeBehaviorPreview(null), null);
    assert.equal(toTradeBehaviorPreview({ status: "truncated" }), null);
    assert.equal(toTradeBehaviorPreview({ status: "ok", candidateTags: "x", edgeWarnings: [] }), null);
  });

  it("미리보기가 깨져도 사이즈 결과는 그대로 나간다", () => {
    const v = toSizeCheckViewModel({
      symbol: "BTC",
      side: "buy",
      status: "ok",
      unavailable: {},
      assumptions: {},
      orderExecution: false,
      behavior: { status: "ok", candidateTags: null },
    });
    assert.equal(v.status, "ok");
    assert.equal(v.behavior, null);
  });
});

describe("AppBehaviorMirrorService", () => {
  afterEach(() => mock.restoreAll());

  it("미러 5xx 는 한 번 다시 부르고 200 unavailable", async () => {
    const call = mock.method(backendApi, "proxyAuthRequest", async () => {
      throw httpError(503);
    });
    assert.deepEqual(await appBehaviorMirrorService.getMirror("t"), { status: "unavailable" });
    assert.equal(call.mock.callCount(), 2);
  });

  it("미러 계약이 깨지면 unavailable, 4xx 는 그대로", async () => {
    mock.method(backendApi, "proxyAuthRequest", async () => ok({ status: "weird" }));
    assert.deepEqual(await appBehaviorMirrorService.getMirror("t"), { status: "unavailable" });

    mock.restoreAll();
    mock.method(backendApi, "proxyAuthRequest", async () => {
      throw httpError(401);
    });
    await assert.rejects(() => appBehaviorMirrorService.getMirror("t"));
  });

  it("결과 목록은 limit 을 싣고, 5xx 는 unavailable", async () => {
    const call = mock.method(backendApi, "proxyAuthRequest", async () => ok({ outcomes: [outcome()] }));
    const result = await appBehaviorMirrorService.listOutcomes("t", 30);
    assert.equal(result.status, "ok");
    assert.equal(call.mock.calls[0].arguments[1], "/coach/outcomes?limit=30");

    mock.restoreAll();
    mock.method(backendApi, "proxyAuthRequest", async () => {
      throw httpError(500);
    });
    assert.deepEqual(await appBehaviorMirrorService.listOutcomes("t", undefined), { status: "unavailable" });
  });

  it("태그 확정은 PUT 한 번 · 실패는 그대로 올린다(재시도 없음)", async () => {
    const call = mock.method(backendApi, "proxyAuthRequest", async () =>
      ok(outcome({ userTags: ["late_night"], tagsConfirmedAt: "2026-09-27T02:00:00.000Z" })),
    );
    const saved = await appBehaviorMirrorService.confirmOutcomeTags("t", outcome().id, ["late_night"]);
    assert.deepEqual(saved.userTags, ["late_night"]);
    assert.equal(call.mock.calls[0].arguments[0], "PUT");
    assert.deepEqual(call.mock.calls[0].arguments[3], { tags: ["late_night"] });

    mock.restoreAll();
    const failing = mock.method(backendApi, "proxyAuthRequest", async () => {
      throw httpError(503);
    });
    await assert.rejects(() => appBehaviorMirrorService.confirmOutcomeTags("t", outcome().id, []));
    assert.equal(failing.mock.callCount(), 1);
  });
});
