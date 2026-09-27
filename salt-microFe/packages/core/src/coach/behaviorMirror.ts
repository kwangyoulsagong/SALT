/**
 * 내 거래 미러 · 결정 결과 · 입력 중 행동 미리보기 뷰모델 (F009 슬라이스 5 `BFF-REQ-038` FR-7~9 · `FE-REQ-039`).
 *
 * BFF `behavior-mirror.viewmodel.ts` 가 소유하는 계약이다. **숫자는 전부 서버 계산**(`SRV-REQ-038` FR-9 · FR-12) —
 * 비율 · 수익률 · R 은 소수(0.28 = 28%), 금액은 원 정수, 일수는 소수 2자리.
 *
 * ## 표본 부족은 숨기지 않는다
 *
 * `insufficient_sample` 은 값이 **있다**(흐리게 + "표본 부족" 배지). 값을 만들 재료가 없을 때만
 * `insufficient_data` 이고 그때 값은 `null` 이다 — 0 으로 읽지 않는다.
 */

import type { AdherenceLabel } from "./tradeRisk";

export type MirrorStatus = "ok" | "insufficient_sample" | "insufficient_data";

export interface MirrorMetric {
  value: number | null;
  sampleSize: number;
  status: MirrorStatus;
}

/** 서버가 아는 태그. 여기 없는 문자열은 사용자 정의 태그다 */
export const KNOWN_MISTAKE_TAGS = ["chasing", "averaging_down", "revenge", "off_plan", "late_night"] as const;
export type KnownMistakeTag = (typeof KNOWN_MISTAKE_TAGS)[number];

export interface TagCostView {
  tag: string;
  count: number;
  netPnlKrw: number;
  avgReturn: number | null;
  avgR: number | null;
  rSampleSize: number;
  status: MirrorStatus;
  /** 표본 ≥ 20 에서 기대값 음수 — "엣지 없음" 배지(FR-19). 판정은 서버 몫 */
  noEdge: boolean;
}

export interface BehaviorMirrorView {
  status: "ok";
  /** 거래가 상한(5,000건)에 잘리면 `truncated` — 처분효과 · 보유 대비 · 준수율 · 회전율이 `null` 이다 */
  historyStatus: "ok" | "truncated";
  adherence: {
    rate: MirrorMetric;
    labelCounts: Record<AdherenceLabel, number>;
    honoredAvgReturn: MirrorMetric;
    violatedAvgReturn: MirrorMetric;
  } | null;
  disposition: {
    pgr: MirrorMetric;
    plr: MirrorMetric;
    gainHoldingDays: MirrorMetric;
    lossHoldingDays: MirrorMetric;
    missingCloses: string[];
  } | null;
  benchmark: {
    status: MirrorStatus;
    sampleSize: number;
    actualReturn: number | null;
    holdReturn: number | null;
    difference: number | null;
    feeComponent: number | null;
    timingComponent: number | null;
    from: string | null;
    to: string | null;
  } | null;
  tagCosts: TagCostView[];
  turnover: {
    status: "ok" | "insufficient_data";
    trailingYearTurnover: number | null;
    feesYearToDateKrw: number | null;
    tradeCount: number | null;
    baseline: {
      source: string;
      url: string;
      period: string;
      market: string;
      newRetailDailyTurnover: number;
      marketDailyTurnover: number;
    } | null;
  };
  outcomeCount: number;
  outcomesComputedAt: string | null;
  minSample: number;
  asOf: string | null;
}

export type BehaviorMirrorResult = BehaviorMirrorView | { status: "unavailable" };

// ─── 결정 결과(태그 확정) ─────────────────────────────────────

export interface DecisionOutcomeView {
  id: string;
  symbol: string;
  openedAt: string;
  closedAt: string;
  holdingDays: number | null;
  netPnlKrw: number;
  netReturn: number | null;
  rMultiple: number | null;
  /** 청산 30일 뒤 종가 기준. 30일이 안 지났으면 `null` */
  heldReturn30d: number | null;
  adherenceLabel: AdherenceLabel | null;
  autoTags: string[];
  userTags: string[];
  /** 사용자가 확정했으면 시각. 확정 전에는 `autoTags` 가 쓰인다 */
  tagsConfirmedAt: string | null;
}

export type DecisionOutcomeListResult = { status: "ok"; outcomes: DecisionOutcomeView[] } | { status: "unavailable" };

export interface ConfirmOutcomeTagsRequest {
  /** 최대 8개 · 각 20자. 빈 배열 = "실수 없음"으로 확정 */
  tags: string[];
}

// ─── 입력 중 행동 미리보기(사이즈 계산의 `behavior`) ───────────

export interface TradeBehaviorPreview {
  status: "ok";
  candidateTags: string[];
  chasingUnknown: boolean;
  /** 후보 중 엣지 없음만 — 폼이 한 줄씩 보인다(차단 아님) */
  edgeWarnings: TagCostView[];
  /** 매도만 — 아직 남은 매수에 연결된 최신 계획의 손절가 vs 지금. 매입가 · 손익률은 없다 */
  sellFraming: { stopPrice: number | null; currentPrice: number | null } | null;
}

/** 미리보기만 못 구하면 `null` — 사이즈 결과 줄은 그대로 */
export type TradeBehaviorPreviewResult = TradeBehaviorPreview | null;
