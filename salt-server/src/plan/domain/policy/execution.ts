/**
 * 실행 기록 — 수동 체크만(`SRV-REQ-020` FR-40~45 · ADR-002). 원장 · 보유 거래를 보지 않는다.
 * 주 단위로 센다: 그 주 자산 하나라도 실행이면 "실행한 주". 점수 · 등급 · 평가 문구 0 — 코드와 수치만.
 */
import { PlanExecutionInvalidError } from "../errors";
import { addWeeks } from "./weekBoundary";
import type { ExecutionRecord } from "../types";

/** 실제 금액 — 생략하면 계획액. 정수 · 0 이상 · 주간 기본액 × N 이하(FR-41) */
export const executedAmount = (
  row: Pick<ExecutionRecord, "asset" | "weeklyBaseKrw" | "plannedKrw">,
  amountKrw: number | undefined,
  capMultiple: number
): number => {
  const max = row.weeklyBaseKrw * capMultiple;
  const value = amountKrw ?? row.plannedKrw;
  if (!Number.isSafeInteger(value) || value < 0 || value > max) throw new PlanExecutionInvalidError(row.asset, max);
  return value;
};

export interface Streak {
  /** 연속 실행 주 — 이번 주를 아직 안 했으면 지난 주부터 센다(이번 주는 끝나지 않았다) */
  weeks: number;
  cumulativeKrw: number;
  /** 지난 12주(이번 주 제외) 중 실행 0 인 주 */
  skippedLast12: number;
  /** 지난 12주 중 계획이 있던 주 — "12주 중 3주"의 분모 */
  plannedLast12: number;
}

export const streakOf = (rows: ReadonlyArray<Pick<ExecutionRecord, "weekOf" | "status" | "executedKrw">>, currentWeek: string): Streak => {
  const executedWeeks = new Set<string>();
  const plannedWeeks = new Set<string>();
  let cumulative = 0;
  for (const r of rows) {
    plannedWeeks.add(r.weekOf);
    if (r.status === "executed") {
      executedWeeks.add(r.weekOf);
      cumulative += r.executedKrw ?? 0;
    }
  }
  let weeks = 0;
  for (let w = executedWeeks.has(currentWeek) ? currentWeek : addWeeks(currentWeek, -1); executedWeeks.has(w); w = addWeeks(w, -1)) {
    weeks += 1;
  }
  let skipped = 0;
  let planned = 0;
  for (let i = 1; i <= 12; i += 1) {
    const w = addWeeks(currentWeek, -i);
    if (!plannedWeeks.has(w)) continue;
    planned += 1;
    if (!executedWeeks.has(w)) skipped += 1;
  }
  return { weeks, cumulativeKrw: cumulative, skippedLast12: skipped, plannedLast12: planned };
};
