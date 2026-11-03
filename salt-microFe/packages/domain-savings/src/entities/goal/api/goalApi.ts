import { apiFetch, authHeader, readApiError } from "@repo/web-shared/api";
import { INVESTMENTS_BASE_URL } from "@repo/web-shared/config";

import type { CalculationRequest, SavingsCalculation, SavingsGoal, SavingsGoalDetail, SavingsTemplate } from "../model/types";

/**
 * 저축 조회 — BFF `/api/app/savings/*`(`BFF-REQ-047`). 조회만(`fsd-entities.md`). 쓰기는 `features/create-goal` · `record-deposit`.
 * `calculate` 는 POST 지만 저장하지 않는 계산이라 조회 쪽에 둔다(만들기 · 상세가 같이 쓴다).
 * BFF 주소는 투자와 같은 BFF(`INVESTMENTS_BASE_URL` — 이름은 옛것, 값은 BFF REST origin).
 */
const SAVINGS = `${INVESTMENTS_BASE_URL}/api/app/savings`;

const read = async <T>(response: Response, name: string): Promise<T> => {
  if (!response.ok) throw await readApiError(response, name);
  return (await response.json()) as T;
};

export const goalApi = {
  list: async (signal?: AbortSignal): Promise<SavingsGoal[]> =>
    read(await apiFetch(`${SAVINGS}/goals`, { headers: authHeader(), signal }), "savings-goals"),

  detail: async (id: string, signal?: AbortSignal): Promise<SavingsGoalDetail> =>
    read(await apiFetch(`${SAVINGS}/goals/${encodeURIComponent(id)}`, { headers: authHeader(), signal }), "savings-goal"),

  templates: async (signal?: AbortSignal): Promise<SavingsTemplate[]> =>
    read(await apiFetch(`${SAVINGS}/templates`, { headers: authHeader(), signal }), "savings-templates"),

  calculate: async (body: CalculationRequest, signal?: AbortSignal): Promise<SavingsCalculation> =>
    read(
      await apiFetch(`${SAVINGS}/calculate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify(body),
        signal,
      }),
      "savings-calculate",
    ),
};
