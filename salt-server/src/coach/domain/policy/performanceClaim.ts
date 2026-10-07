/**
 * 성적 문구의 4요소 — F009 FR-33 · 리서치 E3 · 공통 수용 기준 4.
 *
 * 서비스가 자기 판단 · 규칙의 과거 성적을 말하는 자리는 **기간 · 표본 수 · 기준 대비 · 빗나간 사례 수**를
 * 한 벌로 싣는다. 네 칸 중 하나라도 조용히 빠지면 같은 숫자가 더 좋아 보인다 — 2026-10-07 전에는
 * 성적 자리 10곳 중 넷을 다 갖춘 곳이 없었고, "틀렸던 때 N건"은 사례 목록 상한(3)을 셌다.
 *
 * ## 정의할 수 없는 칸은 빈 칸 + 이유 (사용자 결정 2026-10-07)
 *
 * 관망 판단은 방향을 말하지 않아 비교할 기저율이 없다. 사전등록에 빗나간 수의 정의가 없던 백테스트는
 * 사후에 새로 세지 않는다. 그런 칸은 지우지 않고 `present: false` + 이유 코드로 보낸다 — 문구는 프론트가 만든다.
 *
 * 적용 범위는 **서비스 성적**이다. 사용자 본인의 거래 기록(미러 · 월간 복기 · 보유 손익)은 서비스가 주장하는
 * 성적이 아니라 여기 들지 않는다(사용자 결정 2026-10-07).
 */

/** 칸이 빈 이유. 코드다 — 문구가 아니다 */
export type ClaimGapReason =
  /** 표본이 0 — 기간 · 기준을 말할 대상이 없다 */
  | "no_sample"
  /** 방향을 말하지 않는 판단 · 분포 — 맞고 틀림 또는 기저율이 정의되지 않는다 */
  | "no_direction"
  /** 사전등록 · 원천에 이 수가 없다. 결과를 본 뒤 새로 세지 않는다 */
  | "not_recorded";

export type ClaimSlot<T> = ({ present: true } & T) | { present: false; reason: ClaimGapReason };

/**
 * 기준이 무엇인가. 값은 각 성적 객체의 기존 필드에 있다 — 여기서는 어느 기준인지만 말한다.
 *
 * | 코드 | 뜻 | 값이 있는 필드 |
 * |---|---|---|
 * | `same_action_always` | 늘 같은 행동(항상 오른다 · 항상 안 오른다)의 적중률 | `excessWinRate` |
 * | `naive_range` | 단순 예측(과거 분포) 구간 | `baselineWidth90` |
 * | `ordinary_days` | 같은 기간 평소 날의 수익률 | `baseline` |
 * | `all_gauge_days` | 게이지 구간과 무관한 모든 날 | `baselinePositiveRate` |
 * | `hold_btc` | BTC 를 그냥 들고 있었을 때 | `holdBtc` · `btcCumReturn` |
 */
export type ClaimBaselineCode = "same_action_always" | "naive_range" | "ordinary_days" | "all_gauge_days" | "hold_btc";

export interface PerformanceClaim {
  /** 표본이 채점된 첫날 ~ 마지막 날(`YYYY-MM-DD`, UTC) */
  period: ClaimSlot<{ from: string; to: string }>;
  sample: number;
  baseline: ClaimSlot<{ code: ClaimBaselineCode }>;
  /** 표본 전체에서 빗나간 수 — 화면에 싣는 사례 목록(최대 3)의 길이가 아니다 */
  misses: ClaimSlot<{ count: number }>;
}

const day = (at: Date | string): string => (typeof at === "string" ? at : at.toISOString()).slice(0, 10);

export const claimPeriod = (
  sample: number,
  from: Date | string | null,
  to: Date | string | null,
  missing: ClaimGapReason = "not_recorded"
): PerformanceClaim["period"] =>
  sample === 0
    ? { present: false, reason: "no_sample" }
    : from && to
      ? { present: true, from: day(from), to: day(to) }
      : { present: false, reason: missing };

export const claimBaseline = (
  sample: number,
  code: ClaimBaselineCode | null,
  missing: ClaimGapReason
): PerformanceClaim["baseline"] =>
  sample === 0 ? { present: false, reason: "no_sample" } : code ? { present: true, code } : { present: false, reason: missing };

export const claimMisses = (
  sample: number,
  count: number | null,
  missing: ClaimGapReason
): PerformanceClaim["misses"] =>
  sample === 0
    ? { present: false, reason: "no_sample" }
    : count === null
      ? { present: false, reason: missing }
      : { present: true, count };
