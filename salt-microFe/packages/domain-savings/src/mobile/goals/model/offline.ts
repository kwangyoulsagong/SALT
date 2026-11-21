import type { OfflineSnapshot } from "@repo/core/mobile";
import { offlineRowsFromSummary } from "@repo/web-shared/lib";

import { GOAL_MESSAGES, GOAL_SUMMARY_MESSAGES, formatWon, goalSummaryItems, type SavingsGoal, type SavingsOverview } from "@/entities/goal";

import { GOALS_MOBILE as M } from "./messages";

/** 저축 한 벌(`FE-REQ-073` FR-1) — 화면이 보인 글자 그대로: 요약 칸 · 목표 행(이름 · 모은 돈 · 목표 중 몇 %). 계산 0 */
export const goalsOfflineSnapshot = (goals: SavingsGoal[], overview: SavingsOverview | null): OfflineSnapshot => ({
  screen: "goals",
  title: M.title,
  sections: [
    { title: GOAL_SUMMARY_MESSAGES.label, rows: overview ? offlineRowsFromSummary(goalSummaryItems(overview)) : [] },
    {
      title: M.list,
      rows: goals.map((goal) => ({
        label: goal.title,
        value: formatWon(goal.saved),
        sub: GOAL_MESSAGES.rowTarget(formatWon(goal.targetAmount), goal.progressPercent),
      })),
    },
  ],
});
