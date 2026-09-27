/**
 * 내 거래 미러 · 결정 결과 · 입력 중 행동 미리보기 뷰모델 — **순수 함수** (F009 슬라이스 5 `BFF-REQ-038` FR-7~9).
 *
 * 서버(`SRV-REQ-038` FR-9 · FR-12)가 비율 · 금액 · 표본 판정을 다 계산해 준다. 여기는 `trade-risk.viewmodel` 과 같은 규칙이다:
 *
 * 1. 숫자 자리에 숫자가 아니면 `null` — 0 으로 채우지 않는다(0% 준수율은 "하나도 안 지켰다"로 읽힌다)
 * 2. 상태 코드는 허용 목록만. 모르는 표본 상태는 `insufficient_data` 로 내린다 — "정상"으로 올리지 않는다
 * 3. 뼈대(미러 상태 · 결과 id)가 깨졌으면 `BehaviorMirrorContractError` — 서비스가 `unavailable` 로 바꾼다
 *
 * 입력 중 미리보기(`behavior`)는 보조 줄이다 — 깨졌으면 던지지 않고 `null` 이다. 사이즈 결과 줄이 같이 사라지면 안 된다.
 */

/** 계획 준수 라벨 — 계획 뷰모델(`trade-risk.viewmodel`)도 이것을 쓴다. 한 방향 의존을 위해 여기 둔다 */
export const ADHERENCE_LABELS = ["honored", "stop_not_honored", "stop_slipped", "size_exceeded"] as const;

export class BehaviorMirrorContractError extends Error {
  constructor(field: string) {
    super(`behavior mirror contract broken: ${field}`);
  }
}

type Raw = Record<string, unknown>;

const isRecord = (value: unknown): value is Raw =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const num = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;
const str = (value: unknown): string | null => (typeof value === "string" ? value : null);
const oneOf = <T extends string>(value: unknown, allowed: readonly T[]): T | null =>
  typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : null;
const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

type AdherenceLabel = (typeof ADHERENCE_LABELS)[number];

const MIRROR_STATUSES = ["ok", "insufficient_sample", "insufficient_data"] as const;
export type MirrorStatus = (typeof MIRROR_STATUSES)[number];

export interface MirrorMetric {
  value: number | null;
  sampleSize: number;
  status: MirrorStatus;
}

export interface TagCostView {
  tag: string;
  count: number;
  netPnlKrw: number;
  avgReturn: number | null;
  avgR: number | null;
  rSampleSize: number;
  status: MirrorStatus;
  noEdge: boolean;
}

export interface BehaviorMirrorView {
  status: "ok";
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
  /** 슬라이스 6. 서버가 아직 주지 않으면 `null` */
  brier: BrierView | null;
  /** 슬라이스 7 — 연승 · 연패(FR-20). 서버가 아직 주지 않거나 깨졌으면 `null` */
  streak: StreakView | null;
  /** 슬라이스 7 — 진입 시간대 · 요일(FR-22). 서버가 아직 주지 않거나 깨졌으면 `null` */
  timing: TradeTimingView | null;
  outcomeCount: number;
  outcomesComputedAt: string | null;
  minSample: number;
  asOf: string | null;
}

export type BehaviorMirrorResult = BehaviorMirrorView | { status: "unavailable" };

export interface DecisionOutcomeView {
  id: string;
  symbol: string;
  openedAt: string;
  closedAt: string;
  holdingDays: number | null;
  netPnlKrw: number;
  netReturn: number | null;
  rMultiple: number | null;
  heldReturn30d: number | null;
  adherenceLabel: AdherenceLabel | null;
  autoTags: string[];
  userTags: string[];
  tagsConfirmedAt: string | null;
}

export type DecisionOutcomeListResult = { status: "ok"; outcomes: DecisionOutcomeView[] } | { status: "unavailable" };

export interface EntryChecklistView {
  /** 본인 실수 태그 상위 3개(손익 합 음수)에서 자란 질문. 문장은 서버 템플릿 */
  items: Array<{ tag: string; question: string; count: number; netPnlKrw: number }>;
  premortemQuestion: string;
}

export interface TradeBehaviorPreview {
  status: "ok";
  candidateTags: string[];
  chasingUnknown: boolean;
  edgeWarnings: TagCostView[];
  sellFraming: { stopPrice: number | null; currentPrice: number | null } | null;
  /** 매수만 — 진입 전 체크리스트(슬라이스 6, FR-30). 깨졌거나 매도면 `null` */
  checklist: EntryChecklistView | null;
}

/** "오를 확률" 채점(슬라이스 6, `SRV-REQ-038` FR-10 · FEATURE-009 FR-13) */
export interface BrierView {
  meanScore: MirrorMetric;
  /** 늘 50% 라고 말했을 때(0.25) */
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

export const STREAK_KINDS = ["win", "loss"] as const;
export const TIME_BANDS = ["dawn", "morning", "afternoon", "evening"] as const;
export const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

export interface StreakSizingView {
  /** 연속 뒤 매수 금액 평균 ÷ 그 밖의 평균. 표본 = 연속 뒤 매수 수 */
  ratio: MirrorMetric;
  /** 서버가 "관찰됐다"고 한 것만 true — 화면은 이때만 패턴 문장을 보인다 */
  observed: boolean;
}

export interface StreakView {
  current: { kind: (typeof STREAK_KINDS)[number]; length: number } | null;
  longestWin: number;
  longestLoss: number;
  sampleSize: number;
  minLength: number;
  afterWins: StreakSizingView | null;
  afterLosses: StreakSizingView | null;
}

export interface TimingBucketView<K extends string> {
  key: K;
  count: number;
  winRate: number | null;
  avgReturn: number | null;
  netPnlKrw: number;
  status: MirrorStatus;
}

export interface TradeTimingView {
  /** 시각을 적은 진입이 하나도 없으면 `null` — 섹션 없음 */
  bands: Array<TimingBucketView<(typeof TIME_BANDS)[number]>> | null;
  weekdays: Array<TimingBucketView<(typeof WEEKDAYS)[number]>>;
  timedCount: number;
  untimedCount: number;
}

// ─── 공통 조각 ────────────────────────────────────────────────

const sampleSize = (value: unknown): number => {
  const n = num(value);
  return n !== null && n >= 0 ? Math.floor(n) : 0;
};

/** 모르는 상태는 `insufficient_data`. 값이 없는데 `ok` 라고 하면 그것도 `insufficient_data` 다 */
export const toMetric = (raw: unknown): MirrorMetric => {
  const metric = isRecord(raw) ? raw : {};
  const value = num(metric.value);
  const status = oneOf(metric.status, MIRROR_STATUSES) ?? "insufficient_data";
  return { value, sampleSize: sampleSize(metric.sampleSize), status: value === null ? "insufficient_data" : status };
};

/** 태그 비용 한 줄. 태그 · 건수 · 손익이 깨졌으면 줄을 뺀다(`null`) */
export const toTagCost = (raw: unknown): TagCostView | null => {
  if (!isRecord(raw)) return null;
  const tag = str(raw.tag)?.trim();
  const count = num(raw.count);
  const netPnlKrw = num(raw.netPnlKrw);
  if (!tag || count === null || netPnlKrw === null) return null;
  return {
    tag,
    count,
    netPnlKrw,
    avgReturn: num(raw.avgReturn),
    avgR: num(raw.avgR),
    rSampleSize: sampleSize(raw.rSampleSize),
    status: oneOf(raw.status, MIRROR_STATUSES) ?? "insufficient_data",
    // 배지는 서버가 참이라고 한 것만 — 모양이 깨졌으면 배지를 달지 않는다
    noEdge: raw.noEdge === true,
  };
};

export const toTagCosts = (raw: unknown): TagCostView[] =>
  Array.isArray(raw) ? raw.map(toTagCost).filter((cost): cost is TagCostView => cost !== null) : [];

// ─── "오를 확률" 채점 ────────────────────────────────────────

/** 깨진 모양이면 `null` — 미러 전체를 막지 않는다. 사례는 가격 · 날짜가 온전한 것만 */
export const toBrierView = (raw: unknown): BrierView | null => {
  if (!isRecord(raw) || !isRecord(raw.meanScore)) return null;
  const misses = Array.isArray(raw.recentMisses) ? raw.recentMisses : [];
  return {
    meanScore: toMetric(raw.meanScore),
    baseline: num(raw.baseline),
    skill: num(raw.skill),
    missedCount: sampleSize(raw.missedCount),
    pendingCount: sampleSize(raw.pendingCount),
    unscorableCount: sampleSize(raw.unscorableCount),
    recentMisses: misses.flatMap((item) => {
      if (!isRecord(item)) return [];
      const symbol = str(item.symbol);
      const probabilityUp = num(item.probabilityUp);
      const plannedAt = str(item.plannedAt);
      const dueAt = str(item.dueAt);
      const referenceClose = num(item.referenceClose);
      const outcomeClose = num(item.outcomeClose);
      if (!symbol || probabilityUp === null || !plannedAt || !dueAt || referenceClose === null || outcomeClose === null) {
        return [];
      }
      return [{ symbol, probabilityUp, plannedAt, dueAt, referenceClose, outcomeClose, up: item.up === true }];
    }),
  };
};

// ─── 연승 · 연패 · 시간대 ───────────────────────────────────

const toSizing = (raw: unknown): StreakSizingView | null =>
  isRecord(raw) && isRecord(raw.ratio)
    ? { ratio: toMetric(raw.ratio), observed: raw.observed === true && num(raw.ratio.value) !== null }
    : null;

/** 뼈대(최장 · 표본)가 깨졌으면 `null`. 지금 연속은 종류 · 길이가 온전할 때만 */
export const toStreakView = (raw: unknown): StreakView | null => {
  if (!isRecord(raw)) return null;
  const longestWin = num(raw.longestWin);
  const longestLoss = num(raw.longestLoss);
  if (longestWin === null || longestLoss === null) return null;
  const current = isRecord(raw.current) ? raw.current : null;
  const kind = oneOf(current?.kind, STREAK_KINDS);
  const length = num(current?.length);
  return {
    current: kind && length !== null && length > 0 ? { kind, length: Math.floor(length) } : null,
    longestWin: sampleSize(longestWin),
    longestLoss: sampleSize(longestLoss),
    sampleSize: sampleSize(raw.sampleSize),
    minLength: sampleSize(raw.minLength),
    afterWins: toSizing(raw.afterWins),
    afterLosses: toSizing(raw.afterLosses),
  };
};

const toBuckets = <K extends string>(raw: unknown, keys: readonly K[]): Array<TimingBucketView<K>> => {
  const rows = Array.isArray(raw) ? raw.filter(isRecord) : [];
  // 서버 순서가 아니라 고정 순서로 — 빠진 칸은 빈 칸(0건)으로 둔다
  return keys.map((key) => {
    const row = rows.find((candidate) => candidate.key === key);
    const count = sampleSize(row?.count);
    return {
      key,
      count,
      winRate: num(row?.winRate),
      avgReturn: num(row?.avgReturn),
      netPnlKrw: num(row?.netPnlKrw) ?? 0,
      status: count === 0 ? "insufficient_data" : oneOf(row?.status, MIRROR_STATUSES) ?? "insufficient_data",
    };
  });
};

export const toTradeTimingView = (raw: unknown): TradeTimingView | null => {
  if (!isRecord(raw) || !Array.isArray(raw.weekdays)) return null;
  return {
    bands: Array.isArray(raw.bands) ? toBuckets(raw.bands, TIME_BANDS) : null,
    weekdays: toBuckets(raw.weekdays, WEEKDAYS),
    timedCount: sampleSize(raw.timedCount),
    untimedCount: sampleSize(raw.untimedCount),
  };
};

// ─── 미러 ─────────────────────────────────────────────────────

export const toBehaviorMirrorViewModel = (data: Raw): BehaviorMirrorView => {
  const historyStatus = oneOf(data.status, ["ok", "truncated"] as const);
  if (!historyStatus) throw new BehaviorMirrorContractError("status");
  if (!Array.isArray(data.tagCosts)) throw new BehaviorMirrorContractError("tagCosts");

  const adherence = isRecord(data.adherence) ? data.adherence : null;
  const counts = isRecord(adherence?.labelCounts) ? adherence.labelCounts : {};
  const disposition = isRecord(data.disposition) ? data.disposition : null;
  const benchmark = isRecord(data.benchmark) ? data.benchmark : null;
  const turnover = isRecord(data.turnover) ? data.turnover : {};
  const baseline = isRecord(turnover.baseline) ? turnover.baseline : null;

  const baselineSource = str(baseline?.source);
  const baselineUrl = str(baseline?.url);
  const baselinePeriod = str(baseline?.period);
  const baselineMarket = str(baseline?.market);
  const newRetail = num(baseline?.newRetailDailyTurnover);
  const market = num(baseline?.marketDailyTurnover);

  return {
    status: "ok",
    historyStatus,
    adherence: adherence && {
      rate: toMetric(adherence.rate),
      labelCounts: Object.fromEntries(
        ADHERENCE_LABELS.map((label) => [label, sampleSize(counts[label])]),
      ) as Record<AdherenceLabel, number>,
      honoredAvgReturn: toMetric(adherence.honoredAvgReturn),
      violatedAvgReturn: toMetric(adherence.violatedAvgReturn),
    },
    disposition: disposition && {
      pgr: toMetric(disposition.pgr),
      plr: toMetric(disposition.plr),
      gainHoldingDays: toMetric(disposition.gainHoldingDays),
      lossHoldingDays: toMetric(disposition.lossHoldingDays),
      missingCloses: strings(disposition.missingCloses),
    },
    benchmark: benchmark && {
      status: oneOf(benchmark.status, MIRROR_STATUSES) ?? "insufficient_data",
      sampleSize: sampleSize(benchmark.sampleSize),
      actualReturn: num(benchmark.actualReturn),
      holdReturn: num(benchmark.holdReturn),
      difference: num(benchmark.difference),
      feeComponent: num(benchmark.feeComponent),
      timingComponent: num(benchmark.timingComponent),
      from: str(benchmark.from),
      to: str(benchmark.to),
    },
    tagCosts: toTagCosts(data.tagCosts),
    turnover: {
      status: turnover.status === "ok" ? "ok" : "insufficient_data",
      trailingYearTurnover: num(turnover.trailingYearTurnover),
      feesYearToDateKrw: num(turnover.feesYearToDateKrw),
      tradeCount: num(turnover.tradeCount),
      // 기준선은 출처와 짝이다 — 하나라도 빠지면 기준선 줄 자체를 뺀다
      baseline:
        baselineSource && baselineUrl && baselinePeriod && baselineMarket && newRetail !== null && market !== null
          ? {
              source: baselineSource,
              url: baselineUrl,
              period: baselinePeriod,
              market: baselineMarket,
              newRetailDailyTurnover: newRetail,
              marketDailyTurnover: market,
            }
          : null,
    },
    brier: toBrierView(data.brier),
    streak: toStreakView(data.streak),
    timing: toTradeTimingView(data.timing),
    outcomeCount: sampleSize(data.outcomeCount),
    outcomesComputedAt: str(data.outcomesComputedAt),
    minSample: sampleSize(data.minSample),
    asOf: str(data.asOf),
  };
};

// ─── 결정 결과 ────────────────────────────────────────────────

export const toDecisionOutcomeViewModel = (raw: Raw): DecisionOutcomeView => {
  const id = str(raw.id);
  const symbol = str(raw.symbol);
  const openedAt = str(raw.openedAt);
  const closedAt = str(raw.closedAt);
  const netPnlKrw = num(raw.netPnlKrw);
  if (!id) throw new BehaviorMirrorContractError("id");
  if (!symbol) throw new BehaviorMirrorContractError("symbol");
  if (!openedAt || !closedAt) throw new BehaviorMirrorContractError("openedAt/closedAt");
  if (netPnlKrw === null) throw new BehaviorMirrorContractError("netPnlKrw");

  return {
    id,
    symbol,
    openedAt,
    closedAt,
    holdingDays: num(raw.holdingDays),
    netPnlKrw,
    netReturn: num(raw.netReturn),
    rMultiple: num(raw.rMultiple),
    heldReturn30d: num(raw.heldReturn30d),
    adherenceLabel: oneOf(raw.adherenceLabel, ADHERENCE_LABELS),
    autoTags: strings(raw.autoTags),
    userTags: strings(raw.userTags),
    tagsConfirmedAt: str(raw.tagsConfirmedAt),
  };
};

/** 목록은 깨진 행만 뺀다 — 한 행 때문에 목록 전체가 사라지지 않게 */
export const toDecisionOutcomeList = (raw: unknown): DecisionOutcomeView[] => {
  if (!Array.isArray(raw)) throw new BehaviorMirrorContractError("outcomes");
  return raw.flatMap((row) => {
    if (!isRecord(row)) return [];
    try {
      return [toDecisionOutcomeViewModel(row)];
    } catch {
      return [];
    }
  });
};

// ─── 입력 중 미리보기 ─────────────────────────────────────────

/**
 * 사이즈 계산의 `behavior`. 서버 `null` · `truncated` · 깨진 모양은 전부 `null` — 던지지 않는다.
 * `planId` 는 옮기지 않는다(화면이 쓰지 않는다).
 */
export const toTradeBehaviorPreview = (raw: unknown): TradeBehaviorPreview | null => {
  if (!isRecord(raw) || raw.status !== "ok") return null;
  if (!Array.isArray(raw.candidateTags) || !Array.isArray(raw.edgeWarnings)) return null;
  const framing = isRecord(raw.sellFraming) ? raw.sellFraming : null;
  return {
    status: "ok",
    candidateTags: strings(raw.candidateTags),
    chasingUnknown: raw.chasingUnknown === true,
    edgeWarnings: toTagCosts(raw.edgeWarnings).filter((cost) => cost.noEdge),
    sellFraming: framing && { stopPrice: num(framing.stopPrice), currentPrice: num(framing.currentPrice) },
    checklist: toEntryChecklist(raw.checklist),
  };
};

/** 질문 · 태그가 빈 줄은 뺀다. 프리모템 문장이 없으면 체크리스트 자체를 뺀다 */
const toEntryChecklist = (raw: unknown): EntryChecklistView | null => {
  if (!isRecord(raw)) return null;
  const premortemQuestion = str(raw.premortemQuestion)?.trim();
  if (!premortemQuestion) return null;
  const items = Array.isArray(raw.items) ? raw.items : [];
  return {
    premortemQuestion,
    items: items.flatMap((item) => {
      if (!isRecord(item)) return [];
      const tag = str(item.tag)?.trim();
      const question = str(item.question)?.trim();
      const count = num(item.count);
      const netPnlKrw = num(item.netPnlKrw);
      return tag && question && count !== null && netPnlKrw !== null ? [{ tag, question, count, netPnlKrw }] : [];
    }),
  };
};
