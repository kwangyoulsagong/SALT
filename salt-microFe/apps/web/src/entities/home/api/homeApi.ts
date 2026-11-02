import { apiFetch, authHeader, readApiError } from "@repo/web-shared/api";
import { INVESTMENTS_BASE_URL } from "@repo/web-shared/config";

import type { AppHomeVM } from "../model/types";

/** 셸 홈 — `GET /api/app/home` (`BFF-REQ-046`). 화면 모양 그대로 온다 — 옮기지 않는다 */
export const homeApi = {
  cards: async (signal?: AbortSignal): Promise<AppHomeVM> => {
    const response = await apiFetch(`${INVESTMENTS_BASE_URL}/api/app/home`, {
      headers: authHeader(),
      signal,
    });
    if (!response.ok) throw await readApiError(response, "home");
    return (await response.json()) as AppHomeVM;
  },
};
