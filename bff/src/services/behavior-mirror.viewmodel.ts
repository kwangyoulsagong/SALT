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

export interface TradeBehaviorPreview {
  status: "ok";
  candidateTags: string[];
  chasingUnknown: boolean;
  edgeWarnings: TagCostView[];
  sellFraming: { stopPrice: number | null; currentPrice: number | null } | null;
}

// ─── 공통 조각 ────────────────────────────────────────────────

const sampleSize = (value: unknown): number => {
  const n = num(value);
  return n !== null && n >= 0 ? Math.floor(n) : 0;
};

/** 모르는 상태는 `insufficient_data`. 값이 없는데 `ok` 라고 하면 그것도 `insufficient_data` 다 */
const toMetric = (raw: unknown): MirrorMetric => {
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

const toTagCosts = (raw: unknown): TagCostView[] =>
  Array.isArray(raw) ? raw.map(toTagCost).filter((cost): cost is TagCostView => cost !== null) : [];

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
  };
};
