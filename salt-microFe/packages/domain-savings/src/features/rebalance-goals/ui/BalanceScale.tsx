"use client";

import { useMemo, useState, type FormEvent } from "react";

import { Button } from "@repo/ui/button";
import { TextField } from "@repo/ui/textField";

import { formatAmountInput, parseAmountInput, useDebouncedValue, labelOr, useAmountInputGuard } from "@repo/web-shared/lib";

import { GOAL_MESSAGES, formatMonth, formatWon, useSavingsSimulation, type PlanChangesRequest, type SavingsGoal, type SavingsSimProjection } from "@/entities/goal";

import { useUpdatePlans } from "../api";
import { REBALANCE_MESSAGES as M } from "../model";
import * as s from "./balance.css";

/** 입력이 멈춘 뒤 한 번만 서버 계산 — 서버 예산 300ms(FEATURE-012 비기능) */
const SIMULATE_DEBOUNCE_MS = 300;

const draftOf = (goals: SavingsGoal[]) => Object.fromEntries(goals.map((g) => [g.id, g.monthlyPlan !== null ? formatAmountInput(String(g.monthlyPlan)) : ""]));

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
  const [drafts, setDrafts] = useState<Record<string, string>>(() => draftOf(goals));
  const update = useUpdatePlans();
  const guard = useAmountInputGuard();

  const request = useMemo<PlanChangesRequest | null>(() => {
    const changes = goals.flatMap((g) => {
      const monthly = parseAmountInput(drafts[g.id] ?? "");
      return monthly !== null && monthly !== g.monthlyPlan ? [{ goalId: g.id, monthly }] : [];
    });
    return changes.length > 0 ? { changes } : null;
  }, [goals, drafts]);
  const settled = useDebouncedValue(request, SIMULATE_DEBOUNCE_MS);
  const sim = useSavingsSimulation(settled);
  const rows = settled && sim.data ? new Map(sim.data.rows.map((r) => [r.goalId, r])) : null;

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    guard.clear();
    if (!request) return;
    update.mutate(request, { onSuccess: (next) => setDrafts(draftOf(next.filter((g) => g.status === "active"))) });
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
                value={drafts[g.id] ?? ""}
                onChange={(v) => guard.take(v, (value) => setDrafts((d) => ({ ...d, [g.id]: value })))}
                inputMode="numeric"
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
        {guard.message ?? (sim.isError ? M.calcFailed : update.isError ? M.failed : update.isSuccess && !request ? M.saved : "")}
      </span>
      <div className={s.actions}>
        <Button type="submit" disabled={!request || update.isPending} loading={update.isPending}>
          {M.confirm}
        </Button>
        <Button type="button" variant="secondary" disabled={!request} onClick={() => setDrafts(draftOf(goals))}>
          {M.reset}
        </Button>
      </div>
    </form>
  );
};
