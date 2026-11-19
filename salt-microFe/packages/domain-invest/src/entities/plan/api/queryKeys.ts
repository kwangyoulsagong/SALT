/** 밴드 적립 쿼리 키 — 완료 체크 · 설정 저장 뒤 `all` 로 함께 무효화한다(주간 계획 · 월 합계 · 설정, `BFF-REQ-019` FR-51 · 54) */
export const planQueryKeys = {
  all: ["Plan"] as const,
  weekly: ["Plan", "weekly"] as const,
  settings: ["Plan", "settings"] as const,
  monthlySummary: ["Plan", "monthly-summary"] as const,
} as const;
