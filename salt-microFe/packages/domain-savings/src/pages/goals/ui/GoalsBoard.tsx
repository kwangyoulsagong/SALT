"use client";

import { EmptyState } from "@repo/ui/emptyState";
import { Skeleton } from "@repo/ui/skeleton";

import { ROUTES } from "@repo/web-shared/config";
import { panel, panelDescription, panelTitle } from "@repo/web-shared/ui/surface.css";

import { GOAL_MESSAGES, GoalCard, PostcardList, useSavingsGoals, type SavingsGoal } from "@/entities/goal";
import { BalanceScale, REBALANCE_MESSAGES } from "@/features/rebalance-goals";
import { SplitDepositForm } from "@/features/record-deposit";

import { GOALS_PAGE } from "../model";
import * as s from "./goals.css";

/** 나눠 넣기는 진행 중 목표가 둘 이상일 때만 의미가 있다 */
const SPLIT_MIN_GOALS = 2;

/**
 * 목표 목록 + 나눠 넣기 + 목표 저울 + 엽서 보관함(S1b). 첫 숫자는 서버가 쿠키로 받아 넘긴다(`initialGoals`, FR-13) — 없으면 브라우저가 부른다.
 */
export const GoalsBoard = ({ initialGoals }: { initialGoals: SavingsGoal[] | null }) => {
  const goals = useSavingsGoals(initialGoals);
  if (goals.isSignedOut) return <EmptyState title={GOALS_PAGE.signedOut} />;
  if (goals.isError) return <EmptyState title={GOAL_MESSAGES.loadFailed} tone="error" />;
  if (!goals.data) return <Skeleton height={160} />;
  if (goals.data.length === 0) return <EmptyState title={GOALS_PAGE.empty} description={GOALS_PAGE.emptyDescription} />;

  const active = goals.data.filter((g) => g.status === "active");
  return (
    <>
      <ul className={s.list}>
        {goals.data.map((goal) => (
          <li key={goal.id}>
            <GoalCard goal={goal} href={ROUTES.goal(goal.id)} />
          </li>
        ))}
      </ul>
      {active.length >= SPLIT_MIN_GOALS ? (
        <div className={s.side}>
          <SplitDepositForm goals={active} />
        </div>
      ) : null}
      {active.length > 0 ? (
        <section className={panel} aria-label={REBALANCE_MESSAGES.title}>
          <h2 className={panelTitle}>{REBALANCE_MESSAGES.title}</h2>
          <p className={panelDescription}>{REBALANCE_MESSAGES.description}</p>
          {/* 진행 중 목표 구성이 바뀌면(새 목표 · 다 참) 입력 칸을 새로. 계획 금액은 키에 넣지 않는다 — 확정 응답으로 다시 마운트되면 "바꿨어요" 상태가 사라진다(실측 2026-11-03) */}
          <BalanceScale key={active.map((g) => g.id).join("|")} goals={active} />
        </section>
      ) : null}
      <PostcardList goals={goals.data} />
    </>
  );
};
