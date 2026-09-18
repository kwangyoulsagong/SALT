import { apiFetch, authHeader } from "@/shared/api";
import { INVESTMENTS_BASE_URL } from "@/shared/config";

import { ADD_GOAL_MESSAGES } from "../model/messages";
import { CreateGoalRequest } from "../model/types";

/**
 * mutation 은 feature 가 갖는다 (`fsd-entities.md` — entities/api 는 조회만).
 *
 * **`axios` 를 쓰지 않는다.** 이 화면은 axios 를 다른 데서 쓰지 않아서, 한 번의 POST 를
 * 위해 클라이언트 번들이 35kB 커졌다(실측). `apiFetch` 는 이미 이 앱의 진입점이다.
 */
export const addGoalApi = {
  create: async (body: CreateGoalRequest): Promise<void> => {
    const response = await apiFetch(`${INVESTMENTS_BASE_URL}/api/goals`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeader() },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(ADD_GOAL_MESSAGES.submitFailed);
    }
  },
};
