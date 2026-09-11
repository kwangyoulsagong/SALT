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

  if (summary.isLoading) return <div>{GOAL_MESSAGES.loading}</div>;
  if (summary.error) return <div>{GOAL_MESSAGES.loadFailed}</div>;
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
