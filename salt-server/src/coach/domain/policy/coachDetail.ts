import type { CoachAction, CoachAssetType, CoachHolding } from "../model";
import {
  calculateProfitPlan,
  priceGap,
  ProfitPlanStageAction,
  ProfitPlanStageKey,
} from "./profitPlan";
import type { PerformanceSummary } from "./signalPerformance";
import { MIN_JUDGMENT_SAMPLE } from "./symbolJudgment";

/**
 * 코치 상세 — **저장된 추천**을 화면 계약(`SRV-REQ-025` `CoachDetailResult`)으로 읽는 규칙.
 *
 * ## 종목 판단과 성적을 섞지 않는다
 *
 * 저장 추천의 신호 유형은 `coach.<action>` 이고 종목 판단은 `<mode>.<action>` 이다
 * (`SRV-REQ-024` 매핑 표 D). 저장 추천 옆에 종목 판단 스냅샷의 적중률 · 실패사례를 붙이면
 * **근거와 다른 판단의 성적**을 보여주게 된다 — 종목 판단이 `IndicatorTrackRecord` 를
 * 쓰지 않는 것(FR-134)과 같은 이유다.
 *
 * 저장 추천의 실패사례 출처는 `IndicatorTrackRecord`(F003 · `DB-REQ-013`)이고 그 테이블이
 * 아직 없다. 그래서 지금 상세의 추천 블록은 **전부 `failure_cases_missing` 으로 막힌다.**
 * 그것이 정상이다(`DB-REQ-019` FR-45 — "연결이 없는 행은 게이트가 차단한다").
 */

export const COACH_ACTIONS: readonly CoachAction[] = [
  "buy",
  "sell",
  "hold",
  "rebalance",
];

/** 저장 추천의 성적표 그룹 키 (`SRV-REQ-024` 매핑 표 D). */
export const coachSignalType = (action: CoachAction): string =>
  `coach.${action}`;

export type RecommendationBlockedReason =
  | "reasons_missing"
  | "signal_track_record_missing"
  | "failure_cases_missing";

export interface RecommendationTrackRecord {
  signalType: string;
  sample: number;
  /** 표본 0 이면 `null` — 0% 가 아니다. */
  winRate: number | null;
  avgReturn: number | null;
  worstObservedReturn: number | null;
  lowSample: boolean;
}

export const summarizeRecommendationTrack = (
  signalType: string,
  summary: Pick<
    PerformanceSummary,
    "sampleCount" | "winRate" | "avgReturn" | "worstObservedReturn"
  >
): RecommendationTrackRecord => ({
  signalType,
  sample: summary.sampleCount,
  winRate: summary.winRate,
  avgReturn: summary.avgReturn,
  worstObservedReturn: summary.worstObservedReturn,
  lowSample: summary.sampleCount < MIN_JUDGMENT_SAMPLE,
});

export interface RecommendationGateInput {
  reasons: unknown[];
  topFactors: unknown[];
  trackRecord: RecommendationTrackRecord | null;
  failureCases: unknown[];
}

/**
 * 저장 추천의 3종 세트 게이트 (`SRV-REQ-024` FR-11~15 · `SRV-REQ-025` FR-1~4).
 *
 * - 근거: `reasons` 와 `topFactors` 가 **둘 다** 있어야 한다(FR-11)
 * - 적중률: 표본이 **1건 이상**이면 통과하고 `lowSample` 로 표시한다(FR-32 기본안).
 *   종목 판단은 20 미만을 막는데(FR-137 · D11) 저장 추천은 아니다 — 계약의 사유 enum 에도
 *   `insufficient_sample` 이 없다. 두 경로의 차이는 스펙이 정한 것이다
 * - 실패사례: 비어 있으면 막는다
 *
 * 막혀도 **에러가 아니다**(FR-2 · FR-14). 우회 인자가 없다(FR-15).
 */
export const recommendationGate = (
  input: RecommendationGateInput
): { renderable: boolean; blockedReason: RecommendationBlockedReason | null } => {
  if (input.reasons.length === 0 || input.topFactors.length === 0) {
    return { renderable: false, blockedReason: "reasons_missing" };
  }
  if (!input.trackRecord || input.trackRecord.sample === 0) {
    return { renderable: false, blockedReason: "signal_track_record_missing" };
  }
  if (input.failureCases.length === 0) {
    return { renderable: false, blockedReason: "failure_cases_missing" };
  }
  return { renderable: true, blockedReason: null };
};

const HOUR_MS = 60 * 60 * 1000;

/**
 * 생성 후 지난 시간 — **내림한 정수 시간**(FR-18). 화면이 `생성 후 27시간 경과` 배지를 만든다.
 * 시계가 어긋나 미래 시각이 오면 0 이다.
 */
export const staleHours = (generatedAt: Date, now: Date): number =>
  Math.max(0, Math.floor((now.getTime() - generatedAt.getTime()) / HOUR_MS));

/**
 * 추천 대상에서 빠지는 자산군 (`SRV-REQ-024` FR-22 · 23). 실시간 시세 · 지표가 없다.
 * 문구는 프론트가 만든다 — 서버는 코드만.
 */
export const COACH_EXCLUDED = [
  { assetType: "kr_stock", reasonCode: "no_realtime_data" },
] as const;

/**
 * 코치 자산군 → 화면 자산군. DB enum 이 `crypto` · `stock` 둘이고(`DB-REQ-003`),
 * 국내 주식은 추천 대상이 아니므로 `stock` 은 미국 주식으로 읽는다.
 */
export const toDetailAssetType = (
  assetType: CoachAssetType
): "crypto" | "us_stock" => (assetType === "crypto" ? "crypto" : "us_stock");

export interface ExitPlanView {
  symbol: string;
  assetType: "crypto" | "us_stock";
  currentPrice: number;
  stopLoss: { price: number; priceGap: number };
  firstTakeProfit: { price: number; priceGap: number };
  /** 추세 유지 조건 코드. 문구는 프론트(FR-9). */
  trendHold: { conditionCode: string };
}

/**
 * 보유 하나의 익절 계획을 상세 모양으로. 계산은 익절 계획 화면 · 스마트 바이존과
 * **같은 함수**(`calculateProfitPlan`)다 — 세 화면이 다른 손절선을 말하지 않는다.
 */
export const toExitPlan = (
  holding: CoachHolding,
  assetType: CoachAssetType
): ExitPlanView => {
  const plan = calculateProfitPlan(holding);
  const stage = (key: ProfitPlanStageKey) => {
    const found = plan.stages.find((item) => item.key === key)!;
    return {
      price: found.price,
      priceGap: priceGap(found.price, plan.currentPrice),
    };
  };

  return {
    symbol: holding.symbol,
    assetType: toDetailAssetType(assetType),
    currentPrice: plan.currentPrice,
    stopLoss: stage(ProfitPlanStageKey.ProtectLoss),
    firstTakeProfit: stage(ProfitPlanStageKey.FirstProfit),
    trendHold: { conditionCode: ProfitPlanStageAction.HoldOrTrailStop },
  };
};

export interface StoredRecommendation {
  action: CoachAction;
  symbol: string;
  score: number;
  regime: string | null;
  generatedAt: Date;
  reasons: Array<{ type: string; message: string; value?: number | string | null }>;
  topFactors: Array<{ key: string; score: number; message: string }>;
  risks: Array<{ type: string; symbol?: string; message: string; severity: number }>;
  candidates: Array<{ action: CoachAction; symbol: string; score: number }>;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const records = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value) ? value.filter(isRecord) : [];

const isAction = (value: unknown): value is CoachAction =>
  COACH_ACTIONS.includes(value as CoachAction);

/** 상세에 싣는 후보 수 (계약 — 상위 3). */
export const DETAIL_CANDIDATE_LIMIT = 3;

/**
 * 저장 payload → 상세가 읽는 값.
 *
 * payload 는 DB 의 JSON 이다(`explainRecommendation` 이 만든 모양). **추천 본체
 * (`recommendation.action` · `symbol` · `score`)가 어긋나면 추천이 없는 것으로 본다** —
 * 행동을 모르는 추천에 게이트를 걸 수 없다. 목록 필드는 모양이 맞는 항목만 남긴다.
 *
 * `generatedAt` 은 payload 값을 먼저 본다. 행은 `main_coach` 키로 **덮어쓰기**라
 * `createdAt` 이 첫 생성 시각에 머문다.
 */
export const readStoredRecommendation = (
  payload: Record<string, unknown> | null,
  createdAt: Date
): StoredRecommendation | null => {
  const head = isRecord(payload?.recommendation) ? payload.recommendation : null;
  if (
    !payload ||
    !head ||
    !isAction(head.action) ||
    typeof head.symbol !== "string" ||
    typeof head.score !== "number"
  ) {
    return null;
  }

  const stamped =
    typeof payload.generatedAt === "string" ? new Date(payload.generatedAt) : null;
  const market = isRecord(payload.market) ? payload.market : null;
  const debug = isRecord(payload.debug) ? payload.debug : null;

  return {
    action: head.action,
    symbol: head.symbol,
    score: head.score,
    regime: typeof market?.regime === "string" ? market.regime : null,
    generatedAt:
      stamped && !Number.isNaN(stamped.getTime()) ? stamped : createdAt,
    reasons: records(payload.reasons)
      .filter((r) => typeof r.type === "string" && typeof r.message === "string")
      .map((r) => ({
        type: r.type as string,
        message: r.message as string,
        value:
          typeof r.value === "number" || typeof r.value === "string"
            ? r.value
            : null,
      })),
    topFactors: records(debug?.topCandidateFactors)
      .filter(
        (f) =>
          typeof f.key === "string" &&
          typeof f.score === "number" &&
          typeof f.message === "string"
      )
      .map((f) => ({
        key: f.key as string,
        score: f.score as number,
        message: f.message as string,
      })),
    risks: records(payload.risks)
      .filter((r) => typeof r.type === "string" && typeof r.message === "string")
      .map((r) => ({
        type: r.type as string,
        ...(typeof r.symbol === "string" ? { symbol: r.symbol } : {}),
        message: r.message as string,
        severity: typeof r.severity === "number" ? r.severity : 0,
      })),
    candidates: records(payload.candidates)
      .filter(
        (c) =>
          isAction(c.action) &&
          typeof c.symbol === "string" &&
          typeof c.score === "number"
      )
      .slice(0, DETAIL_CANDIDATE_LIMIT)
      .map((c) => ({
        action: c.action as CoachAction,
        symbol: c.symbol as string,
        score: c.score as number,
      })),
  };
};
