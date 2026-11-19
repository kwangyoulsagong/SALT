import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  PlanExecutionInvalidError,
  PlanMonthInFutureError,
  PlanNotConfiguredError,
  PlanWeekNotCurrentError,
  type BandReader,
  type BandWeekRow,
  type ExecutionRecord,
  type ExecutionStore,
  type PlanAsset,
  type PlanConfig,
  type PlanSettingsRecord,
  type PlanSettingsStore,
} from "../../domain";
import { createPlanApplication } from "../api";

const CONFIG: PlanConfig = {
  allocation: [
    { asset: "btc", pct: 50 },
    { asset: "kospi", pct: 50 },
  ],
  monthlyMinKrw: 10_000,
  monthlyMaxKrw: 100_000_000,
  executionCapMultiple: 10,
  kimchiHighPct: 3,
  kimchiLowPct: -2,
  kimchiMaxAgeDays: 8,
};

const band = (asset: PlanAsset, planWeek: string, over: Partial<BandWeekRow> = {}): BandWeekRow => ({
  asset,
  planWeek,
  preregKey: "band-accumulation@2",
  indicator: asset === "btc" ? "mvrv_z" : "per_percentile",
  indicatorValue: 0.33,
  percentile: asset === "btc" ? null : 0.5,
  estimated: asset === "kospi",
  basisObserved: new Date(`${planWeek}T00:00:00Z`),
  secondaryValue: null,
  bandKey: "low",
  bandMultiplier: 2,
  gatePassed: asset === "btc",
  blockedReason: asset === "btc" ? null : "not_better_than_flat",
  multiplier: asset === "btc" ? 2 : 1,
  closedWeeks: 700,
  excess: 0.1,
  ciLow: 0.01,
  ciHigh: 0.3,
  yearsTotal: 12,
  yearsPositive: 8,
  windowFrom: null,
  windowTo: null,
  failureCases: [{ decidedAt: "2021-11-15T00:00:00+00:00", kind: "missed_drop", band: "neutral", multiplier: 1, return52w: -0.7 }],
  failureCount: 5,
  kimchiPremium: asset === "btc" ? 0.01 : null,
  kimchiAsOf: asset === "btc" ? new Date(`${planWeek}T00:00:00Z`) : null,
  computedAt: new Date(`${planWeek}T00:30:00Z`),
  bands: [{ key: "extreme_low", below: 0, multiplier: 3 }],
  ...over,
});

/** 메모리 저장소 — 실제 어댑터와 같은 멱등 규칙(같은 주 · 자산이면 넣지 않는다) */
const world = (bandRows: BandWeekRow[]) => {
  const settings = new Map<string, PlanSettingsRecord>();
  const rows: Array<ExecutionRecord & { userId: string }> = [];
  const writes = { insert: 0, close: 0, mark: 0 };
  const settingsStore: PlanSettingsStore = {
    get: async (u) => settings.get(u) ?? null,
    lock: async () => undefined,
    save: async (u, r) => void settings.set(u, { ...r }),
  };
  const executions: ExecutionStore = {
    list: async (u, from, to) =>
      rows
        .filter((r) => r.userId === u && r.weekOf >= from && r.weekOf <= to)
        .sort((a, b) => a.weekOf.localeCompare(b.weekOf) || a.asset.localeCompare(b.asset))
        .map(({ userId: _u, ...r }) => ({ ...r })),
    insertMissing: async (u, add) => {
      writes.insert += 1;
      for (const r of add) if (!rows.some((x) => x.userId === u && x.weekOf === r.weekOf && x.asset === r.asset)) rows.push({ ...r, userId: u });
    },
    closeBefore: async (u, before) => {
      writes.close += 1;
      for (const r of rows) if (r.userId === u && r.status === "planned" && r.weekOf < before) r.status = "skipped";
    },
    markExecuted: async (u, weekOf, items, at) => {
      writes.mark += 1;
      for (const i of items) {
        const r = rows.find((x) => x.userId === u && x.weekOf === weekOf && x.asset === i.asset);
        if (r) Object.assign(r, { status: "executed", executedKrw: i.executedKrw, recordedAt: at });
      }
    },
  };
  const bands: BandReader = {
    latest: async () => {
      const byAsset = new Map<string, BandWeekRow>();
      for (const b of [...bandRows].sort((a, c) => a.planWeek.localeCompare(c.planWeek))) byAsset.set(b.asset, b);
      return [...byAsset.values()];
    },
    weeks: async (from, to) => bandRows.filter((b) => b.planWeek >= from && b.planWeek <= to),
  };
  let now = new Date("2026-11-19T03:00:00Z"); // 목 12:00 KST, 이번 주 2026-11-16
  const app = createPlanApplication({
    settings: settingsStore,
    executions,
    bands,
    tx: { run: (fn) => fn() },
    config: CONFIG,
    now: () => now,
  });
  return { app: app.useCases, rows, settings, writes, setNow: (d: string) => (now = new Date(d)), bandRows };
};

describe("plan 유스케이스", () => {
  it("설정 전 — configured false · 금액 null · 밴드 · 성적 · 실패 사례는 보인다", async () => {
    const w = world([band("btc", "2026-11-16"), band("kospi", "2026-11-16")]);
    const v = await w.app.getWeeklyPlan.execute("u1");
    assert.equal(v.configured, false);
    assert.equal(v.totalKrw, null);
    assert.deepEqual(v.items.map((i) => [i.asset, i.amountKrw, i.renderable, i.status]), [
      ["btc", null, true, null],
      ["kospi", null, true, null],
    ]);
    assert.equal(w.rows.length, 0); // 설정 전엔 쓰기 0
  });

  it("첫 저장 → 이번 주 계획이 바로 생긴다(B12) · BTC 2.0x(관문 통과) · 코스피 1.0x(관문 실패)", async () => {
    const w = world([band("btc", "2026-11-16"), band("kospi", "2026-11-16")]);
    const s = await w.app.updatePlanSettings.execute("u1", 1_300_000);
    assert.equal(s.currentMonthlyBaseKrw, 1_300_000);
    assert.deepEqual(s.allocation.map((a) => a.weeklyBaseKrw), [150_000, 150_000]);
    assert.equal(w.rows.length, 2);
    const v = await w.app.getWeeklyPlan.execute("u1");
    assert.deepEqual(v.items.map((i) => [i.asset, i.multiplier, i.amountKrw, i.reasonCode, i.fixed]), [
      ["btc", 2, 300_000, "band_applied", true],
      ["kospi", 1, 150_000, "gate_not_passed", true],
    ]);
    assert.equal(v.totalKrw, 450_000);
    assert.equal(v.kimchiPremium?.costKrwOnPlan, 2_970); // 300,000 × 0.01 ÷ 1.01
    assert.equal(w.writes.insert, 1); // 두 번째 읽기는 쓰기 0
  });

  it("수정은 다음 주부터 — 이번 주 금액 그대로, 대기값 표시", async () => {
    const w = world([band("btc", "2026-11-16"), band("kospi", "2026-11-16")]);
    await w.app.updatePlanSettings.execute("u1", 1_300_000);
    const s = await w.app.updatePlanSettings.execute("u1", 2_600_000);
    assert.equal(s.currentMonthlyBaseKrw, 1_300_000);
    assert.deepEqual(s.pending, { monthlyBaseKrw: 2_600_000, effectiveWeek: "2026-11-23" });
    assert.equal((await w.app.getWeeklyPlan.execute("u1")).totalKrw, 450_000);
    // 반영 전에 지금 값으로 되돌리면 대기를 거둔다
    const back = await w.app.updatePlanSettings.execute("u1", 1_300_000);
    assert.equal(back.pending, null);
  });

  it("예측 회차 전(이번 주 행 없음) — 정액 잠정 · 굳히지 않음 · 회차 뒤 그 배수로 굳는다", async () => {
    const w = world([band("btc", "2026-11-09"), band("kospi", "2026-11-09")]);
    w.setNow("2026-11-16T23:00:00Z"); // 화 08:00 KST — 이번 주 예측 아직
    await w.app.updatePlanSettings.execute("u1", 1_300_000);
    let v = await w.app.getWeeklyPlan.execute("u1");
    assert.deepEqual(v.items.map((i) => [i.multiplier, i.fixed, i.reasonCode]), [
      [1, false, "band_pending"],
      [1, false, "band_pending"],
    ]);
    assert.ok(v.degradedReasons.includes("band_pending"));
    w.bandRows.push(band("btc", "2026-11-16"), band("kospi", "2026-11-16"));
    v = await w.app.getWeeklyPlan.execute("u1");
    assert.deepEqual(v.items.map((i) => [i.multiplier, i.fixed]), [
      [2, true],
      [1, true],
    ]);
  });

  it("열지 않은 주는 그 주 예측으로 skipped 마감 · 지난 planned 도 마감 · 12주 미실행 셈", async () => {
    const w = world([band("btc", "2026-11-02"), band("kospi", "2026-11-02"), band("btc", "2026-11-16"), band("kospi", "2026-11-16")]);
    w.setNow("2026-11-03T03:00:00Z");
    await w.app.updatePlanSettings.execute("u1", 1_300_000); // 11-02 주 planned
    w.setNow("2026-11-19T03:00:00Z");
    const v = await w.app.getWeeklyPlan.execute("u1");
    const byWeek = w.rows.map((r) => [r.weekOf, r.asset, r.status, r.fallback]);
    assert.deepEqual(byWeek.sort(), [
      ["2026-11-02", "btc", "skipped", false],
      ["2026-11-02", "kospi", "skipped", false],
      ["2026-11-09", "btc", "skipped", true], // 그 주 예측 행 없음 → 정액
      ["2026-11-09", "kospi", "skipped", true],
      ["2026-11-16", "btc", "planned", false],
      ["2026-11-16", "kospi", "planned", false],
    ]);
    assert.deepEqual(v.streak, { weeks: 0, cumulativeKrw: 0, skippedLast12: 2, plannedLast12: 2 });
  });

  it("체크 — 생략하면 계획액 · 고침 · 상한 · 이번 주만 · 설정 전 거절", async () => {
    const w = world([band("btc", "2026-11-16"), band("kospi", "2026-11-16")]);
    await assert.rejects(
      w.app.completeWeeklyPlan.execute({ userId: "u1", weekOf: "2026-11-16", executions: [{ asset: "btc" }] }),
      PlanNotConfiguredError
    );
    await w.app.updatePlanSettings.execute("u1", 1_300_000);
    const r1 = await w.app.completeWeeklyPlan.execute({ userId: "u1", weekOf: "2026-11-16", executions: [{ asset: "btc" }] });
    assert.deepEqual(r1, { weekOf: "2026-11-16", streakWeeks: 1, cumulativeKrw: 300_000 });
    const r2 = await w.app.completeWeeklyPlan.execute({
      userId: "u1",
      weekOf: "2026-11-16",
      executions: [{ asset: "btc", amountKrw: 250_000 }, { asset: "kospi", amountKrw: 0 }],
    });
    assert.equal(r2.cumulativeKrw, 250_000);
    await assert.rejects(
      w.app.completeWeeklyPlan.execute({ userId: "u1", weekOf: "2026-11-16", executions: [{ asset: "btc", amountKrw: 1_500_001 }] }),
      PlanExecutionInvalidError
    );
    await assert.rejects(
      w.app.completeWeeklyPlan.execute({ userId: "u1", weekOf: "2026-11-09", executions: [{ asset: "btc" }] }),
      PlanWeekNotCurrentError
    );
    const m = await w.app.getMonthlySummary.execute("u1");
    assert.deepEqual([m.month, m.executedKrw, m.plannedKrw, m.executedWeeks, m.totalWeeks, m.monthlyBaseKrw], [
      "2026-11",
      250_000,
      450_000,
      1,
      3, // 11-16 · 11-23 · 11-30
      1_300_000,
    ]);
  });

  it("월 합계 — 이번 달 · 지난 달은 되고 오지 않은 달은 400(FR-29) · 경계는 KST", async () => {
    const w = world([]);
    assert.equal((await w.app.getMonthlySummary.execute("u1", "2026-11")).month, "2026-11");
    assert.equal((await w.app.getMonthlySummary.execute("u1", "2026-10")).month, "2026-10");
    await assert.rejects(w.app.getMonthlySummary.execute("u1", "2026-12"), (e: unknown) =>
      e instanceof PlanMonthInFutureError && e.details?.currentMonth === "2026-11"
    );
    await assert.rejects(w.app.getMonthlySummary.execute("u1", "2027-01"), PlanMonthInFutureError);
    // UTC 로는 아직 11월 30일, KST 로는 12월 1일 00:00 — 12월은 이제 이번 달
    w.setNow("2026-11-30T15:00:00Z");
    assert.equal((await w.app.getMonthlySummary.execute("u1", "2026-12")).month, "2026-12");
    w.setNow("2026-11-30T14:59:59Z");
    await assert.rejects(w.app.getMonthlySummary.execute("u1", "2026-12"), PlanMonthInFutureError);
  });

  it("예측 회차 전에 체크하면 그때 정액으로 굳힌다(근거가 남는다)", async () => {
    const w = world([]);
    await w.app.updatePlanSettings.execute("u1", 1_300_000);
    assert.equal(w.rows.length, 0);
    await w.app.completeWeeklyPlan.execute({ userId: "u1", weekOf: "2026-11-16", executions: [{ asset: "kospi" }] });
    assert.deepEqual(w.rows.map((r) => [r.asset, r.multiplier, r.fallback, r.status, r.executedKrw]), [["kospi", 1, true, "executed", 150_000]]);
    const v = await w.app.getWeeklyPlan.execute("u1");
    assert.deepEqual(v.items.map((i) => [i.asset, i.reasonCode, i.renderable, i.blockedReason]), [
      ["btc", "band_unavailable", false, "band_missing"],
      ["kospi", "band_unavailable", false, "band_missing"],
    ]);
    assert.equal(v.totalKrw, 300_000); // 예측이 비어도 기본액은 보인다(FR-22)
  });
});
