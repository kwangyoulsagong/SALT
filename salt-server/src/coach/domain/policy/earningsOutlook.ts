/**
 * 다음 실적 공시 — 확정 일정 또는 예상 창 + 실적 공시 뒤 과거 반응(F008 슬라이스 24 2단계 — `SRV-REQ-041` FR-4 · `FC-REQ-021` FR-14).
 *
 * 숫자는 전부 `salt-forecast` 가 만든다(`forecast.v_kr_earnings_window` · `v_kr_earnings_reaction`). 여기서는 **고르고 막기만**:
 * - 확정 일정(실적 IR · 결산실적 예고)이 아직 안 지났으면 그것 — 창은 싣지 않는다
 * - 아니면 예상 창. **한 날짜로 찍지 않는다**(공통 수용 기준 4) — 창 + 3종(표본 · 과거 적중 · 빗나간 결산) + 기준(법정 기한).
 *   막혔거나(표본 · 판정 부족 · 창 지남) 창 끝이 오늘보다 앞이면 싣지 않는다
 * - 반응은 사건 카드와 같은 게이트(`toEventHorizon`)
 */

import { EVENT_HORIZON_DAYS, type EventHorizonView, type ReactionStatsRow, toEventHorizon } from "./macroEvents";

export interface EarningsWindowRow {
  asOf: Date;
  periodEnd: string;
  annual: boolean;
  lagMin: number | null;
  lagMedian: number | null;
  lagMax: number | null;
  sample: number;
  windowFrom: string | null;
  windowTo: string | null;
  deadline: string;
  hits: number;
  judged: number;
  misses: { periodEnd: string; actual: string; from: string; to: string }[];
  confirmedAt: Date | null;
  confirmedTimeKnown: boolean | null;
  confirmedSource: "ir" | "preview" | null;
  renderable: boolean;
  blockedReason: string | null;
}

export interface EarningsOutlookView {
  /** 다음에 공시될 결산의 끝날(YYYY-MM-DD) · 사업연도 결산인가 */
  periodEnd: string;
  annual: boolean;
  /** 회사가 공시한 실적 발표 일정 — 있으면 `expected` 는 없다 */
  confirmed: { at: string; timeKnown: boolean; source: "ir" | "preview" } | null;
  /** 과거 공시일 기준 예상 창(확정 아님) */
  expected: {
    from: string;
    to: string;
    sample: number;
    /** 과거 결산마다 그 전 공시로만 만든 창에 실제 공시가 든 수 / 판정한 결산 수 */
    hits: number;
    judged: number;
    misses: { periodEnd: string; actual: string; from: string; to: string }[];
    /** 비교 기준 — 법정 제출 기한(분기 · 반기 +45일 · 사업연도 +90일) */
    deadline: string;
  } | null;
  /** 둘 다 없을 때 이유 — insufficient_sample · not_judged · window_passed · window_past */
  blockedReason: string | null;
  /** 실적 공시 뒤 1 · 5 · 20 거래일 반응(공시일 전 거래일 종가 기준) */
  horizons: EventHorizonView[];
  asOf: string;
}

const kstDate = (at: Date): string => new Date(at.getTime() + 9 * 3_600_000).toISOString().slice(0, 10);

export const toEarningsOutlook = (
  window: EarningsWindowRow | null,
  reactions: ReactionStatsRow[],
  now: Date,
): EarningsOutlookView | null => {
  if (!window) return null;
  const today = kstDate(now);
  const confirmed =
    window.confirmedAt && window.confirmedSource && window.confirmedAt.getTime() >= now.getTime()
      ? { at: window.confirmedAt.toISOString(), timeKnown: window.confirmedTimeKnown ?? false, source: window.confirmedSource }
      : null;
  let blockedReason: string | null = window.blockedReason;
  let expected: EarningsOutlookView["expected"] = null;
  if (!confirmed && window.renderable && window.windowFrom && window.windowTo) {
    if (window.windowTo < today) blockedReason = "window_past";
    else if (window.judged > 0) {
      expected = {
        from: window.windowFrom,
        to: window.windowTo,
        sample: window.sample,
        hits: window.hits,
        judged: window.judged,
        misses: window.misses,
        deadline: window.deadline,
      };
      blockedReason = null;
    } else blockedReason = "not_judged";
  }
  if (confirmed) blockedReason = null;
  return {
    periodEnd: window.periodEnd,
    annual: window.annual,
    confirmed,
    expected,
    blockedReason,
    horizons: EVENT_HORIZON_DAYS.map((h) => {
      const row = reactions.find((r) => r.horizonDays === h);
      return row ? toEventHorizon(row) : { horizonDays: h, renderable: false as const, blockedReason: "not_generated" };
    }),
    asOf: window.asOf.toISOString(),
  };
};
