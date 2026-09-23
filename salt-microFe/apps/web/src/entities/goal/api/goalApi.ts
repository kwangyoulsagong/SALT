import { apiFetch, authHeader } from "@/shared/api";
import { INVESTMENTS_BASE_URL } from "@/shared/config";
import { formatPrice } from "@/shared/lib";

import { GoalCategory, type GoalListItem, type GoalSummaryView } from "../model/types";

interface Envelope<T> {
  success: boolean;
  message?: string;
  data: T;
}

interface ServerGoal {
  id: string;
  category: string;
  /** Prisma Decimal — JSON 에서는 문자열이다 */
  currentAmount: string | number;
  targetAmount: string | number;
}

interface ServerGoalStatistics {
  totalGoals: number;
  activeGoals: number;
  completedGoals: number;
  totalSaved: number;
}

/**
 * 서버 분류 → 화면 아이콘. `features/add-goal/lib/goalRequest.ts` 의 역방향이다 —
 * 겹치는 셋만 있고 나머지(창업 · 창작 · 기타)는 화면에 맞는 아이콘이 없다.
 */
const SCREEN_CATEGORY: Readonly<Record<string, GoalCategory>> = {
  travel: GoalCategory.Trip,
  first_car: GoalCategory.Car,
  wedding: GoalCategory.Married,
};

export class GoalApiError extends Error {
  constructor(readonly status: number) {
    super(`goal api ${status}`);
  }
}

/** 금액은 서버 값의 **표시 포맷**만 한다 — 더하거나 나누지 않는다 */
const money = (value: string | number): string => formatPrice(Number(value));

/**
 * 목표 조회. **조회만 둔다** — mutation 은 `features/{slice}/api` 로 올린다 (`fsd-entities.md`).
 *
 * BFF 프록시(`/api/goals*`)를 부른다. 인증이 필요하다. 응답 모양을 화면 계약(변경 금지 목록 —
 * `FE-REQ-009` FR-36)으로 여기서 옮긴다 — 화면 컴포넌트는 서버 모양을 모른다.
 */
export const goalApi = {
  mySummary: async (): Promise<GoalSummaryView> => {
    const response = await apiFetch(`${INVESTMENTS_BASE_URL}/api/goals/statistics`, {
      headers: authHeader(),
    });
    if (!response.ok) throw new GoalApiError(response.status);

    const { data } = (await response.json()) as Envelope<ServerGoalStatistics>;
    return {
      saved: { money: money(data.totalSaved), thumbnail: null },
      process: {
        progress: data.activeGoals,
        complete: data.completedGoals,
        dday: null,
        percent: null,
      },
    };
  },

  progressList: async (): Promise<GoalListItem[]> => {
    const response = await apiFetch(`${INVESTMENTS_BASE_URL}/api/goals`, {
      headers: authHeader(),
    });
    if (!response.ok) throw new GoalApiError(response.status);

    const { data } = (await response.json()) as Envelope<{ goals: ServerGoal[] }>;
    return data.goals.map((goal) => ({
      id: goal.id,
      tag: SCREEN_CATEGORY[goal.category] ?? null,
      saved: money(goal.currentAmount),
      target: money(goal.targetAmount),
    }));
  },
};
