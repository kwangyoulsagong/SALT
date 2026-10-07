/**
 * 성적 문구 4요소 — BFF `performance-claim.viewmodel.ts` 와 같은 모양(F009 FR-33 · `BFF-REQ-042`).
 *
 * 서비스가 자기 성적을 말하는 자리마다 기간 · 표본 · 기준 · 빗나간 수를 한 벌로 싣는다. 칸이 비면 이유 코드가 온다 —
 * 문구는 화면이 만든다. `claim` 자체가 `null` 이면 서버가 옛 버전이다.
 */

export type ClaimGapReason = "no_sample" | "no_direction" | "not_recorded";
export type ClaimBaselineCode = "same_action_always" | "naive_range" | "ordinary_days" | "all_gauge_days" | "hold_btc";

export type ClaimSlot<T> = ({ present: true } & T) | { present: false; reason: ClaimGapReason };

export interface PerformanceClaim {
  /** 표본이 채점된 첫날 ~ 마지막 날(`YYYY-MM-DD`, UTC) */
  period: ClaimSlot<{ from: string; to: string }>;
  sample: number;
  baseline: ClaimSlot<{ code: ClaimBaselineCode }>;
  /** 표본 전체에서 빗나간 수 / 맞고 틀림을 판정한 수. 사례 목록(최대 3) 길이가 아니다 */
  misses: ClaimSlot<{ count: number; outOf: number }>;
}
