/**
 * 주 계획 스냅샷 · 채움 — 그 주 예측 행이 있으면 그 배수, 없으면 정액(1.0) + `fallback`(`SRV-REQ-020` FR-20 · 22 · 23 · 32).
 *
 * **배수를 서버가 다시 판정하지 않는다** — 관문 · 밴드는 예측(`band-accumulation@2`)이 낸다. 여기는 그 값을 믿을지
 * (범위 0~3 · 관문 실패면 1.0)만 지킨다. 같은 주 · 자산 한 행이고 처음 만든 값을 지킨다(멱등 — 이후 예측이 바뀌어도
 * "그 주 왜 그 금액이었나"가 남는다).
 */
import { plannedKrw, weeklyBaseFor } from "./amount";
import { weeksBetween } from "./weekBoundary";
import type { BandWeekRow, ExecutionRecord, PlanAsset, PlanConfig, PlanSettingsRecord } from "../types";

const MAX_MULTIPLIER = 3;

/** 예측 행 → 그 주 배수. 행이 없거나 값이 범위 밖이면 정액 + fallback */
export const resolveMultiplier = (band: BandWeekRow | null): { multiplier: number; fallback: boolean } => {
  if (!band) return { multiplier: 1, fallback: true };
  if (!band.gatePassed) return { multiplier: 1, fallback: false }; // 관문 실패 = 정액이 정상 경로(배수 효과 미검증)
  const m = band.multiplier;
  if (!Number.isFinite(m) || m < 0 || m > MAX_MULTIPLIER) return { multiplier: 1, fallback: true };
  return { multiplier: m, fallback: false };
};

/** 한 주 × 자산 스냅샷 행 */
export const snapshotWeek = (input: {
  settings: PlanSettingsRecord;
  weekOf: string;
  asset: PlanAsset;
  band: BandWeekRow | null;
  status: "planned" | "skipped";
  allocation: PlanConfig["allocation"];
}): ExecutionRecord => {
  const base = weeklyBaseFor(input.settings, input.weekOf, input.asset, input.allocation);
  const { multiplier, fallback } = resolveMultiplier(input.band);
  return {
    weekOf: input.weekOf,
    asset: input.asset,
    weeklyBaseKrw: base,
    multiplier,
    plannedKrw: plannedKrw(base, multiplier),
    bandKey: input.band?.bandKey ?? null,
    gatePassed: input.band?.gatePassed ?? null,
    blockedReason: input.band?.blockedReason ?? null,
    preregKey: input.band?.preregKey ?? null,
    indicatorValue: input.band?.indicatorValue ?? null,
    fallback,
    status: input.status,
    executedKrw: null,
    recordedAt: null,
  };
};

const key = (weekOf: string, asset: string) => `${weekOf}|${asset}`;

/**
 * 채워야 할 행 — 시작 주부터 지난 주까지 빠진 주는 `skipped`(열지 않은 주도 미실행이다 — FR-43),
 * 이번 주는 **그 주 예측 행이 있을 때만** `planned`(월요일 아침 예측 회차 전에 정액으로 굳히지 않는다).
 */
export const missingWeeks = (input: {
  settings: PlanSettingsRecord;
  currentWeek: string;
  existing: ReadonlyArray<Pick<ExecutionRecord, "weekOf" | "asset">>;
  bandsByWeek: ReadonlyMap<string, BandWeekRow>;
  allocation: PlanConfig["allocation"];
}): ExecutionRecord[] => {
  const have = new Set(input.existing.map((r) => key(r.weekOf, r.asset)));
  const out: ExecutionRecord[] = [];
  const assets = input.allocation.map((a) => a.asset);
  for (const weekOf of weeksBetween(input.settings.startedWeek, input.currentWeek)) {
    for (const asset of assets) {
      if (have.has(key(weekOf, asset))) continue;
      const band = input.bandsByWeek.get(key(weekOf, asset)) ?? null;
      out.push(snapshotWeek({ settings: input.settings, weekOf, asset, band, status: "skipped", allocation: input.allocation }));
    }
  }
  for (const asset of assets) {
    if (have.has(key(input.currentWeek, asset))) continue;
    const band = input.bandsByWeek.get(key(input.currentWeek, asset));
    if (band) {
      out.push(
        snapshotWeek({ settings: input.settings, weekOf: input.currentWeek, asset, band, status: "planned", allocation: input.allocation })
      );
    }
  }
  return out;
};

export const bandWeekKey = key;
