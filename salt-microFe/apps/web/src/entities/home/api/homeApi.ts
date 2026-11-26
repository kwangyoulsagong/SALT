import { apiFetch, readApiError } from "@repo/web-shared/api";
import { INVESTMENTS_BASE_URL } from "@repo/web-shared/config";

import type { AppHomeVM, CoachBriefing, HomeMarketVM, WeeklyPlanVM } from "../model/types";

/** 셸 홈 — `GET /api/app/home` (`BFF-REQ-046`). 화면 모양 그대로 온다 — 옮기지 않는다 */
export const homeApi = {
  cards: async (signal?: AbortSignal): Promise<AppHomeVM> => {
    const response = await apiFetch(`${INVESTMENTS_BASE_URL}/api/app/home`, {
      signal,
    });
    if (!response.ok) throw await readApiError(response, "home");
    return (await response.json()) as AppHomeVM;
  },
  /** 시장 블록 — `GET /api/app/home/market`(`BFF-REQ-046` FR-14). 무엇을 보일지는 BFF 가 골랐다 */
  market: async (signal?: AbortSignal): Promise<HomeMarketVM> => {
    const response = await apiFetch(`${INVESTMENTS_BASE_URL}/api/app/home/market`, { signal });
    if (!response.ok) throw await readApiError(response, "home-market");
    return (await response.json()) as HomeMarketVM;
  },
  /** 오늘의 코치 브리핑 — `GET /api/app/coach/briefing`(`BFF-REQ-028`). 대화 화면 첫 메시지와 같은 문장. 봉투 `{ success, data }` */
  briefing: async (signal?: AbortSignal): Promise<CoachBriefing> => {
    const response = await apiFetch(`${INVESTMENTS_BASE_URL}/api/app/coach/briefing`, { signal });
    if (!response.ok) throw await readApiError(response, "home-briefing");
    return ((await response.json()) as { data: CoachBriefing }).data;
  },
  /** 이번 주 적립 — `GET /api/app/plan/weekly`(`BFF-REQ-021`). 금액은 서버 값. 봉투 `{ success, data }` */
  weeklyPlan: async (signal?: AbortSignal): Promise<WeeklyPlanVM> => {
    const response = await apiFetch(`${INVESTMENTS_BASE_URL}/api/app/plan/weekly`, { signal });
    if (!response.ok) throw await readApiError(response, "home-plan");
    return ((await response.json()) as { data: WeeklyPlanVM }).data;
  },
};
