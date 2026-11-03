import { apiFetch, authHeader, readApiError } from "@repo/web-shared/api";
import { INVESTMENTS_BASE_URL } from "@repo/web-shared/config";

import type {
  CalculationRequest,
  EmergencyRequest,
  PlanChangesRequest,
  SavingsCalculation,
  SavingsEmergency,
  SavingsGoal,
  SavingsGoalDetail,
  SavingsSimulation,
  SavingsTemplate,
} from "../model/types";

/**
 * 저축 조회 — BFF `/api/app/savings/*`(`BFF-REQ-047`). 조회만(`fsd-entities.md`). 쓰기는 `features/create-goal` · `record-deposit`.
 * `calculate` · `simulate` · `emergency` 는 POST 지만 저장하지 않는 계산이라 조회 쪽에 둔다(만들기 · 상세 · 목록이 같이 쓴다).
 * BFF 주소는 투자와 같은 BFF(`INVESTMENTS_BASE_URL` — 이름은 옛것, 값은 BFF REST origin).
 */
/** 저축 BFF 경로 — 조회(여기) · 쓰기(features)가 같이 쓴다. 주소 · 응답 읽기를 한 곳에(코드 리뷰 2026-11-03) */
export const SAVINGS_API = `${INVESTMENTS_BASE_URL}/api/app/savings`;
const SAVINGS = SAVINGS_API;

const read = async <T>(response: Response, name: string): Promise<T> => {
  if (!response.ok) throw await readApiError(response, name);
  return (await response.json()) as T;
};

/** 저축 쓰기 요청 하나 — JSON 본문(있으면) · 인증 · 오류 정규화. features 의 mutation 이 쓴다 */
export const savingsRequest = async <T>(method: "POST" | "PUT" | "DELETE", path: string, body: unknown, name: string): Promise<T> =>
  read<T>(
    await apiFetch(`${SAVINGS}${path}`, {
      method,
      headers: body === undefined ? authHeader() : { "Content-Type": "application/json", ...authHeader() },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }),
    name,
  );

export const goalApi = {
  list: async (signal?: AbortSignal): Promise<SavingsGoal[]> =>
    read(await apiFetch(`${SAVINGS}/goals`, { headers: authHeader(), signal }), "savings-goals"),

  detail: async (id: string, signal?: AbortSignal): Promise<SavingsGoalDetail> =>
    read(await apiFetch(`${SAVINGS}/goals/${encodeURIComponent(id)}`, { headers: authHeader(), signal }), "savings-goal"),

  templates: async (signal?: AbortSignal): Promise<SavingsTemplate[]> =>
    read(await apiFetch(`${SAVINGS}/templates`, { headers: authHeader(), signal }), "savings-templates"),

  calculate: async (body: CalculationRequest, signal?: AbortSignal): Promise<SavingsCalculation> =>
    read(await postJson(`${SAVINGS}/calculate`, body, signal), "savings-calculate"),

  /** 목표 저울(`SRV-REQ-045` FR-7) — 저장하지 않는다 */
  simulate: async (body: PlanChangesRequest, signal?: AbortSignal): Promise<SavingsSimulation> =>
    read(await postJson(`${SAVINGS}/simulate`, body, signal), "savings-simulate"),

  /** 비상시 비교(FR-12) — 저장하지 않는다 */
  emergency: async (id: string, body: EmergencyRequest, signal?: AbortSignal): Promise<SavingsEmergency> =>
    read(await postJson(`${SAVINGS}/goals/${encodeURIComponent(id)}/emergency-compare`, body, signal), "savings-emergency"),
};

function postJson(url: string, body: unknown, signal?: AbortSignal): Promise<Response> {
  return apiFetch(url, { method: "POST", headers: { "Content-Type": "application/json", ...authHeader() }, body: JSON.stringify(body), signal });
}
