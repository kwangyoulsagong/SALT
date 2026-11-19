/**
 * 이번 달 적립 합계(`SRV-REQ-020` FR-80~83) — 귀속 달 = `weekOf`(KST 월요일)의 달. 금액 · 진행률 · 남은 일수 전부 서버.
 * 평가 문구 0 — 수치만.
 */
import Decimal from "decimal.js";

import { daysBetween, monthRange, mondaysInMonth } from "./weekBoundary";
import type { ExecutionRecord } from "../types";

export interface MonthlySummary {
  month: string;
  executedKrw: number;
  plannedKrw: number;
  /** 0~100 소수 1자리 — 계획 0 이면 null */
  progressPct: number | null;
  executedWeeks: number;
  /** 그 달 월요일 중 시작 주 이후 */
  totalWeeks: number;
  /** 오늘(KST)부터 말일까지 — 지난 달이면 0, 다음 달이면 그 달 일수 */
  daysLeft: number;
}

export const monthlySummary = (input: {
  month: string;
  today: string;
  startedWeek: string | null;
  rows: ReadonlyArray<Pick<ExecutionRecord, "weekOf" | "status" | "plannedKrw" | "executedKrw">>;
}): MonthlySummary => {
  const { first, last } = monthRange(input.month);
  const inMonth = input.rows.filter((r) => r.weekOf >= first && r.weekOf <= last);
  const executed = inMonth.filter((r) => r.status === "executed");
  const executedKrw = executed.reduce((s, r) => s + (r.executedKrw ?? 0), 0);
  const plannedKrw = inMonth.reduce((s, r) => s + r.plannedKrw, 0);
  const progressPct =
    plannedKrw === 0
      ? null
      : new Decimal(executedKrw).div(plannedKrw).times(100).toDecimalPlaces(1, Decimal.ROUND_HALF_UP).toNumber();
  const started = input.startedWeek;
  const totalWeeks = started === null ? 0 : mondaysInMonth(input.month).filter((w) => w >= started).length;
  const daysLeft = input.today > last ? 0 : daysBetween(input.today < first ? first : input.today, last) + 1;
  return {
    month: input.month,
    executedKrw,
    plannedKrw,
    progressPct,
    executedWeeks: new Set(executed.map((r) => r.weekOf)).size,
    totalWeeks,
    daysLeft,
  };
};
