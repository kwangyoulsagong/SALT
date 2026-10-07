/**
 * 성적 문구 4요소 뷰모델 — **순수 함수** (F009 FR-33 · `BFF-REQ-042`).
 *
 * 서버가 성적 자리마다 싣는 `claim`(기간 · 표본 · 기준 · 빗나간 수)을 모양 검사만 해 옮긴다. 칸마다
 * `present: false` 면 이유 코드가 같이 온다 — 문구는 화면 몫이다. **모양이 깨진 칸은 지어내지 않고 `not_recorded`**
 * 로 바꾼다: 칸이 조용히 사라지면 같은 숫자가 더 좋아 보인다. `claim` 자체가 없으면(서버가 옛 버전) `null`.
 *
 * 여기에는 import 가 없다(`symbol-coach.viewmodel.ts` 와 같은 이유).
 */

type Raw = Record<string, unknown>;

const isRecord = (value: unknown): value is Raw =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const count = (value: unknown): number | null =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

export type ClaimGapReason = "no_sample" | "no_direction" | "not_recorded";
export type ClaimBaselineCode = "same_action_always" | "naive_range" | "ordinary_days" | "all_gauge_days" | "hold_btc";

export type ClaimSlot<T> = ({ present: true } & T) | { present: false; reason: ClaimGapReason };

export interface PerformanceClaim {
  period: ClaimSlot<{ from: string; to: string }>;
  sample: number;
  baseline: ClaimSlot<{ code: ClaimBaselineCode }>;
  misses: ClaimSlot<{ count: number; outOf: number }>;
}

const REASONS: readonly ClaimGapReason[] = ["no_sample", "no_direction", "not_recorded"];
const BASELINES: readonly ClaimBaselineCode[] = [
  "same_action_always",
  "naive_range",
  "ordinary_days",
  "all_gauge_days",
  "hold_btc",
];

const gap = (raw: Raw): { present: false; reason: ClaimGapReason } => ({
  present: false,
  reason: REASONS.includes(raw.reason as ClaimGapReason) ? (raw.reason as ClaimGapReason) : "not_recorded",
});

const NOT_RECORDED = { present: false, reason: "not_recorded" } as const;

export const toPerformanceClaim = (raw: unknown): PerformanceClaim | null => {
  if (!isRecord(raw)) return null;
  const sample = count(raw.sample);
  if (sample === null) return null;

  const p = isRecord(raw.period) ? raw.period : null;
  const period: PerformanceClaim["period"] = !p
    ? NOT_RECORDED
    : p.present === true
      ? typeof p.from === "string" && typeof p.to === "string" && DAY.test(p.from) && DAY.test(p.to)
        ? { present: true, from: p.from, to: p.to }
        : NOT_RECORDED
      : gap(p);

  const b = isRecord(raw.baseline) ? raw.baseline : null;
  const baseline: PerformanceClaim["baseline"] = !b
    ? NOT_RECORDED
    : b.present === true
      ? BASELINES.includes(b.code as ClaimBaselineCode)
        ? { present: true, code: b.code as ClaimBaselineCode }
        : NOT_RECORDED
      : gap(b);

  const m = isRecord(raw.misses) ? raw.misses : null;
  const missCount = m ? count(m.count) : null;
  const outOf = m ? count(m.outOf) : null;
  const misses: PerformanceClaim["misses"] = !m
    ? NOT_RECORDED
    : m.present === true
      ? missCount !== null && outOf !== null && missCount <= outOf
        ? { present: true, count: missCount, outOf }
        : NOT_RECORDED
      : gap(m);

  return { period, sample, baseline, misses };
};
