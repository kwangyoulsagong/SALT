"use client";

import { useSavingsGoals, type SavingsGoal } from "@/entities/goal";
import { GoalTools } from "@/widgets/goal-tools";

/** 오른쪽 사이드 — 본문과 같은 목록 조회 키라 요청은 한 번. 목록이 없으면 비운다(빈 사이드는 PageFrame 이 접는다) */
export const GoalsSide = ({ initialGoals }: { initialGoals: SavingsGoal[] | null }) => {
  const goals = useSavingsGoals(initialGoals);
  if (!goals.data || goals.data.length === 0) return null;
  // 도구 셋을 카드 한 장에(카드 판에서 사이드 직계 자식 하나 = 카드 하나 — `FE-REQ-076` FR-2, 휴대폰 "저축 도구" 카드와 같은 묶음)
  return (
    <div>
      <GoalTools goals={goals.data} />
    </div>
  );
};
