import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

import { toInvestCard } from "../home-card.viewmodel";
import { toPlanSettingsViewModel, toWeeklyPlanViewModel } from "../plan.viewmodel";

/** 실 DB 응답(2026-11-19 · 지금 예측 — 둘 다 관문 실패 → 정액)과 같은 모양 */
const item = (over: Record<string, unknown> = {}) => ({
  asset: "btc",
  indicator: "mvrv_z",
  weeklyBaseKrw: 150_000,
  multiplier: 1,
  amountKrw: 150_000,
  status: "planned",
  executedKrw: null,
  fixed: true,
  fallback: false,
  reasonCode: "gate_not_passed",
  basis: {
    planWeek: "2026-11-16",
    value: 1.42,
    percentile: null,
    estimated: false,
    basisObserved: "2026-11-15T00:00:00.000Z",
    secondaryValue: null,
    bandKey: "low",
    bandMultiplier: 2,
    bands: [
      { key: "extreme_low", below: 0, multiplier: 3 },
      { key: "extreme_high", below: null, multiplier: 0 },
    ],
    staleDays: 0,
    computedAt: "2026-11-17T00:21:00.000Z",
  },
  trackRecord: {
    preregKey: "band-accumulation@2",
    gatePassed: false,
    gateBlockedReason: "not_better_than_flat",
    closedWeeks: 520,
    excess: 0.115,
    ciLow: -0.203,
    ciHigh: 0.418,
    yearsTotal: 10,
    yearsPositive: 6,
    windowFrom: "2014-01-06",
    windowTo: "2025-11-10",
  },
  failureCases: { count: 18, items: [{ decidedAt: "2013-03-11T00:00:00+00:00", kind: "wrong_expensive", band: "high", multiplier: 0.5, return52w: 12.9 }] },
  renderable: true,
  blockedReason: null,
  ...over,
});

const weekly = (items: unknown[], over: Record<string, unknown> = {}) => ({
  weekOf: "2026-11-16",
  configured: true,
  totalKrw: 300_000,
  items,
  kimchiPremium: { premiumPct: 2.94, costKrwOnPlan: 4_279, level: "normal", asOf: "2026-11-16T00:00:00.000Z" },
  streak: { weeks: 0, cumulativeKrw: 0, skippedLast12: 0, plannedLast12: 1 },
  degraded: false,
  degradedReasons: [],
  ...over,
});

describe("주간 계획 뷰모델 — 계산 0 · 게이트 판정 0", () => {
  it("서버 값 그대로 — 배수 · 금액 · 관문 · 3종 · 김프", () => {
    const vm = toWeeklyPlanViewModel(weekly([item(), item({ asset: "kospi", indicator: "per_percentile" })]));
    assert.equal(vm.totalKrw, 300_000);
    assert.deepEqual(vm.items.map((i) => [i.asset, i.multiplier, i.amountKrw, i.renderable]), [["btc", 1, 150_000, true], ["kospi", 1, 150_000, true]]);
    assert.equal(vm.items[0].basis?.bandMultiplier, 2);
    assert.equal(vm.items[0].trackRecord?.excess, 0.115);
    assert.equal(vm.kimchiPremium?.costKrwOnPlan, 4_279);
    assert.equal(vm.degraded, false);
  });

  it("게이트 필드가 없으면 닫는다(fail-closed) — 금액은 남기고 degraded 에 사유", () => {
    const { renderable: _r, ...noGate } = item();
    const vm = toWeeklyPlanViewModel(weekly([noGate]));
    assert.equal(vm.items[0].renderable, false);
    assert.equal(vm.items[0].blockedReason, "gate_missing");
    assert.equal(vm.items[0].amountKrw, 150_000);
    assert.equal(vm.degraded, true);
    assert.deepEqual(vm.degradedReasons, ["gate_missing"]);
  });

  it("renderable 이 문자열 'true' 여도 열지 않는다", () => {
    assert.equal(toWeeklyPlanViewModel(weekly([item({ renderable: "true" })])).items[0].renderable, false);
  });

  it("배수 0 은 0 그대로 · 금액 null(설정 전)은 0 으로 바꾸지 않는다", () => {
    const vm = toWeeklyPlanViewModel(weekly([item({ multiplier: 0, amountKrw: null, weeklyBaseKrw: null })], { configured: false, totalKrw: null }));
    assert.equal(vm.items[0].multiplier, 0);
    assert.equal(vm.items[0].amountKrw, null);
    assert.equal(vm.totalKrw, null);
  });

  it("모르는 자산 · 배수 없는 행은 싣지 않는다 — 근거 없는 금액", () => {
    const vm = toWeeklyPlanViewModel(weekly([item({ asset: "us_stock" }), item({ multiplier: "1" }), item()]));
    assert.deepEqual(vm.items.map((i) => i.asset), ["btc"]);
    assert.deepEqual(vm.degradedReasons, ["item_dropped"]);
  });

  it("서버 degraded 사유는 지우지 않는다 · 김프 모양이 틀리면 null(금액은 유효)", () => {
    const vm = toWeeklyPlanViewModel(weekly([item()], { degraded: true, degradedReasons: ["band_pending"], kimchiPremium: { premiumPct: "x" } }));
    assert.deepEqual(vm.degradedReasons, ["band_pending"]);
    assert.equal(vm.kimchiPremium, null);
    assert.equal(vm.items[0].amountKrw, 150_000);
  });

  it("빈 응답에도 깨지지 않는다", () => {
    const vm = toWeeklyPlanViewModel(undefined);
    assert.deepEqual([vm.items, vm.configured, vm.totalKrw], [[], false, null]);
  });
});

describe("설정 뷰모델 — 밴드는 읽기 전용", () => {
  it("editable 은 서버가 true 를 줘도 false · 모르는 자산은 버린다", () => {
    const vm = toPlanSettingsViewModel({
      configured: true,
      monthlyBaseKrw: 1_300_000,
      currentMonthlyBaseKrw: 1_300_000,
      pending: null,
      startedWeek: "2026-11-16",
      allocation: [{ asset: "btc", pct: 50, weeklyBaseKrw: 150_000, editable: true }, { asset: "voo", pct: 50, weeklyBaseKrw: 1, editable: false }],
      bands: [{ asset: "kospi", indicator: "per_percentile", rules: [{ key: "low", below: 0.5, multiplier: 2 }], currentBandKey: "neutral", editable: true, reasonCode: "x" }],
      limits: { minKrw: 10_000, maxKrw: 100_000_000, unitKrw: 1_000 },
    });
    assert.deepEqual(vm.allocation.map((a) => [a.asset, a.editable]), [["btc", false]]);
    assert.equal(vm.bands[0].editable, false);
    assert.equal(vm.bands[0].reasonCode, "hit_rate_on_default_band");
    assert.deepEqual(vm.limits, { minKrw: 10_000, maxKrw: 100_000_000, unitKrw: 1_000 });
  });
});

describe("홈 투자 카드 적립 한 줄", () => {
  const summary = { items: [{}], totalKrw: 1_000 } as never;
  it("계획이 있으면 note 에 서버 금액 · 숨김 질문이 있으면 그 줄이 먼저", () => {
    assert.equal(toInvestCard(summary, "t", null, false, 300_000).note, "이번 주 적립 계획 300,000원");
    assert.equal(toInvestCard(summary, "t", null, true, 300_000).note, "오늘 처음 본다면, 지금 값으로 이만큼 담을까요?");
    assert.equal(toInvestCard(summary, "t", null, false, null).note, null);
  });
  it("보유가 없어도 계획 줄은 보인다", () => {
    assert.equal(toInvestCard({ items: [], totalKrw: 0 } as never, "t", null, false, 300_000).note, "이번 주 적립 계획 300,000원");
  });
});

describe("계산 · 임계 상수 0(BFF-REQ-019 FR-20~24)", () => {
  it("밴드 적립 BFF 파일에 곱셈 · 반올림 · 밴드 임계 숫자가 없다", () => {
    const dir = resolve(__dirname, "..");
    const files = ["plan.viewmodel.ts", "app-plan.service.ts"].map((f) => readFileSync(resolve(dir, f), "utf8"));
    files.push(readFileSync(resolve(__dirname, "../../rest/controllers/plan.controller.ts"), "utf8"));
    for (const text of files) {
      const code = text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
      assert.doesNotMatch(code, /Math\.(round|floor|ceil)|\*\s*[\w(]|toFixed/);
      assert.doesNotMatch(code, /\b(0\.2|0\.5|0\.8|0\.95|3\.0|2\.0|0\.25)\b/);
    }
    assert.ok(readdirSync(dir).includes("plan.viewmodel.ts"));
  });
});
