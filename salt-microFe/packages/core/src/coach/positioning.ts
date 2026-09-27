import type { EventHorizonView } from "./macroEvents";

/**
 * 쏠림 신호 — BFF `GET /api/app/coach/positioning` 응답 (F008 `BFF-REQ-037` FR-9 · `FC-REQ-007`).
 *
 * 비율은 소수(0.004 = 0.4%). 원화 금액은 없다(미결제약정은 거래소 공개 값, USD). "과열" 같은 판정 필드는 없다 —
 * `state` 는 1년 백분위 구간 코드이고, 화면은 이를 "통상 해석"으로만 옮긴다(FEATURE-008 FR-31 과 같은 선).
 * 반응 기간은 주요 사건과 같은 모양(`EventHorizonView`)이다.
 */
export type PositioningKind =
  | "funding_long_crowded"
  | "funding_short_crowded"
  | "kimchi_cross_up"
  | "kimchi_cross_down";

export interface FundingPositioning {
  state: "long_crowded" | "short_crowded" | "neutral";
  /** 기준 봉 마감 전 24시간 정산 평균(8시간 단위) */
  rate: number;
  /** 앞 365일 중 이보다 낮은 날의 비율(0~1) */
  percentile1y: number;
  sample: number;
  openInterest: { usd: number; at: string; change7d: number | null } | null;
}

export interface KimchiPositioning {
  premium: number;
  /** 3일 연속으로 확정된 부호 — 지금 값의 부호와 다를 수 있다 */
  confirmedState: "premium" | "discount" | null;
  since: string | null;
  fxUsdKrw: number;
  fxObservedAt: string;
}

export interface PositioningReaction {
  kind: PositioningKind;
  /** 지금 상태와 이어진 사건(지금 쏠림 · 20일 안의 교차) */
  current: boolean;
  horizons: EventHorizonView[];
}

export type SymbolPositioningResult =
  | {
      status: "ok";
      symbol: string;
      label: string;
      disclaimer: string;
      asOf: string | null;
      blockedReason: string | null;
      funding: FundingPositioning | null;
      kimchi: KimchiPositioning | null;
      reactions: PositioningReaction[];
    }
  | { status: "unavailable" };
