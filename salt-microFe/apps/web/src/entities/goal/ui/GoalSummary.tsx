"use client";

// 클라이언트 잎: React Query 로 조회한다.
import { Padding } from "@repo/ui/padding";

import { useGoalSummary } from "../api";
import { GOAL_MESSAGES } from "../model/messages";
import { GoalProgressFooter } from "./GoalProgressFooter";
import { GoalSavedSection } from "./GoalSavedSection";
import { Container } from "./GoalSummary.css";

/** 표시 전용. 목표를 만들거나 고치는 것은 `features/add-goal` 이다. */
export const GoalSummary = () => {
  const summary = useGoalSummary();

  // `isLoading` 이 아니라 `isPending` 이다 — 재시도 대기 구간에서는 `isLoading` 이 false
  // 인데(`fetchStatus === "idle"`) 아직 `data` 가 없다. 그 틈에 렌더가 걸리면 죽는다.
  if (summary.isPending) return <div>{GOAL_MESSAGES.loading}</div>;
  if (summary.isError) return <div>{GOAL_MESSAGES.loadFailed}</div>;
  return (
    <section className={Container}>
      <Padding padding="lg">
        <GoalSavedSection saved={summary.data.saved} />
      </Padding>
      <GoalProgressFooter process={summary.data.process} />
    </section>
  );
};

export default GoalSummary;
