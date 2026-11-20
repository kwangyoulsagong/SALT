import { serverBffRead } from "@repo/web-shared/api/server";

import type { SavingsGoal, SavingsOverview } from "@/entities/goal";

/** 목록 · 요약 첫 숫자 — 데스크톱 `/goals` 와 같은 BFF 두 길, 병렬(서버 워터폴 0). 쿠키가 없거나 실패면 null — 브라우저가 부른다 */
export const serverGoalsFirst = () =>
  Promise.all([
    serverBffRead<SavingsGoal[]>("/api/app/savings/goals"),
    serverBffRead<SavingsOverview>("/api/app/savings/overview"),
  ]);
