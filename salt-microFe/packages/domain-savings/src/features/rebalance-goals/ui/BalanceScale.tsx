"use client";

import { type FormEvent } from "react";

import { numberToInputText } from "@repo/core/input";

import { Button } from "@repo/ui/button";
import { TextField } from "@repo/ui/textField";

import { parseAmountInput, useDebouncedValue, labelOr, useNumberFields } from "@repo/web-shared/lib";

import { GOAL_MESSAGES, formatMonth, formatWon, useSavingsSimulation, type PlanChangesRequest, type SavingsGoal, type SavingsSimProjection } from "@/entities/goal";

import { useUpdatePlans } from "../api";
import { REBALANCE_MESSAGES as M } from "../model";
import * as s from "./balance.css";

/** 입력이 멈춘 뒤 한 번만 서버 계산 — 서버 예산 300ms(FEATURE-012 비기능) */
const SIMULATE_DEBOUNCE_MS = 300;


/** 처음 칸 글자 — 계획 숫자를 같은 규칙으로(`numberToInputText`) */
const planTexts = (goals: SavingsGoal[]): Record<string, string> =>
  Object.fromEntries(goals.map((g) => [g.id, g.monthlyPlan === null ? "" : numberToInputText(g.monthlyPlan, "won")]));

/** 구간 한 줄 — 경험 구간이 있으면 구간, 없으면 계획대로면 X월(한 점 날짜를 단정하지 않는다, FR-5) */
const projectionText = (p: SavingsSimProjection): string => {
  if (p.earlyMonth && p.lateMonth) return GOAL_MESSAGES.projection.range(p.earlyMonth, p.lateMonth);
  if (p.earlyMonth) return GOAL_MESSAGES.projection.openLate(p.earlyMonth);
  if (p.planMonth) return GOAL_MESSAGES.projection.plan(p.planMonth);
  return labelOr(GOAL_MESSAGES.projectionReason, p.reason, "—");
};

/**
 * 목표 저울(`FE-REQ-056` FR-6) — 진행 중 목표마다 월 적립을 바꿔 보면 서버가 목표별 구간 변화를 돌려준다. **[확정]만 저장한다.**
 * 숫자(합계 · 구간 · 이동 달 수)는 전부 서버 응답 — 화면은 입력을 보내고 보여 줄 뿐이다(FE 계산 0).
 */
export const BalanceScale = ({ goals }: { goals: SavingsGoal[] }) => {
  // 목표마다 칸(원 단위) — 값과 안내를 한 덩어리로. 계획을 칸에 넣는 것도(처음 · 확정 뒤 · 되돌리기) 같은 규칙(`setNumber`)을 지난다
  const nums = useNumberFields({}, planTexts(goals), "won");
  const loadPlans = (list: SavingsGoal[]) => list.forEach((g) => nums.setNumber(g.id, g.monthlyPlan));
  const update = useUpdatePlans();

  // 바꾼 목표만 — 목표 수만큼 글자 읽기라 가볍다(메모 없이)
  const changes = goals.flatMap((g) => {
    const monthly = parseAmountInput(nums.value(g.id));
    return monthly !== null && monthly !== g.monthlyPlan ? [{ goalId: g.id, monthly }] : [];
  });
  const request: PlanChangesRequest | null = changes.length > 0 ? { changes } : null;
  // 디바운스는 바뀐 내용(글자)으로 — 객체는 렌더마다 새로 만들어져 비교가 늘 다르다
  const requestKey = request ? JSON.stringify(request) : "";
  const settledKey = useDebouncedValue(requestKey, SIMULATE_DEBOUNCE_MS);
  const settled: PlanChangesRequest | null = settledKey ? (JSON.parse(settledKey) as PlanChangesRequest) : null;
  const sim = useSavingsSimulation(settled);
  const rows = settled && sim.data ? new Map(sim.data.rows.map((r) => [r.goalId, r])) : null;

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!request) return;
    update.mutate(request, { onSuccess: (next) => loadPlans(next.filter((g) => g.status === "active")) });
  };

  return (
    <form className={s.form} onSubmit={onSubmit} aria-label={M.title}>
      <ul className={s.rows}>
        {goals.map((g) => {
          const row = rows?.get(g.id);
          const changed = request?.changes.some((c) => c.goalId === g.id) ?? false;
          return (
            <li key={g.id} className={s.row}>
              <TextField
                label={M.monthly(g.title)}
                value={nums.value(g.id)}
                onChange={(v) => nums.change(g.id, v)}
                inputMode="numeric"
                error={nums.message(g.id)}
              />
              <div className={s.result} aria-live="polite">
                <span className={s.label}>{row ? projectionText(row.before) : g.monthlyPlan === null ? M.noPlan : GOAL_MESSAGES.projection.title}</span>
                {changed && row ? (
                  <>
                    <span className={s.value}>{projectionText(row.after)}</span>
                    {row.planShiftMonths !== null ? <span className={s.label}>{M.shift(row.planShiftMonths)}</span> : null}
                    {row.afterMeetsDeadline === false && row.deadlineMonth ? (
                      <span className={s.label}>{M.deadlineMissed(formatMonth(row.deadlineMonth))}</span>
                    ) : null}
                  </>
                ) : (
                  <span className={s.label}>{M.unchanged}</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {sim.data && settled ? (
        <span className={s.value}>
          {M.total} {M.totalChange(formatWon(sim.data.totalMonthlyBefore), formatWon(sim.data.totalMonthlyAfter))}
        </span>
      ) : null}
      <span className={s.label} role="status">
        {sim.isError ? M.calcFailed : update.isError ? M.failed : update.isSuccess && !request ? M.saved : ""}
      </span>
      <div className={s.actions}>
        <Button type="submit" disabled={!request || update.isPending} loading={update.isPending}>
          {M.confirm}
        </Button>
        <Button type="button" variant="secondary" disabled={!request} onClick={() => loadPlans(goals)}>
          {M.reset}
        </Button>
      </div>
    </form>
  );
};
