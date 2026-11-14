/**
 * LLM 비용 상한(F010 슬라이스 7 · `SRV-REQ-025` FR-62~64).
 *
 * LLM 은 해설 문장만 만든다 — 숫자 · 판단 · 3종 고지는 이미 서버가 정했고, 템플릿 해설이 같은 사실로 같은 칸을 채운다.
 * 그래서 상한에 닿으면 **에러가 아니라 다음 회차**다 — 화면은 이전 해설이나 사실표 문장을 그린다(해설 4단, `SRV-REQ-053` FR-3).
 *
 * 세는 단위는 **시도**다 — 재시도 한 번도 과금된다. 창은 지난 24시간(달력 경계가 없어 자정에 한꺼번에 풀리지 않는다).
 * 부르는 곳은 같은 LLM 워커의 배치 둘이다 — 해설 스냅샷(F017 v2 단계 3) 뒤에 오늘 등락 한 줄(F016 단계 D), 순서대로 하나씩이라
 * 확인과 호출 사이에 끼어들 동시 요청이 없다.
 *
 * ## 한 줄 몫을 남겨 둔다 (2026-11-12)
 *
 * 해설 배치는 지문이 바뀔 때마다 시도해 하루 상한 300 을 다 쓴다(실측 지난 24시간 300). 그 뒤에 도는 한 줄 배치가 매번 상한에 막혀
 * 카드 날 ③이 하루 내내 `pending` 이었다. 한 줄은 카드가 서는 날 · 종목당 하루 4회까지라 몇 건뿐이다 — 해설은 상한 끝
 * 뒤 배치 몫을 남기고 멈춘다(`reservedCalls`). 상한 자체는 그대로다. 2026-11-14 사실 추출(F017 v4 2c)이 셋째 배치로 들어와 몫은
 * 순서 표 하나로 센다 — `reservedCallsBehind`(해설 270 · 한 줄 300 · 추출 360)
 */

export const LLM_BUDGET_WINDOW_MS = 24 * 60 * 60 * 1000;

export interface LlmBudgetLimits {
  /** 서버 전체 24시간 시도 수 */
  totalCalls: number;
  /** 서버 전체 24시간 토큰(입력 + 출력). 응답에 사용량이 없던 시도는 0 으로 센다 */
  totalTokens: number;
}

/**
 * 기본값 — 해설 1회 ≈ 입력 2~3천 · 출력 ≤ 1,200 토큰(`maxOutputTokens`). 배치 회차 12 × 하루 144회차가 다 다시 만들어도 상한(해설 몫 270)에서 멈춘다(넘으면 이전 해설 · 사실표 문장 — 빈 칸 아님).
 * Gemini 로 300 시도면 약 120만 토큰이다. 운영에서 바꿀 일이 생기면 env(`LLM_*_LIMIT`)로 덮는다 — 코드 상수가 기준이다
 */
export const DEFAULT_LLM_BUDGET: LlmBudgetLimits = {
  // 300 → 360(2026-11-14 F017 v4 — 사실 추출 몫 60 을 위에 얹어 해설 몫 270 을 지킨다. 사용자 "베스트 케이스로")
  totalCalls: 360,
  totalTokens: 1_800_000,
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

/**
 * 다른 배치 몫으로 남기는 시도 수. 같은 LLM 회차가 해설 → 오늘 등락 한 줄 → 사실 추출(F017 v4 2c · `SRV-REQ-053` FR-14) 순서로
 * 돈다 — 앞 배치는 **뒤에 오는 배치 몫 합**만큼 덜 쓴다(`reservedCallsBehind`). 사실 추출은 본문이 생길 때만이라 하루 수십 건(2026-11-14 실측 약 40)
 */
export const LLM_RESERVED_CALLS = { moveSummary: 30, factExtract: 60 } as const;

/** 회차 순서 — 앞이 먼저 돈다 */
export const LLM_BATCH_ORDER = ["explanation", "moveSummary", "factExtract"] as const;
export type LlmBatch = (typeof LLM_BATCH_ORDER)[number];

/** 이 배치가 남겨야 하는 시도 수 = 뒤에 도는 배치 몫의 합. 맨 뒤는 0(상한까지) */
export const reservedCallsBehind = (batch: LlmBatch): number =>
  LLM_BATCH_ORDER.slice(LLM_BATCH_ORDER.indexOf(batch) + 1).reduce(
    (sum, b) => sum + (b === "explanation" ? 0 : LLM_RESERVED_CALLS[b]),
    0,
  );

/**
 * 다음 시도를 해도 되나. 이미 상한에 **닿았으면**(같거나 크면) 막는다. `reservedCalls` — 다른 배치 몫으로 남길 시도 수(해설 배치가 준다)
 */
export const llmBudgetVerdict = (usage: LlmUsage, limits: LlmBudgetLimits, reservedCalls = 0): LlmBudgetVerdict => {
  if (usage.calls >= Math.max(0, limits.totalCalls - reservedCalls)) return { allowed: false, exceeded: "total_calls" };
  if (usage.tokens >= limits.totalTokens) return { allowed: false, exceeded: "total_tokens" };
  return { allowed: true, exceeded: null };
};
