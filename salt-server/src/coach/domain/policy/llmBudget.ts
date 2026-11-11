/**
 * LLM 비용 상한(F010 슬라이스 7 · `SRV-REQ-025` FR-62~64).
 *
 * LLM 은 해설 문장만 만든다 — 숫자 · 판단 · 3종 고지는 이미 서버가 정했고, 템플릿 해설이 같은 사실로 같은 칸을 채운다.
 * 그래서 상한에 닿으면 **에러가 아니라 다음 회차**다 — 화면은 이전 해설이나 사실표 문장을 그린다(해설 4단, `SRV-REQ-053` FR-3).
 *
 * 세는 단위는 **시도**다 — 재시도 한 번도 과금된다. 창은 지난 24시간(달력 경계가 없어 자정에 한꺼번에 풀리지 않는다).
 * 부르는 곳은 해설 스냅샷 배치 하나다(순서대로 하나씩, F017 v2 단계 3) — 확인과 호출 사이에 끼어들 동시 요청이 없다.
 */

export const LLM_BUDGET_WINDOW_MS = 24 * 60 * 60 * 1000;

export interface LlmBudgetLimits {
  /** 서버 전체 24시간 시도 수 */
  totalCalls: number;
  /** 서버 전체 24시간 토큰(입력 + 출력). 응답에 사용량이 없던 시도는 0 으로 센다 */
  totalTokens: number;
}

/**
 * 기본값 — 해설 1회 ≈ 입력 2~3천 · 출력 ≤ 1,200 토큰(`maxOutputTokens`). 배치 회차 12 × 하루 144회차가 다 다시 만들어도 상한 300 에서 멈춘다(넘으면 이전 해설 · 사실표 문장 — 빈 칸 아님).
 * Gemini 로 300 시도면 약 120만 토큰이다. 운영에서 바꿀 일이 생기면 env(`LLM_*_LIMIT`)로 덮는다 — 코드 상수가 기준이다
 */
export const DEFAULT_LLM_BUDGET: LlmBudgetLimits = {
  totalCalls: 300,
  totalTokens: 1_500_000,
};

/** env 덮어쓰기 — `undefined` 칸은 기준값 */
export const resolveLlmLimits = (overrides: Partial<LlmBudgetLimits> = {}): LlmBudgetLimits => ({
  totalCalls: overrides.totalCalls ?? DEFAULT_LLM_BUDGET.totalCalls,
  totalTokens: overrides.totalTokens ?? DEFAULT_LLM_BUDGET.totalTokens,
});

export interface LlmUsage {
  calls: number;
  tokens: number;
}

export type LlmBudgetExceeded = "total_calls" | "total_tokens";

export type LlmBudgetVerdict =
  | { allowed: true; exceeded: null }
  | { allowed: false; exceeded: LlmBudgetExceeded };

/** 다음 시도를 해도 되나. 이미 상한에 **닿았으면**(같거나 크면) 막는다 */
export const llmBudgetVerdict = (usage: LlmUsage, limits: LlmBudgetLimits): LlmBudgetVerdict => {
  if (usage.calls >= limits.totalCalls) return { allowed: false, exceeded: "total_calls" };
  if (usage.tokens >= limits.totalTokens) return { allowed: false, exceeded: "total_tokens" };
  return { allowed: true, exceeded: null };
};
