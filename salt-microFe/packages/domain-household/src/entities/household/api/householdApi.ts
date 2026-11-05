import { apiFetch, readApiError } from "@repo/web-shared/api";
import { INVESTMENTS_BASE_URL } from "@repo/web-shared/config";

import type {
  ChallengeList,
  GoalClock,
  HouseholdBudget,
  HouseholdCategories,
  HouseholdMonth,
  HouseholdStory,
  HouseholdSuggestions,
  ParseResult,
  RecurringTemplateList,
  WorkHoursSetting,
} from "../model/types";
import type { HouseholdPeople, RevolvingList } from "../model/ledger";

/**
 * 가계부 조회 — BFF `/api/app/household/*`(`BFF-REQ-048`). 조회만(`fsd-entities.md`). 쓰기는 `features/record-expense` · `edit-budget`.
 * `parse` 는 POST 지만 저장하지 않는다 — 붙여넣기 · 한 줄 입력이 같이 쓴다. **원문은 요청 본문으로만 나간다**(저장 · 로그 0).
 * BFF 주소는 저축과 같은 BFF(`INVESTMENTS_BASE_URL` — 이름은 옛것, 값은 BFF REST origin).
 */
export const HOUSEHOLD_API = `${INVESTMENTS_BASE_URL}/api/app/household`;

const read = async <T>(response: Response, name: string): Promise<T> => {
  if (!response.ok) throw await readApiError(response, name);
  return (await response.json()) as T;
};

/** 가계부 쓰기 요청 하나 — JSON 본문(있으면) · 인증 · 오류 정규화. features 의 mutation 이 쓴다 */
export const householdRequest = async <T>(method: "POST" | "PUT" | "DELETE", path: string, body: unknown, name: string): Promise<T> =>
  read<T>(
    await apiFetch(`${HOUSEHOLD_API}${path}`, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }),
    name,
  );

export const householdApi = {
  month: async (ym: string, signal?: AbortSignal): Promise<HouseholdMonth> =>
    read(await apiFetch(`${HOUSEHOLD_API}/month/${encodeURIComponent(ym)}`, { signal }), "household-month"),

  suggestions: async (signal?: AbortSignal): Promise<HouseholdSuggestions> =>
    read(await apiFetch(`${HOUSEHOLD_API}/suggestions`, { signal }), "household-suggestions"),

  /** 반복 템플릿 + 이번 달 예정 행(가계부 S1b) */
  templates: async (signal?: AbortSignal): Promise<RecurringTemplateList> =>
    read(await apiFetch(`${HOUSEHOLD_API}/templates`, { signal }), "household-templates"),

  /** 노동시간 환산 설정(가계부 S1c) */
  workHours: async (signal?: AbortSignal): Promise<WorkHoursSetting> =>
    read(await apiFetch(`${HOUSEHOLD_API}/settings/work-hours`, { signal }), "household-work-hours"),

  /** 챌린지 목록 + 보탤 수 있는 목표(가계부 S1d) */
  challenges: async (signal?: AbortSignal): Promise<ChallengeList> =>
    read(await apiFetch(`${HOUSEHOLD_API}/challenges`, { signal }), "household-challenges"),

  /** 분류 표 — 기본 12 + 내 분류(보관 포함, 가계부 S1f) */
  categories: async (signal?: AbortSignal): Promise<HouseholdCategories> =>
    read(await apiFetch(`${HOUSEHOLD_API}/categories`, { signal }), "household-categories"),
  /** 이야기 카드(가계부 S1g) — period = YYYY-MM | YYYY. 줄 · 금액 · 몫은 서버 */
  story: async (period: string, signal?: AbortSignal): Promise<HouseholdStory> =>
    read(await apiFetch(`${HOUSEHOLD_API}/story/${encodeURIComponent(period)}`, { signal }), "household-story"),
  /** 리볼빙 명세서 + 6개월 추정(가계부 S1h) */
  revolving: async (signal?: AbortSignal): Promise<RevolvingList> =>
    read(await apiFetch(`${HOUSEHOLD_API}/revolving`, { signal }), "household-revolving"),

  /** 사람 장부(가계부 S1h) — year 없으면 올해 · person 이 있으면 그 사람의 모든 해 */
  people: async (year: number | null, person: string | null, signal?: AbortSignal): Promise<HouseholdPeople> => {
    const params = new URLSearchParams();
    if (year !== null) params.set("year", String(year));
    if (person) params.set("person", person);
    const qs = params.toString();
    return read(await apiFetch(`${HOUSEHOLD_API}/people${qs ? `?${qs}` : ""}`, { signal }), "household-people");
  },
  budget: async (signal?: AbortSignal): Promise<HouseholdBudget | null> =>
    read(await apiFetch(`${HOUSEHOLD_API}/budget`, { signal }), "household-budget"),

  /** 저장 응답이 `pending` 이었을 때 다시 묻는다 — 금액은 서버가 준 `savedTotal` 그대로 */
  goalClock: async (amount: number, signal?: AbortSignal): Promise<GoalClock> =>
    read(await apiFetch(`${HOUSEHOLD_API}/goal-clock?amount=${amount}`, { signal }), "household-goal-clock"),

  /** 저장하지 않는 파싱 — 원문은 본문으로만 */
  parse: async (mode: "line" | "messages", text: string, signal?: AbortSignal): Promise<ParseResult> =>
    read(
      await apiFetch(`${HOUSEHOLD_API}/parse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, text }),
        signal,
      }),
      "household-parse",
    ),
};
