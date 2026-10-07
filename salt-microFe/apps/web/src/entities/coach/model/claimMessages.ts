import type { ClaimBaselineCode, ClaimGapReason } from "@repo/core/coach";

/**
 * 성적 문구 4요소 한 줄 (F009 FR-33 · `FE-REQ-045`). 칸이 비면 지우지 않고 이유를 쓴다(사용자 결정 2026-10-07).
 * 기준 값 자체(늘 같은 행동 대비 +4%p 등)는 각 성적 자리가 이미 그린다 — 여기서는 **무엇과 비교했는지**만.
 */
export const CLAIM_MESSAGES = {
  label: "성적 기준",
  period: (from: string, to: string) => `${from} ~ ${to} 채점`,
  sample: (count: number, unit: string) => `표본 ${count}${unit}`,
  baseline: {
    same_action_always: "기준: 늘 같은 행동",
    naive_range: "기준: 단순 예측 범위",
    ordinary_days: "기준: 평소 날",
    all_gauge_days: "기준: 구간과 무관한 모든 날",
    hold_btc: "기준: BTC 그냥 보유",
  } satisfies Record<ClaimBaselineCode, string>,
  misses: (count: number, unit: string) => `빗나간 ${count}${unit}`,
  missesOutOf: (count: number, outOf: number, unit: string) => `판정 ${outOf}${unit} 중 빗나간 ${count}${unit}`,
  gap: {
    period: {
      no_sample: "채점 기간 없음",
      no_direction: "채점 기간 없음",
      not_recorded: "채점 기간 기록 없음",
    },
    baseline: {
      no_sample: "기준 없음 — 표본이 없어요",
      no_direction: "기준 없음 — 방향을 말하지 않는 판단이에요",
      not_recorded: "기준 기록 없음",
    },
    misses: {
      no_sample: "빗나간 수 없음 — 표본이 없어요",
      no_direction: "빗나간 수 없음 — 맞고 틀림을 정하지 않는 분포예요",
      not_recorded: "빗나간 수 기록 없음 — 등록된 정의가 없어요",
    },
  } satisfies Record<"period" | "baseline" | "misses", Record<ClaimGapReason, string>>,
} as const;
