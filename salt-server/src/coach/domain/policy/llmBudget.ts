/**
 * LLM 비용 상한(F010 슬라이스 7 · `SRV-REQ-025` FR-62~64).
 *
 * LLM 은 해설 문장만 만든다 — 숫자 · 판단 · 3종 고지는 이미 서버가 정했고, 템플릿 해설이 같은 사실로 같은 칸을 채운다.
 * 그래서 상한에 닿으면 **에러가 아니라 템플릿**이다. 화면은 지금도 `source: "template"` 에 "규칙 기반 설명" 배지를 단다.
 *
 * 세는 단위는 **시도**다 — 재시도 한 번도 과금된다. 창은 지난 24시간(달력 경계가 없어 자정에 한꺼번에 풀리지 않는다).
 * 확인과 호출 사이에 동시 요청이 끼면 한두 건 넘을 수 있다 — 초대제 10명에서 락을 둘 이유가 없는 크기다.
 */

export const LLM_BUDGET_WINDOW_MS = 24 * 60 * 60 * 1000;

export interface LlmBudgetLimits {
  /** 사용자 한 명의 24시간 시도 수 — 해설 버튼 연타 · 화면 왕복으로 남의 몫까지 쓰지 않게 */
  userCalls: number;
  /** 서버 전체 24시간 시도 수 */
  totalCalls: number;
  /** 서버 전체 24시간 토큰(입력 + 출력). 응답에 사용량이 없던 시도는 0 으로 센다 */
  totalTokens: number;
}

/**
 * 기본값 — 해설 1회 ≈ 입력 2~3천 · 출력 ≤ 1,200 토큰(`maxOutputTokens`). 10명이 하루 30번씩 눌러도 300 시도 ·
 * 약 120만 토큰이다. 운영에서 바꿀 일이 생기면 env(`LLM_*_LIMIT`)로 덮는다 — 코드 상수가 기준이다
 */
export const DEFAULT_LLM_BUDGET: LlmBudgetLimits = {
  userCalls: 30,
  totalCalls: 300,
  totalTokens: 1_500_000,
};

/** env 덮어쓰기 — `undefined` 칸은 기준값 */
export const resolveLlmLimits = (overrides: Partial<LlmBudgetLimits> = {}): LlmBudgetLimits => ({
  userCalls: overrides.userCalls ?? DEFAULT_LLM_BUDGET.userCalls,
  totalCalls: overrides.totalCalls ?? DEFAULT_LLM_BUDGET.totalCalls,
  totalTokens: overrides.totalTokens ?? DEFAULT_LLM_BUDGET.totalTokens,
});

export interface LlmUsage {
  calls: number;
  tokens: number;
}

export type LlmBudgetExceeded = "user_calls" | "total_calls" | "total_tokens";

export type LlmBudgetVerdict =
  | { allowed: true; exceeded: null }
  | { allowed: false; exceeded: LlmBudgetExceeded };

/** 다음 시도를 해도 되나. 이미 상한에 **닿았으면**(같거나 크면) 막는다 */
export const llmBudgetVerdict = (
  usage: { user: LlmUsage; total: LlmUsage },
  limits: LlmBudgetLimits
): LlmBudgetVerdict => {
  if (usage.user.calls >= limits.userCalls) return { allowed: false, exceeded: "user_calls" };
  if (usage.total.calls >= limits.totalCalls) return { allowed: false, exceeded: "total_calls" };
  if (usage.total.tokens >= limits.totalTokens) return { allowed: false, exceeded: "total_tokens" };
  return { allowed: true, exceeded: null };
};
