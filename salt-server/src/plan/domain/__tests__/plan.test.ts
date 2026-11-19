import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  assertAllocation,
  assertMonthlyBase,
  assertNoReadOnlyKeys,
  bandCardGate,
  bandWeekKey,
  executedAmount,
  kimchiView,
  missingWeeks,
  monthlyForWeek,
  monthlySummary,
  mondaysInMonth,
  plannedKrw,
  PlanBandReadOnlyError,
  PlanBaseAmountInvalidError,
  PlanExecutionInvalidError,
  resolveMultiplier,
  streakOf,
  weekOfKst,
  weeklyBaseKrw,
  type BandWeekRow,
  type ExecutionRecord,
  type PlanConfig,
  type PlanSettingsRecord,
} from "../index";

const ALLOCATION: PlanConfig["allocation"] = [
  { asset: "btc", pct: 50 },
  { asset: "kospi", pct: 50 },
];
const LIMITS = { monthlyMinKrw: 10_000, monthlyMaxKrw: 100_000_000 };
const KIMCHI = { kimchiHighPct: 3, kimchiLowPct: -2, kimchiMaxAgeDays: 8 };

const band = (over: Partial<BandWeekRow> = {}): BandWeekRow => ({
  asset: "btc",
  planWeek: "2026-11-16",
  preregKey: "band-accumulation@2",
  indicator: "mvrv_z",
  indicatorValue: 0.33,
  percentile: null,
  estimated: false,
  basisObserved: new Date("2026-11-14T00:00:00Z"),
  secondaryValue: null,
  bandKey: "low",
  bandMultiplier: 2,
  gatePassed: true,
  blockedReason: null,
  multiplier: 2,
  closedWeeks: 748,
  excess: 0.115,
  ciLow: 0.01,
  ciHigh: 0.4,
  yearsTotal: 14,
  yearsPositive: 9,
  windowFrom: null,
  windowTo: null,
  failureCases: [{ decidedAt: "2021-11-15T00:00:00+00:00", kind: "missed_drop", band: "neutral", multiplier: 1, return52w: -0.75 }],
  failureCount: 18,
  kimchiPremium: 0.0294,
  kimchiAsOf: new Date("2026-11-16T00:00:00Z"),
  computedAt: new Date("2026-11-16T00:20:00Z"),
  bands: [],
  ...over,
});

const settings = (over: Partial<PlanSettingsRecord> = {}): PlanSettingsRecord => ({
  monthlyBaseKrw: 1_300_000,
  previousMonthlyBaseKrw: null,
  effectiveWeek: "2026-11-02",
  startedWeek: "2026-11-02",
  ...over,
});

describe("plan 주 경계 — KST 월요일(FR-30 · 31)", () => {
  const cases: Array<[string, string]> = [
    ["2026-11-22T14:59:59.999Z", "2026-11-16"], // 일요일 23:59:59 KST → 그 주
    ["2026-11-22T15:00:00.000Z", "2026-11-23"], // 월요일 00:00 KST → 다음 주
    ["2026-11-16T00:00:00.000Z", "2026-11-16"], // 월요일 09:00 KST
    ["2026-11-15T15:00:00.000Z", "2026-11-16"], // 월요일 00:00 KST(일요일 UTC)
    ["2026-01-01T00:00:00.000Z", "2025-12-29"], // 해를 넘는 주
  ];
  for (const [instant, monday] of cases) {
    it(`${instant} → ${monday}`, () => assert.equal(weekOfKst(new Date(instant)), monday));
  }
  it("달 귀속 = 월요일의 달", () => {
    assert.deepEqual(mondaysInMonth("2026-11"), ["2026-11-02", "2026-11-09", "2026-11-16", "2026-11-23", "2026-11-30"]);
    assert.deepEqual(mondaysInMonth("2026-12"), ["2026-12-07", "2026-12-14", "2026-12-21", "2026-12-28"]);
  });
});

describe("plan 금액 — 환산 · 반올림(FR-5 · FR-71 · 72)", () => {
  it("월 1,300,000 · 50:50 → 주 150,000 + 150,000 = 300,000", () => {
    assert.equal(weeklyBaseKrw(1_300_000, 50), 150_000);
    assert.equal(weeklyBaseKrw(1_300_000, 50) * 2, 300_000);
  });
  it("1,000원 반올림 — 0.5 는 올림", () => {
    assert.equal(weeklyBaseKrw(100_000, 50), 12_000); // 11,538.46 → 12,000
    assert.equal(plannedKrw(12_500, 1), 13_000);
    assert.equal(plannedKrw(12_499, 1), 12_000);
    assert.equal(plannedKrw(150_000, 0.5), 75_000);
    assert.equal(plannedKrw(150_000, 0.25), 38_000); // 37,500 → 38,000
    assert.equal(plannedKrw(150_000, 0), 0);
  });
  const valid: Array<[number, boolean]> = [
    [10_000, true],
    [9_000, false],
    [100_000_000, true],
    [100_001_000, false],
    [1_300_500, false], // 1,000원 단위 아님
    [1_300_000.5, false],
    [Number.NaN, false],
  ];
  for (const [v, ok] of valid) {
    it(`월 ${v} → ${ok ? "통과" : "422"}`, () => {
      if (ok) assert.doesNotThrow(() => assertMonthlyBase(v, LIMITS));
      else assert.throws(() => assertMonthlyBase(v, LIMITS), PlanBaseAmountInvalidError);
    });
  }
  it("배분 합 100 · 중복 0 이 아니면 기동 실패", () => {
    assert.doesNotThrow(() => assertAllocation(ALLOCATION));
    assert.throws(() => assertAllocation([{ asset: "btc", pct: 60 }, { asset: "kospi", pct: 50 }]));
    assert.throws(() => assertAllocation([{ asset: "btc", pct: 50 }, { asset: "btc", pct: 50 }]));
  });
  it("수정은 다음 주부터 — effectiveWeek 전은 previous", () => {
    const s = settings({ monthlyBaseKrw: 2_000_000, previousMonthlyBaseKrw: 1_300_000, effectiveWeek: "2026-11-23" });
    assert.equal(monthlyForWeek(s, "2026-11-16"), 1_300_000);
    assert.equal(monthlyForWeek(s, "2026-11-23"), 2_000_000);
  });
});

describe("plan 배수 — 예측을 믿는 경계(FR-20 · 22)", () => {
  const table: Array<[string, BandWeekRow | null, number, boolean]> = [
    ["행 없음 → 정액 · fallback", null, 1, true],
    ["관문 통과 2.0x", band(), 2, false],
    ["관문 실패 → 정액(정상 경로 · fallback 아님)", band({ gatePassed: false, blockedReason: "not_better_than_flat", multiplier: 1 }), 1, false],
    // 예측 DB CHECK 가 막는 모양이지만 서버도 믿지 않는다 — 관문 실패면 배수 무시
    ["관문 실패인데 배수 2(계약 위반) → 정액", band({ gatePassed: false, blockedReason: "not_better_than_flat", multiplier: 2 }), 1, false],
    ["범위 밖 3.5 → 정액 · fallback", band({ multiplier: 3.5 }), 1, true],
    ["0x(극단 과열)는 그대로 0", band({ multiplier: 0, bandKey: "extreme_high" }), 0, false],
  ];
  for (const [name, row, m, fb] of table) {
    it(name, () => assert.deepEqual(resolveMultiplier(row), { multiplier: m, fallback: fb }));
  }
});

describe("plan 주 채움 — 빠진 지난 주는 skipped, 이번 주는 그 주 예측이 있을 때만", () => {
  it("열지 않은 지난 주 · 이번 주(예측 있음)", () => {
    const s = settings({ startedWeek: "2026-11-02" });
    const bands = new Map<string, BandWeekRow>([
      [bandWeekKey("2026-11-09", "btc"), band({ planWeek: "2026-11-09" })],
      [bandWeekKey("2026-11-16", "btc"), band()],
    ]);
    const rows = missingWeeks({
      settings: s,
      currentWeek: "2026-11-16",
      existing: [{ weekOf: "2026-11-02", asset: "btc" }],
      bandsByWeek: bands,
      allocation: ALLOCATION,
    });
    const view = rows.map((r) => [r.weekOf, r.asset, r.status, r.multiplier, r.plannedKrw, r.fallback]);
    assert.deepEqual(view, [
      ["2026-11-02", "kospi", "skipped", 1, 150_000, true],
      ["2026-11-09", "btc", "skipped", 2, 300_000, false],
      ["2026-11-09", "kospi", "skipped", 1, 150_000, true],
      ["2026-11-16", "btc", "planned", 2, 300_000, false],
      // 코스피 이번 주 예측 행 없음 → 만들지 않는다(예측 회차 전에 정액으로 굳히지 않는다)
    ]);
  });
});

describe("plan 실행 — 수동 체크 · 금액 경계(FR-41)", () => {
  const row = { asset: "btc" as const, weeklyBaseKrw: 150_000, plannedKrw: 300_000 };
  it("생략하면 계획액", () => assert.equal(executedAmount(row, undefined, 10), 300_000));
  it("0 · 상한 1,500,000 은 통과", () => {
    assert.equal(executedAmount(row, 0, 10), 0);
    assert.equal(executedAmount(row, 1_500_000, 10), 1_500_000);
  });
  for (const bad of [-1, 1_500_001, 1.5]) {
    it(`${bad} → 422`, () => assert.throws(() => executedAmount(row, bad, 10), PlanExecutionInvalidError));
  }
});

describe("plan 연속 · 미실행 — 주 단위 · 평가 0(FR-43~45)", () => {
  const r = (weekOf: string, status: ExecutionRecord["status"], executedKrw: number | null = null) => ({ weekOf, status, executedKrw });
  it("이번 주 안 했으면 지난 주부터 센다", () => {
    const s = streakOf(
      [r("2026-10-26", "executed", 100), r("2026-11-02", "skipped"), r("2026-11-09", "executed", 200), r("2026-11-16", "planned")],
      "2026-11-16"
    );
    assert.deepEqual(s, { weeks: 1, cumulativeKrw: 300, skippedLast12: 1, plannedLast12: 3 });
  });
  it("이번 주 했으면 이번 주부터 · 자산 하나만 해도 실행한 주", () => {
    const s = streakOf(
      [r("2026-11-09", "executed", 100), r("2026-11-16", "executed", 50), { weekOf: "2026-11-16", status: "planned", executedKrw: null }],
      "2026-11-16"
    );
    assert.equal(s.weeks, 2);
  });
});

describe("plan 이번 달 합계(FR-80~82)", () => {
  it("executed 만 더하고 진행률 · 남은 일수 서버 계산", () => {
    const s = monthlySummary({
      month: "2026-11",
      today: "2026-11-19",
      startedWeek: "2026-11-09",
      rows: [
        { weekOf: "2026-10-26", status: "executed", plannedKrw: 999, executedKrw: 999 }, // 10월 귀속
        { weekOf: "2026-11-09", status: "executed", plannedKrw: 300_000, executedKrw: 250_000 },
        { weekOf: "2026-11-16", status: "planned", plannedKrw: 300_000, executedKrw: null },
      ],
    });
    assert.deepEqual(s, {
      month: "2026-11",
      executedKrw: 250_000,
      plannedKrw: 600_000,
      progressPct: 41.7,
      executedWeeks: 1,
      totalWeeks: 4,
      daysLeft: 12,
    });
  });
  it("계획 0 이면 진행률 null · 지난 달 남은 일수 0", () => {
    const s = monthlySummary({ month: "2026-10", today: "2026-11-19", startedWeek: null, rows: [] });
    assert.equal(s.progressPct, null);
    assert.equal(s.daysLeft, 0);
    assert.equal(s.totalWeeks, 0);
  });
});

describe("plan 3종 게이트 · 김프(FR-10~12 · FR-50~54)", () => {
  const gate: Array<[string, BandWeekRow | null, string | null]> = [
    ["다 있음", band(), null],
    ["행 없음", null, "band_missing"],
    ["지표 없음(stale)", band({ indicatorValue: null, bandKey: null }), "indicator_missing"],
    ["검산 표본 0", band({ closedWeeks: 0 }), "track_record_missing"],
    ["구간 없음", band({ ciLow: null }), "track_record_missing"],
    ["실패 사례 0", band({ failureCount: 0, failureCases: [] }), "failure_cases_missing"],
  ];
  for (const [name, row, reason] of gate) {
    it(`게이트 ${name}`, () => assert.deepEqual(bandCardGate(row), { renderable: reason === null, blockedReason: reason }));
  }
  const now = new Date("2026-11-19T03:00:00Z");
  it("김프 +2.94% · 300,000 중 8,568원(= 금액 × p ÷ (1 + p))", () => {
    const k = kimchiView(band(), 300_000, now, KIMCHI);
    assert.deepEqual(k && { pct: k.premiumPct, cost: k.costKrwOnPlan, level: k.level }, { pct: 2.94, cost: 8_568, level: "normal" });
  });
  const levels: Array<[number, string]> = [
    [0.03, "high"],
    [0.0299, "normal"],
    [-0.02, "low"],
    [-0.0199, "normal"],
  ];
  for (const [p, level] of levels) {
    it(`김프 ${p} → ${level}`, () => assert.equal(kimchiView(band({ kimchiPremium: p }), 0, now, KIMCHI)?.level, level));
  }
  it("오래된 김프 · 값 없음 → null(금액은 그대로)", () => {
    assert.equal(kimchiView(band({ kimchiAsOf: new Date("2026-11-09T00:00:00Z") }), 1, now, KIMCHI), null);
    assert.equal(kimchiView(band({ kimchiPremium: null }), 1, now, KIMCHI), null);
  });
});

describe("plan 읽기 전용 키(FR-73)", () => {
  for (const k of ["bandConfig", "thresholds", "multipliers", "allocation"]) {
    it(`${k} → 422`, () => assert.throws(() => assertNoReadOnlyKeys({ monthlyBaseKrw: 10_000, [k]: 1 }), PlanBandReadOnlyError));
  }
  it("월 적립액만이면 통과", () => assert.doesNotThrow(() => assertNoReadOnlyKeys({ monthlyBaseKrw: 10_000 })));
});
