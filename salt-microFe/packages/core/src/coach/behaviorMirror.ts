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
  /** 내가 적은 "오를 확률"의 채점(슬라이스 6). 서버가 아직 주지 않으면 `null` */
  brier: BrierView | null;
  /** 연승 · 연패(슬라이스 7, FR-20). 서버가 아직 주지 않으면 `null` */
  streak: StreakView | null;
  /** 진입 시간대 · 요일(슬라이스 7, FR-22). 서버가 아직 주지 않으면 `null` */
  timing: TradeTimingView | null;
  /** 손실 비대칭(F010 슬라이스 2) — 최근 `window` 건 가장 큰 손실 ÷ 가장 큰 이익. 서버가 아직 주지 않으면 `null` */
  lossAsymmetry: LossAsymmetryView | null;
  outcomeCount: number;
  outcomesComputedAt: string | null;
  minSample: number;
  asOf: string | null;
}

/**
 * "오를 확률" 채점(FEATURE-009 FR-13). 계획의 복기일(없으면 30일) 뒤 방향으로 Brier.
 * 성적 문구 4요소(기간 · 표본 · 기준 대비 · 빗나간 사례)가 이 모양에 다 있다(FR-33)
 */
export interface BrierView {
  /** 평균 Brier — 0 이 완벽, 0.25 가 늘 50% */
  meanScore: MirrorMetric;
  baseline: number | null;
  /** 1 − 평균 ÷ 기준선. 양수면 기준선보다 낫다 */
  skill: number | null;
  missedCount: number;
  pendingCount: number;
  unscorableCount: number;
  recentMisses: Array<{
    symbol: string;
    probabilityUp: number;
    plannedAt: string;
    dueAt: string;
    referenceClose: number;
    outcomeClose: number;
    up: boolean;
  }>;
}

export interface StreakSizingView {
  /** 연속 뒤 매수 금액 평균 ÷ 그 밖의 평균(수수료 제외 · 자본 증가 미보정). 표본 = 연속 뒤 매수 수 */
  ratio: MirrorMetric;
  /** 서버가 "관찰됐다"(비율 · 표본 기준 통과)고 한 것만 true — 패턴 문장은 이때만 */
  observed: boolean;
}

/** 연승 · 연패(FEATURE-009 FR-20). 순손익 0 청산은 연속을 끊는다 */
export interface StreakView {
  current: { kind: "win" | "loss"; length: number } | null;
  longestWin: number;
  longestLoss: number;
  /** 청산 수 */
  sampleSize: number;
  /** 연속으로 치는 최소 건수(서버 상수) */
  minLength: number;
  afterWins: StreakSizingView | null;
  afterLosses: StreakSizingView | null;
}

export type TimeBand = "dawn" | "morning" | "afternoon" | "evening";
export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export interface TimingBucketView<K extends string> {
  key: K;
  count: number;
  winRate: number | null;
  avgReturn: number | null;
  netPnlKrw: number;
  status: MirrorStatus;
}

/** 진입 시간대 · 요일별 청산 성과(FEATURE-009 FR-22). 시각은 KST, 순서는 고정 */
export interface TradeTimingView {
  /** 시각을 적은 진입이 하나도 없으면 `null` — 섹션 없음 */
  bands: Array<TimingBucketView<TimeBand>> | null;
  weekdays: Array<TimingBucketView<Weekday>>;
  timedCount: number;
  /** 날짜만 적은 진입(시간대에서 뺐다) */
  untimedCount: number;
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
  /** 매수만 — 진입 전 체크리스트(슬라이스 6, FR-30). 선택 펼침 · 기록만 */
  checklist: EntryChecklistView | null;
}

export interface EntryChecklistView {
  /** 본인 실수 태그 상위 3개(손익 합 음수)에서 자란 질문. 문장은 서버 템플릿 */
  items: Array<{ tag: string; question: string; count: number; netPnlKrw: number }>;
  /** 답은 계획의 `invalidation` 에 들어간다 */
  premortemQuestion: string;
}

/** 미리보기만 못 구하면 `null` — 사이즈 결과 줄은 그대로 */
export type TradeBehaviorPreviewResult = TradeBehaviorPreview | null;

/** 손실 비대칭. 측정만 — 판정 문구가 없다. 한쪽 금액이 없으면 `ratio.value: null` */
export interface LossAsymmetryView {
  ratio: MirrorMetric;
  /** 가장 큰 손실(원, 음수). 없으면 `null` */
  maxLossKrw: number | null;
  /** 가장 큰 이익(원, 양수). 없으면 `null` */
  maxGainKrw: number | null;
  window: number;
}
