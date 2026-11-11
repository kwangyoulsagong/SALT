/**
 * 판단 라벨 등급(F017 v2 단계 4 · `SRV-REQ-053` FR-7 · `ADR-010` v2) — 참고 · 검증됨 · 주의.
 *
 * 값은 예측 뷰 `forecast.v_judgment_tier`(사전등록 `judgment-tier@1`, `FC-REQ-028` FR-6)가 정한다. **서버는 문턱을 다시 계산하지 않는다** —
 * 여기 있는 것은 "읽은 값을 믿어도 되나"뿐이다: 행이 없거나 · 늦었거나(3일) · 모르는 값이면 `reference`(지어내지 않음).
 * 등급은 판단을 숨기지 않는다 — 라벨 무게만 바꾼다.
 */
import type { CoachMode } from "../model";

export const JUDGMENT_TIER_KEY = "judgment-tier@1";
export const JUDGMENT_TIERS = ["reference", "verified", "caution"] as const;
export type JudgmentTier = (typeof JUDGMENT_TIERS)[number];
/** 참고일 때 이유 — 사전등록 [decision] reason 순서 */
export const JUDGMENT_TIER_REASONS = [
  "no_candidate",
  "no_avoid",
  "below_effective_n",
  "ci_includes_zero",
  "regimes_disagree",
] as const;
export type JudgmentTierReason = (typeof JUDGMENT_TIER_REASONS)[number] | "not_computed";
export type JudgmentTierMarket = "crypto" | "kr";
/** "검증됨"의 유효 표본 문턱 — 사전등록 값을 화면이 "n / 620" 으로 말하려고 싣는다(판정은 예측이 이미 했다) */
export const VERIFIED_MIN_EFFECTIVE_N = 620;
/** 이보다 오래된 등급은 믿지 않는다 — 매일 배치가 3일 못 돌면 상태 점검도 ✗ */
export const JUDGMENT_TIER_MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000;

/** 뷰 한 행 — 읽은 그대로 */
export interface JudgmentTierRow {
  market: JudgmentTierMarket;
  mode: CoachMode;
  asOf: Date;
  tier: string;
  reason: string | null;
  basisSource: string | null;
  liveEffectiveN: number;
  liveCiLow: number | null;
  liveCiHigh: number | null;
  regimeFirst: number | null;
  regimeSecond: number | null;
  backtestCiLow: number | null;
  backtestCiHigh: number | null;
}

export interface JudgmentTierView {
  tier: JudgmentTier;
  tierBasis: {
    /** 등급을 정한 출처 — 참고면 `null` */
    source: "live" | "backtest_full" | null;
    reason: JudgmentTierReason | null;
    liveEffectiveN: number;
    minEffectiveN: number;
    /** 정한 출처의 spread 95% 구간(후보 − 피하기, 같은 날 시장 대비). 참고면 라이브 구간(없으면 `null`) */
    spreadCi: { low: number; high: number } | null;
    /** 라이브 앞 절반 · 뒤 절반 spread */
    regimes: { first: number | null; second: number | null };
    asOf: string | null;
  };
}

const isTier = (v: string): v is JudgmentTier => (JUDGMENT_TIERS as readonly string[]).includes(v);
const isReason = (v: string | null): v is (typeof JUDGMENT_TIER_REASONS)[number] =>
  v !== null && (JUDGMENT_TIER_REASONS as readonly string[]).includes(v);

/** 예측이 아직 안 돌았거나 못 믿을 때 — 참고 */
export const unknownJudgmentTier = (): JudgmentTierView => ({
  tier: "reference",
  tierBasis: {
    source: null,
    reason: "not_computed",
    liveEffectiveN: 0,
    minEffectiveN: VERIFIED_MIN_EFFECTIVE_N,
    spreadCi: null,
    regimes: { first: null, second: null },
    asOf: null,
  },
});

const ci = (low: number | null, high: number | null) => (low === null || high === null ? null : { low, high });

/**
 * 뷰 한 행 → 화면 등급. 행 없음 · 3일 넘음 · 모르는 등급 · 등급과 출처가 어긋남(검증됨인데 출처가 라이브가 아님) → 참고.
 * 검증됨은 라이브만 만든다(사전등록 [decision]) — 뷰가 그 불변식을 어기면 믿지 않는다
 */
export const toJudgmentTier = (row: JudgmentTierRow | null, now: Date): JudgmentTierView => {
  if (!row || !isTier(row.tier)) return unknownJudgmentTier();
  if (now.getTime() - row.asOf.getTime() > JUDGMENT_TIER_MAX_AGE_MS) return unknownJudgmentTier();
  const source = row.basisSource === "live" || row.basisSource === "backtest_full" ? row.basisSource : null;
  if (row.tier === "verified" && source !== "live") return unknownJudgmentTier();
  if (row.tier === "caution" && source === null) return unknownJudgmentTier();
  const reference = row.tier === "reference";
  return {
    tier: row.tier,
    tierBasis: {
      source: reference ? null : source,
      reason: reference ? (isReason(row.reason) ? row.reason : "not_computed") : null,
      liveEffectiveN: row.liveEffectiveN,
      minEffectiveN: VERIFIED_MIN_EFFECTIVE_N,
      spreadCi:
        source === "backtest_full" ? ci(row.backtestCiLow, row.backtestCiHigh) : ci(row.liveCiLow, row.liveCiHigh),
      regimes: { first: row.regimeFirst, second: row.regimeSecond },
      asOf: row.asOf.toISOString(),
    },
  };
};

/** 판단 자산군 → 등급 칸의 시장 */
export const judgmentTierMarket = (assetClass: "crypto" | "kr_stock"): JudgmentTierMarket =>
  assetClass === "kr_stock" ? "kr" : "crypto";
