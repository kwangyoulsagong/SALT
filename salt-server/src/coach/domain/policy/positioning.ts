/**
 * 쏠림 신호 — 선물 펀딩비 쏠림 · 김치 프리미엄 0 교차 (F008 `SRV-REQ-037` FR-11 · `FC-REQ-007` · FEATURE-008 FR-32 · 53).
 *
 * 숫자는 전부 `salt-forecast` 가 시점 고정으로 만든 것이다. 여기서는 **고르고 막을 수만** 있다.
 * - 지금 상태는 관측값(백분위 · 비율)이다. 매매 신호가 아니고, "과열"이라는 판정도 내리지 않는다 —
 *   화면은 상태 코드를 "통상 해석" 라벨로만 옮긴다(FR-31 과 같은 선)
 * - 과거 반응 분포는 주요 사건과 **같은 게이트**(`toEventHorizon` — 표본 · 분포와 평소 분포 · 빗나간 때)를 지난다
 */

import { toEventHorizon, type EventHorizonView, type ReactionStatsRow } from "./macroEvents";

export type PositioningEventKind =
  | "funding_long_crowded"
  | "funding_short_crowded"
  | "kimchi_cross_up"
  | "kimchi_cross_down";
export const POSITIONING_EVENT_KINDS: readonly PositioningEventKind[] = [
  "funding_long_crowded",
  "funding_short_crowded",
  "kimchi_cross_up",
  "kimchi_cross_down",
];
const HORIZON_DAYS = [1, 5, 20] as const;
/** 일 1회 배치 — 사흘 넘게 안 돌았으면 지금 상태라고 부를 수 없다(`data-pipeline.md` §4 시세 2 영업일) */
const STALE_AFTER_MS = 3 * 86_400_000;
/** 미결제약정은 매시 스냅샷 — 하루 넘게 지난 값은 싣지 않는다 */
const OI_STALE_AFTER_MS = 86_400_000;
/** 0 교차 뒤 반응은 가장 긴 기간(20일) 안일 때만 "지금" 의미가 있다 */
const KIMCHI_RECENT_MS = 20 * 86_400_000;

export interface PositioningRow {
  asOf: Date;
  barOpen: Date;
  fundingRate: number | null;
  fundingPct1y: number | null;
  fundingSample: number;
  fundingState: string | null;
  oiUsd: number | null;
  oiAt: Date | null;
  oiChange7d: number | null;
  kimchiPremium: number | null;
  kimchiState: string | null;
  kimchiSince: Date | null;
  fxUsdKrw: number | null;
  fxObservedAt: Date | null;
}

export type SignalReactionRow = ReactionStatsRow & { kind: string };

export type FundingState = "long_crowded" | "short_crowded" | "neutral";

export interface FundingView {
  state: FundingState;
  /** 기준 봉 마감 전 24시간 정산 평균(8시간 단위 비율, 0.0001 = 0.01%) */
  rate: number;
  /** 앞 365일 일평균 중 이보다 낮은 비율(0~1, 같은 값은 절반) */
  percentile1y: number;
  sample: number;
  /** 미결제약정(USD). 하루 넘게 지났으면 null */
  openInterest: { usd: number; at: string; change7d: number | null } | null;
}

export interface KimchiView {
  /** 업비트 원화 ÷ (바이낸스 USDT × 원/달러) − 1 */
  premium: number;
  /** 3일 연속으로 확정된 부호. 지금 값의 부호와 다를 수 있다(확정 전) */
  confirmedState: "premium" | "discount" | null;
  /** 지금 부호가 확정된 시각. 기록 시작부터 그대로면 null */
  since: string | null;
  fxUsdKrw: number;
  fxObservedAt: string;
}

export interface PositioningReactionView {
  kind: PositioningEventKind;
  /** 지금 상태와 이어진 사건인가 — 펀딩은 지금 쏠림, 김프는 20일 안에 확정된 교차 */
  current: boolean;
  horizons: EventHorizonView[];
}

export interface PositioningView {
  /** 기준 봉 마감(UTC 자정) */
  asOf: string | null;
  /** 막혔으면 사유. 상태 · 반응이 모두 비어 있다 */
  blockedReason: "not_generated" | "stale_inputs" | null;
  funding: FundingView | null;
  kimchi: KimchiView | null;
  reactions: PositioningReactionView[];
}

const isNum = (v: number | null | undefined): v is number => typeof v === "number" && Number.isFinite(v);
const isFundingState = (v: string | null): v is FundingState =>
  v === "long_crowded" || v === "short_crowded" || v === "neutral";

const toFunding = (row: PositioningRow, now: Date): FundingView | null => {
  if (!isFundingState(row.fundingState) || !isNum(row.fundingRate) || !isNum(row.fundingPct1y)) return null;
  const oiFresh = row.oiAt !== null && now.getTime() - row.oiAt.getTime() <= OI_STALE_AFTER_MS;
  return {
    state: row.fundingState,
    rate: row.fundingRate,
    percentile1y: row.fundingPct1y,
    sample: row.fundingSample,
    openInterest:
      oiFresh && isNum(row.oiUsd)
        ? { usd: row.oiUsd, at: row.oiAt!.toISOString(), change7d: isNum(row.oiChange7d) ? row.oiChange7d : null }
        : null,
  };
};

const toKimchi = (row: PositioningRow): KimchiView | null => {
  if (!isNum(row.kimchiPremium) || !isNum(row.fxUsdKrw) || row.fxObservedAt === null) return null;
  const state = row.kimchiState === "premium" || row.kimchiState === "discount" ? row.kimchiState : null;
  return {
    premium: row.kimchiPremium,
    confirmedState: state,
    since: row.kimchiSince?.toISOString() ?? null,
    fxUsdKrw: row.fxUsdKrw,
    fxObservedAt: row.fxObservedAt.toISOString(),
  };
};

const isCurrent = (kind: PositioningEventKind, funding: FundingView | null, kimchi: KimchiView | null, now: Date) => {
  if (kind === "funding_long_crowded") return funding?.state === "long_crowded";
  if (kind === "funding_short_crowded") return funding?.state === "short_crowded";
  if (!kimchi?.since || now.getTime() - new Date(kimchi.since).getTime() > KIMCHI_RECENT_MS) return false;
  return kind === (kimchi.confirmedState === "premium" ? "kimchi_cross_up" : "kimchi_cross_down");
};

const EMPTY = { funding: null, kimchi: null, reactions: [] };

/** 뷰 두 개(상태 한 행 · 반응 통계 행들)를 화면 계약으로. 모르는 종류 · 빠진 기간은 막힌 기간으로 채운다 */
export const toPositioning = (
  row: PositioningRow | null,
  reactions: SignalReactionRow[],
  now: Date
): PositioningView => {
  if (!row) return { asOf: null, blockedReason: "not_generated", ...EMPTY };
  if (now.getTime() - row.asOf.getTime() > STALE_AFTER_MS) {
    return { asOf: row.asOf.toISOString(), blockedReason: "stale_inputs", ...EMPTY };
  }
  const funding = toFunding(row, now);
  const kimchi = toKimchi(row);
  const kinds = POSITIONING_EVENT_KINDS.filter((k) => (k.startsWith("funding") ? funding : kimchi) !== null);
  return {
    asOf: row.asOf.toISOString(),
    blockedReason: null,
    funding,
    kimchi,
    reactions: kinds.map((kind) => ({
      kind,
      current: isCurrent(kind, funding, kimchi, now),
      horizons: HORIZON_DAYS.map((h) => {
        const stats = reactions.find((r) => r.kind === kind && r.horizonDays === h);
        return stats ? toEventHorizon(stats) : { horizonDays: h, renderable: false as const, blockedReason: "not_generated" };
      }),
    })),
  };
};
