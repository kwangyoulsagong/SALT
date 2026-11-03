"use client";

import { EmptyState } from "@repo/ui/emptyState";
import { ProgressBar } from "@repo/ui/progressBar";
import { Skeleton } from "@repo/ui/skeleton";

import { hasApiStatus } from "@repo/web-shared/api";
import { formatPrice } from "@repo/web-shared/lib";
import { panel, panelTitle } from "@repo/web-shared/ui/surface.css";

import { GOAL_MESSAGES, MilestoneBox, ProjectionLine, TEMPLATE_LABEL, useSavingsGoal } from "@/entities/goal";
import { DepositForm } from "@/features/record-deposit";

import { GOAL_DETAIL_PAGE as M } from "../model";
import * as s from "./goalDetail.css";

const won = (value: number) => `${formatPrice(value)}원`;

/**
 * 목표 상세(`FE-REQ-056` FR-4 · 5 · 7) — 진척 · 지금 기준 계획 · 이번 달 이정표 · 도달 시점 · 적립. 숫자는 전부 서버 응답.
 * 프레임(모은 돈 ↔ 남은 돈)은 서버 `frame` 이 정한다(FR-9).
 */
export const GoalDetailView = ({ goalId }: { goalId: string }) => {
  const query = useSavingsGoal(goalId);
  if (query.isSignedOut) return <EmptyState title={M.signedOut} />;
  if (query.isError) return <EmptyState title={hasApiStatus(query.error, 404) ? M.notFound : GOAL_MESSAGES.loadFailed} tone="error" />;
  if (!query.data) return <Skeleton height={320} />;

  const { goal, plan, deposits } = query.data;
  const lead =
    goal.frame === "saved"
      ? { label: GOAL_MESSAGES.saved, value: won(goal.saved), sub: `${GOAL_MESSAGES.remaining} ${won(goal.remaining)}` }
      : { label: GOAL_MESSAGES.remaining, value: won(goal.remaining), sub: `${GOAL_MESSAGES.saved} ${won(goal.saved)}` };

  return (
    <div className={s.columns}>
      <div className={s.stack}>
        <section className={panel} aria-label={goal.title}>
          <h1 className={panelTitle}>
            {goal.title} <span className={s.muted}>{TEMPLATE_LABEL[goal.template]}</span>
          </h1>
          <span className={s.muted}>{lead.label}</span>
          <strong className={panelTitle}>{lead.value}</strong>
          <ProgressBar value={goal.progressRatio} label={`${goal.title} ${goal.progressPercent}%`} />
          <span className={s.muted}>
            {goal.status === "completed" ? GOAL_MESSAGES.completed : `${goal.progressPercent}% · ${lead.sub}`} · {GOAL_MESSAGES.target}{" "}
            {won(goal.targetAmount)} · {GOAL_MESSAGES.depositCount(goal.depositCount)}
          </span>
        </section>

        <section className={panel} aria-label={M.planTitle}>
          <span className={s.muted}>{M.planTitle}</span>
          {plan.state === "ok" ? (
            <span className={s.depositRow}>
              <span>{goal.targetDate ? M.planMonthly : M.planReach}</span>
              <span>
                {goal.targetDate
                  ? plan.monthly !== null
                    ? won(plan.monthly)
                    : "—"
                  : plan.reachMonth
                    ? GOAL_MESSAGES.projection.plan(plan.reachMonth)
                    : "—"}
              </span>
            </span>
          ) : (
            <span className={s.muted}>{GOAL_MESSAGES.calculationState[plan.state]}</span>
          )}
          <MilestoneBox milestone={goal.milestone} />
          <ProjectionLine projection={goal.projection} />
        </section>
      </div>

      <div className={s.stack}>
        <section className={panel}>
          <DepositForm goalId={goal.id} />
        </section>
        <section className={panel} aria-label={M.deposits}>
          <span className={s.muted}>{M.deposits}</span>
          {deposits.length === 0 ? (
            <span className={s.muted}>{M.noDeposits}</span>
          ) : (
            <ul className={s.deposits}>
              {deposits.map((d) => (
                <li key={d.id} className={s.depositRow}>
                  <span>
                    {d.depositedOn}
                    {d.source === "imported_balance" ? ` · ${M.importedBalance}` : d.note ? ` · ${d.note}` : ""}
                  </span>
                  <span>{won(d.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};
