/**
 * 금액 — 기본액 환산 · 배수 · 1,000원 반올림(`SRV-REQ-020` FR-5 · FR-70~72 · 공통 수용 기준 3 "금액은 서버").
 *
 * **계산은 Decimal, 결과는 원 정수.** 이 값들은 중간값이 아니라 사람에게 보이는 **계획 금액(최종값)** 이다 —
 * 저축 월 적립 올림과 같은 예외(`kotlin-platform.md` §3): 반올림은 각 금액에 한 번, 1,000원 단위.
 */
import Decimal from "decimal.js";

import { PlanBaseAmountInvalidError } from "../errors";
import type { PlanAsset, PlanConfig, PlanSettingsRecord } from "../types";

const UNIT = 1000;

/** 1,000원 단위 반올림(0.5 는 올림) */
export const roundToUnit = (value: Decimal): number =>
  value.div(UNIT).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).times(UNIT).toNumber();

/** 월 적립액 검증 — 정수 · 1,000원 단위 · 하한 · 상한(설정값). 어기면 422 `PLAN_BASE_AMOUNT_INVALID`(FR-72) */
export const assertMonthlyBase = (value: number, config: Pick<PlanConfig, "monthlyMinKrw" | "monthlyMaxKrw">): void => {
  const ok =
    Number.isSafeInteger(value) && value % UNIT === 0 && value >= config.monthlyMinKrw && value <= config.monthlyMaxKrw;
  if (!ok) throw new PlanBaseAmountInvalidError(config.monthlyMinKrw, config.monthlyMaxKrw, UNIT);
};

/** 배분 검증 — 자산이 겹치지 않고 몫 합이 100. 기동 때 한 번(설정 오류는 서버가 뜨지 않게) */
export const assertAllocation = (allocation: PlanConfig["allocation"]): void => {
  const assets = new Set(allocation.map((a) => a.asset));
  const sum = allocation.reduce((s, a) => s.plus(a.pct), new Decimal(0));
  if (assets.size !== allocation.length || !sum.eq(100) || allocation.some((a) => a.pct < 0)) {
    throw new Error(`적립 배분이 틀렸다 — 자산 중복 없이 몫 합 100 이어야 한다: ${JSON.stringify(allocation)}`);
  }
};

/** 주간 기본액 = 자산 월 몫 × 12 ÷ 52, 1,000원 반올림(FR-71). 월 1,300,000 · 50% → 150,000 */
export const weeklyBaseKrw = (monthlyKrw: number, pct: number): number =>
  roundToUnit(new Decimal(monthlyKrw).times(pct).div(100).times(12).div(52));

/** 그 주에 쓰는 월 적립액 — 수정은 다음 주부터(FR-75) */
export const monthlyForWeek = (settings: PlanSettingsRecord, weekOf: string): number =>
  weekOf >= settings.effectiveWeek ? settings.monthlyBaseKrw : (settings.previousMonthlyBaseKrw ?? settings.monthlyBaseKrw);

/** 그 주 자산 기본액 */
export const weeklyBaseFor = (
  settings: PlanSettingsRecord,
  weekOf: string,
  asset: PlanAsset,
  allocation: PlanConfig["allocation"]
): number => {
  const pct = allocation.find((a) => a.asset === asset)?.pct ?? 0;
  return weeklyBaseKrw(monthlyForWeek(settings, weekOf), pct);
};

/** 이번 주 계획 금액 = 기본액 × 배수, 1,000원 반올림(FR-5). 배수 0 이면 0 */
export const plannedKrw = (weeklyBase: number, multiplier: number): number =>
  roundToUnit(new Decimal(weeklyBase).times(multiplier));
