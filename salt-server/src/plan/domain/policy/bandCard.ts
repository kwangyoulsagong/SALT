/**
 * 밴드 카드 — 3종(근거 · 과거 성적 · 실패 사례) 렌더 게이트와 김프(`SRV-REQ-020` FR-10~12 · FR-50~54 · 공통 수용 기준 1).
 * 게이트 차단은 에러가 아니다 — `renderable: false` + 사유. 금액은 막지 않는다(FR-22 — 기본액은 늘 보인다).
 */
import Decimal from "decimal.js";

import { daysBetween, kstDate } from "./weekBoundary";
import type { BandWeekRow, PlanConfig } from "../types";

export type BandCardBlockedReason = "band_missing" | "indicator_missing" | "track_record_missing" | "failure_cases_missing";

export const bandCardGate = (band: BandWeekRow | null): { renderable: boolean; blockedReason: BandCardBlockedReason | null } => {
  const blockedReason: BandCardBlockedReason | null = !band
    ? "band_missing"
    : band.indicatorValue === null || band.bandKey === null
      ? "indicator_missing"
      : band.closedWeeks <= 0 || band.excess === null || band.ciLow === null || band.ciHigh === null
        ? "track_record_missing"
        : band.failureCount <= 0 || band.failureCases.length === 0
          ? "failure_cases_missing"
          : null;
  return { renderable: blockedReason === null, blockedReason };
};

export interface KimchiView {
  premiumPct: number;
  /** 이번 주 BTC 계획액 중 프리미엄 몫(원) = 금액 × p ÷ (1 + p). 음수면 싸게 사는 몫 */
  costKrwOnPlan: number | null;
  level: "low" | "normal" | "high";
  asOf: string;
}

/** 김프 — 값이 없거나 오래되면 null(게이지만 숨김, 금액은 유지 — FR-54). 문장은 화면 몫(사실 서술 코드만) */
export const kimchiView = (
  band: BandWeekRow | null,
  btcPlannedKrw: number | null,
  now: Date,
  config: Pick<PlanConfig, "kimchiHighPct" | "kimchiLowPct" | "kimchiMaxAgeDays">
): KimchiView | null => {
  if (!band || band.kimchiPremium === null || band.kimchiAsOf === null || !Number.isFinite(band.kimchiPremium)) return null;
  if (daysBetween(kstDate(band.kimchiAsOf), kstDate(now)) > config.kimchiMaxAgeDays) return null;
  const p = new Decimal(band.kimchiPremium);
  const pct = p.times(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
  const level = pct >= config.kimchiHighPct ? "high" : pct <= config.kimchiLowPct ? "low" : "normal";
  const cost =
    btcPlannedKrw === null
      ? null
      : new Decimal(btcPlannedKrw).times(p).div(p.plus(1)).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
  return { premiumPct: pct, costKrwOnPlan: cost, level, asOf: band.kimchiAsOf.toISOString() };
};
