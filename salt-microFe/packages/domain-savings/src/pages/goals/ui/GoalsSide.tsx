"use client";

import { useSavingsGoals, type SavingsGoal } from "@/entities/goal";
import { GoalTools } from "@/widgets/goal-tools";

/** 오른쪽 사이드 — 본문과 같은 목록 조회 키라 요청은 한 번. 목록이 없으면 비운다(빈 사이드는 PageFrame 이 접는다) */
export const GoalsSide = ({ initialGoals }: { initialGoals: SavingsGoal[] | null }) => {
  const goals = useSavingsGoals(initialGoals);
  if (!goals.data || goals.data.length === 0) return null;
  return <GoalTools goals={goals.data} />;
};
