"use client";

import { EmptyState } from "@repo/ui/emptyState";
import { Skeleton } from "@repo/ui/skeleton";

import { ROUTES } from "@repo/web-shared/config";

import { GOAL_MESSAGES, GoalCard, useSavingsGoals } from "@/entities/goal";
import { SplitDepositForm } from "@/features/record-deposit";

import { GOALS_PAGE } from "../model";
import * as s from "./goals.css";

/** 나눠 넣기는 진행 중 목표가 둘 이상일 때만 의미가 있다 */
const SPLIT_MIN_GOALS = 2;

/**
 * 목표 목록 + 나눠 넣기. 토큰이 브라우저 저장소에 있어 서버가 볼 수 없다 — 첫 숫자 서버 렌더(FR-13)는 `FE-REQ-013`(쿠키) 뒤.
 */
export const GoalsBoard = () => {
  const goals = useSavingsGoals();
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
    </>
  );
};
