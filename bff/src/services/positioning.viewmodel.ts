/**
 * 쏠림 신호(선물 펀딩비 · 김치 프리미엄) 뷰모델 — **순수 함수** (F008 `BFF-REQ-037` FR-9 · `FC-REQ-007`).
 *
 * 주요 사건과 같은 규칙: 서버가 게이트를 보고, BFF 는 **막을 수만** 있다. 반응 기간은 `toHorizon` 을 그대로 쓴다.
 * 상태 칸은 모양이 하나라도 깨지면 그 칸을 통째로 `null` 로 — 반쯤 채운 숫자를 화면에 주지 않는다.
 * 상태 코드는 서버가 준 셋 중 하나만 통과한다. "과열" 같은 판정 문자열을 만들지 않는다.
 */

import { HORIZONS, toHorizon, type EventHorizon } from "./events.viewmodel";

export type PositioningKind = "funding_long_crowded" | "funding_short_crowded" | "kimchi_cross_up" | "kimchi_cross_down";
export type FundingState = "long_crowded" | "short_crowded" | "neutral";

export interface Funding {
  state: FundingState;
  rate: number;
  percentile1y: number;
  sample: number;
  openInterest: { usd: number; at: string; change7d: number | null } | null;
}

export interface Kimchi {
  premium: number;
  confirmedState: "premium" | "discount" | null;
  since: string | null;
  fxUsdKrw: number;
  fxObservedAt: string;
}

export interface PositioningReaction {
  kind: PositioningKind;
  current: boolean;
  horizons: EventHorizon[];
}

export type PositioningResult =
  | {
      status: "ok";
      symbol: string;
      label: string;
      disclaimer: string;
      asOf: string | null;
      blockedReason: string | null;
      funding: Funding | null;
      kimchi: Kimchi | null;
      reactions: PositioningReaction[];
    }
  | { status: "unavailable" };

const KINDS: readonly PositioningKind[] = [
  "funding_long_crowded",
  "funding_short_crowded",
  "kimchi_cross_up",
  "kimchi_cross_down",
];
const FUNDING_STATES: readonly FundingState[] = ["long_crowded", "short_crowded", "neutral"];

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const obj = (v: unknown) => (v && typeof v === "object" ? (v as Record<string, unknown>) : null);

const toFunding = (raw: unknown): Funding | null => {
  const f = obj(raw);
  if (!f || !FUNDING_STATES.includes(f.state as FundingState)) return null;
  if (!isNum(f.rate) || !isNum(f.percentile1y) || f.percentile1y < 0 || f.percentile1y > 1 || !isNum(f.sample)) {
    return null;
  }
  const oi = obj(f.openInterest);
  return {
    state: f.state as FundingState,
    rate: f.rate,
    percentile1y: f.percentile1y,
    sample: f.sample,
    openInterest:
      oi && isNum(oi.usd) && typeof oi.at === "string"
        ? { usd: oi.usd, at: oi.at, change7d: isNum(oi.change7d) ? oi.change7d : null }
        : null,
  };
};

const toKimchi = (raw: unknown): Kimchi | null => {
  const k = obj(raw);
  if (!k || !isNum(k.premium) || !isNum(k.fxUsdKrw) || typeof k.fxObservedAt !== "string") return null;
  const state = k.confirmedState === "premium" || k.confirmedState === "discount" ? k.confirmedState : null;
  return {
    premium: k.premium,
    confirmedState: state,
    since: typeof k.since === "string" ? k.since : null,
    fxUsdKrw: k.fxUsdKrw,
    fxObservedAt: k.fxObservedAt,
  };
};

export const toPositioningViewModel = (data: Record<string, unknown>): PositioningResult => {
  // 면책이 없으면 전체를 내보내지 않는다(`BFF-REQ-025` FR-22 — 면책은 정책)
  if (typeof data.disclaimer !== "string" || data.disclaimer === "") return { status: "unavailable" };
  const funding = toFunding(data.funding);
  const kimchi = toKimchi(data.kimchi);
  const reactions = Array.isArray(data.reactions) ? (data.reactions as Record<string, unknown>[]) : [];
  return {
    status: "ok",
    symbol: String(data.symbol ?? ""),
    label: String(data.label ?? ""),
    disclaimer: data.disclaimer,
    asOf: typeof data.asOf === "string" ? data.asOf : null,
    blockedReason: typeof data.blockedReason === "string" ? data.blockedReason : null,
    funding,
    kimchi,
    // 상태 칸이 막혔으면 그 신호의 반응도 싣지 않는다 — "지금 무엇과 이어진 분포인가"가 사라진다
    reactions: reactions
      .filter((r) => KINDS.includes(r?.kind as PositioningKind))
      .filter((r) => ((r.kind as string).startsWith("funding") ? funding : kimchi) !== null)
      .map((r) => {
        const horizons = Array.isArray(r.horizons) ? (r.horizons as Record<string, unknown>[]) : [];
        return {
          kind: r.kind as PositioningKind,
          current: r.current === true,
          horizons: HORIZONS.map((h) => toHorizon(h, horizons.find((x) => x.horizonDays === h))),
        };
      }),
  };
};
