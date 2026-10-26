import {
  BehaviorMirrorContractError,
  toAdherenceView,
  toLossAsymmetryView,
  toMetric,
  toStreakView,
  toTagCosts,
  toTradeTimingView,
  type BehaviorMirrorView,
  type LossAsymmetryView,
  type MirrorMetric,
  type StreakView,
  type TagCostView,
  type TradeTimingView,
} from "./behavior-mirror.viewmodel";

/**
 * 국내 주식 거래 미러 뷰모델 — **순수 함수** (F011 `BFF-REQ-040` FR-24, 서버 `SRV-REQ-040` FR-47).
 *
 * 코인 미러(`behavior-mirror.viewmodel`)와 같은 규칙이다: 숫자 자리에 숫자가 아니면 `null`, 모르는 표본 상태는
 * `insufficient_data`, 뼈대(`status`)가 깨졌으면 `BehaviorMirrorContractError`. 기준점은 출처 · 기간이 온전할 때만 준다 —
 * 출처 없는 숫자를 화면에 비교 대상으로 놓지 않는다.
 */

type Raw = Record<string, unknown>;

const isRecord = (value: unknown): value is Raw =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const num = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;
const str = (value: unknown): string | null => (typeof value === "string" && value.trim() ? value : null);
const count = (value: unknown): number => {
  const n = num(value);
  return n !== null && n >= 0 ? Math.floor(n) : 0;
};

export interface MirrorSource {
  source: string;
  url: string;
  period: string;
}

export interface KrBehaviorMirrorView {
  status: "ok";
  historyStatus: "ok" | "truncated";
  /** ① 최근 250거래일 일 회전율 — 기준선은 코인 미러와 같은 국내 일 회전율 */
  turnover: {
    dailyTurnover: MirrorMetric;
    tradeCount: number | null;
    windowTradingDays: number | null;
    baseline: (MirrorSource & { newRetailDailyTurnover: number; marketDailyTurnover: number }) | null;
  };
  /** ② PGR · PLR · 평균 보유 **거래일** */
  disposition: {
    pgr: MirrorMetric;
    plr: MirrorMetric;
    gainHoldingDays: MirrorMetric;
    lossHoldingDays: MirrorMetric;
  } | null;
  /** ② 매수 다음 거래일 매도율(이익 · 손실) */
  nextDaySell: {
    gainSellRate: MirrorMetric;
    lossSellRate: MirrorMetric;
    baseline: (MirrorSource & { gainSellRate: number; lossSellRate: number }) | null;
  };
  /** ③ 매수 직전 40거래일 상승률. `excluded` = 이력 부족 · 원천 끊김으로 못 잰 매수 */
  chase: {
    avgPriorReturn: MirrorMetric;
    medianPriorReturn: MirrorMetric;
    windowTradingDays: number | null;
    excluded: number;
    baseline: (MirrorSource & { priorReturn: number }) | null;
  };
  /** ④ 최근 1년 매수 대금 중 복권형 몫 · 같은 단면의 복권형 종목 비율 */
  lottery: {
    buyShare: MirrorMetric;
    marketShare: number | null;
    unknownBuys: number;
    lookbackMonths: number | null;
    evidence: (MirrorSource & { excessReturn: number }) | null;
  };
  /**
   * 판정 배치가 저장한 국내 청산 결과로 센 것 — 코인 미러와 같은 모양 · 같은 규칙(깨진 조각은 `null`/빈 배열).
   * `outcomeCount` 가 0 이면 아직 국내 청산이 없다
   */
  adherence: BehaviorMirrorView["adherence"];
  tagCosts: TagCostView[];
  streak: StreakView | null;
  timing: TradeTimingView | null;
  lossAsymmetry: LossAsymmetryView | null;
  outcomeCount: number;
  outcomesComputedAt: string | null;
  /** 읽은 국내 거래 수(잘리면 0) — 0 이면 화면은 빈 상태 */
  tradeCount: number;
  minSample: number;
  asOf: string | null;
}

export type KrBehaviorMirrorResult = KrBehaviorMirrorView | { status: "unavailable" };

const source = (raw: Raw): MirrorSource | null => {
  const name = str(raw.source);
  const url = str(raw.url);
  const period = str(raw.period);
  return name && url && period ? { source: name, url, period } : null;
};

/** 출처와 숫자가 다 있어야 기준점이다 */
const withNumbers = <K extends string>(raw: unknown, keys: readonly K[]): (MirrorSource & Record<K, number>) | null => {
  if (!isRecord(raw)) return null;
  const base = source(raw);
  if (!base) return null;
  const values = {} as Record<K, number>;
  for (const key of keys) {
    const value = num(raw[key]);
    if (value === null) return null;
    values[key] = value;
  }
  return { ...base, ...values };
};

const section = (raw: Raw, key: string): Raw => (isRecord(raw[key]) ? (raw[key] as Raw) : {});

export const toKrBehaviorMirrorViewModel = (raw: Raw): KrBehaviorMirrorView => {
  const historyStatus = raw.status === "ok" || raw.status === "truncated" ? raw.status : null;
  if (!historyStatus) throw new BehaviorMirrorContractError("status");

  const turnover = section(raw, "turnover");
  const nextDaySell = section(raw, "nextDaySell");
  const chase = section(raw, "chase");
  const chaseCounts = section(chase, "counts");
  const lottery = section(raw, "lottery");
  const lotteryCounts = section(lottery, "counts");
  const disposition = isRecord(raw.disposition) ? raw.disposition : null;

  return {
    status: "ok",
    historyStatus,
    turnover: {
      dailyTurnover: toMetric(turnover.dailyTurnover),
      tradeCount: num(turnover.tradeCount),
      windowTradingDays: num(turnover.windowTradingDays),
      baseline: withNumbers(turnover.baseline, ["newRetailDailyTurnover", "marketDailyTurnover"] as const),
    },
    disposition: disposition && {
      pgr: toMetric(disposition.pgr),
      plr: toMetric(disposition.plr),
      gainHoldingDays: toMetric(disposition.gainHoldingDays),
      lossHoldingDays: toMetric(disposition.lossHoldingDays),
    },
    nextDaySell: {
      gainSellRate: toMetric(nextDaySell.gainSellRate),
      lossSellRate: toMetric(nextDaySell.lossSellRate),
      baseline: withNumbers(nextDaySell.baseline, ["gainSellRate", "lossSellRate"] as const),
    },
    chase: {
      avgPriorReturn: toMetric(chase.avgPriorReturn),
      medianPriorReturn: toMetric(chase.medianPriorReturn),
      windowTradingDays: num(chase.windowTradingDays),
      excluded: count(chaseCounts.shortHistory) + count(chaseCounts.breaks),
      baseline: withNumbers(chase.baseline, ["priorReturn"] as const),
    },
    lottery: {
      buyShare: toMetric(lottery.buyShare),
      marketShare: num(lottery.marketShare),
      unknownBuys: count(lotteryCounts.unknownBuys),
      lookbackMonths: num(lottery.lookbackMonths),
      evidence: withNumbers(lottery.evidence, ["excessReturn"] as const),
    },
    adherence: toAdherenceView(raw.adherence),
    tagCosts: toTagCosts(raw.tagCosts),
    streak: toStreakView(raw.streak),
    timing: toTradeTimingView(raw.timing),
    lossAsymmetry: toLossAsymmetryView(raw.lossAsymmetry),
    outcomeCount: count(raw.outcomeCount),
    outcomesComputedAt: str(raw.outcomesComputedAt),
    tradeCount: count(raw.tradeCount),
    minSample: num(raw.minSample) ?? 20,
    asOf: str(raw.asOf),
  };
};
