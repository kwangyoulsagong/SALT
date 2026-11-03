export const goalQueryKeys = {
  all: ["SavingsGoal"] as const,
  list: () => [...goalQueryKeys.all, "list"] as const,
  detail: (id: string) => [...goalQueryKeys.all, "detail", id] as const,
  templates: ["SavingsTemplates"] as const,
  /** 저울 · 비상시는 저장하지 않는 계산 — 입력을 키에 */
  simulation: (request: unknown) => [...goalQueryKeys.all, "simulate", request] as const,
  emergency: (id: string, request: unknown) => [...goalQueryKeys.all, "emergency", id, request] as const,
} as const;
