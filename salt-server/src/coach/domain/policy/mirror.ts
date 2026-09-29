/**
 * 행동 미러 — FEATURE-009 FR-12 · FR-15~19 (`SRV-REQ-038` FR-9).
 *
 * 알림이 아니라 **본인 기록의 통계**다. 지시 문구가 없고 숫자와 표본 수만 낸다.
 *
 * ## 표본 부족은 숨기지 않는다
 *
 * 표본이 20 보다 적으면 `insufficient_sample` 이지만 **값은 그대로 준다**(흐리게 보이는 것은 화면 몫).
 * 값을 만들 재료가 없을 때만 `insufficient_data` 이고 그때 값은 `null` 이다 — 0 으로 채우지 않는다.
 */

import Decimal from "decimal.js";

import { barCloseTime, effectiveAdherence, isViolation, type DailyBar } from "./adherence";
import { effectiveTags, type DecisionOutcome } from "./decisionOutcome";
import { DAY_MS, walkPortfolioDays, type PortfolioDay } from "./portfolioSeries";
import type { LedgerReplay } from "./tradeLedger";
import type { AdherenceLabel, TradePlan } from "./tradePlan";
import type { CoachLedgerEntry } from "../model";

const ZERO = new Decimal(0);

/** 표본 기준(FR-12 · FR-15 · FR-19) */
export const MIRROR_MIN_SAMPLE = 20;

export type MirrorStatus = "ok" | "insufficient_sample" | "insufficient_data";

export interface MirrorMetric<T = Decimal> {
  value: T | null;
  sampleSize: number;
  status: MirrorStatus;
}

export const mirrorMetric = <T>(value: T | null, sampleSize: number): MirrorMetric<T> => ({
  value,
  sampleSize,
  status: value === null ? "insufficient_data" : sampleSize < MIRROR_MIN_SAMPLE ? "insufficient_sample" : "ok",
});

const average = (values: Decimal[]): Decimal | null =>
  values.length ? values.reduce((sum, value) => sum.plus(value), ZERO).div(values.length) : null;

// ─── FR-12 준수율 ────────────────────────────────────────────────────────────

export interface AdherenceMirror {
  /** 판정 가능한 계획 중 위반이 없는 비율 */
  rate: MirrorMetric;
  labelCounts: Record<AdherenceLabel, number>;
  /** 준수 · 위반 계획에서 나온 청산의 평균 순수익률(수수료 후) */
  honoredAvgReturn: MirrorMetric;
  violatedAvgReturn: MirrorMetric;
}

export const adherenceMirror = (
  plans: Array<Pick<TradePlan, "id" | "adherenceLabel" | "userAdherenceLabel">>,
  outcomes: Array<Pick<DecisionOutcome, "planId" | "netReturn">>
): AdherenceMirror => {
  const labelCounts: Record<AdherenceLabel, number> = {
    honored: 0,
    stop_not_honored: 0,
    stop_slipped: 0,
    size_exceeded: 0,
  };
  const labelByPlan = new Map<string, AdherenceLabel>();
  for (const plan of plans) {
    const label = effectiveAdherence(plan);
    if (label === null) continue;
    labelCounts[label] += 1;
    labelByPlan.set(plan.id, label);
  }
  const evaluable = labelByPlan.size;

  const honoredReturns: Decimal[] = [];
  const violatedReturns: Decimal[] = [];
  for (const outcome of outcomes) {
    const label = outcome.planId ? labelByPlan.get(outcome.planId) ?? null : null;
    if (label === null) continue;
    (isViolation(label) ? violatedReturns : honoredReturns).push(outcome.netReturn);
  }

  return {
    rate: mirrorMetric(evaluable ? new Decimal(labelCounts.honored).div(evaluable) : null, evaluable),
    labelCounts,
    honoredAvgReturn: mirrorMetric(average(honoredReturns), honoredReturns.length),
    violatedAvgReturn: mirrorMetric(average(violatedReturns), violatedReturns.length),
  };
};

// ─── FR-15 처분효과 ──────────────────────────────────────────────────────────

export interface DispositionMirror {
  /** 이익 실현 비율 PGR = 실현 이익 ÷ (실현 이익 + 장부상 이익) — Odean(1998) */
  pgr: MirrorMetric;
  /** 손실 실현 비율 PLR = 실현 손실 ÷ (실현 손실 + 장부상 손실) */
  plr: MirrorMetric;
  counts: { realizedGains: number; paperGains: number; realizedLosses: number; paperLosses: number };
  /** 익절 · 손절 평균 보유일 */
  gainHoldingDays: MirrorMetric;
  lossHoldingDays: MirrorMetric;
  /** 매도일 종가가 없어 장부상 손익을 못 가른 종목 */
  missingCloses: string[];
}

/** `at` 을 포함하는 일봉 */
const barAt = (bars: DailyBar[] | undefined, at: Date): DailyBar | null =>
  bars?.find((bar) => bar.openTime <= at && at < barCloseTime(bar)) ?? null;

/**
 * 매도가 일어난 날마다: 판 종목은 실현 이익/손실, 그날 들고 있던 **다른** 종목은 그날 종가와 평단을 비교해
 * 장부상 이익/손실로 센다. 순손익 0 인 매도는 어느 쪽에도 넣지 않는다.
 */
export const dispositionMirror = (
  replay: LedgerReplay,
  barsBySymbol: Map<string, DailyBar[]>,
  outcomes: Array<Pick<DecisionOutcome, "netPnlKrw" | "holdingDays">>
): DispositionMirror => {
  const counts = { realizedGains: 0, paperGains: 0, realizedLosses: 0, paperLosses: 0 };
  const missing = new Set<string>();
  const pnlBySell = new Map(replay.closings.map((closing) => [closing.sell.id, closing.netPnlKrw]));

  for (const moment of replay.sellMoments) {
    const pnl = pnlBySell.get(moment.sellTransactionId);
    if (pnl?.gt(0)) counts.realizedGains += 1;
    else if (pnl?.lt(0)) counts.realizedLosses += 1;

    for (const holding of moment.otherHoldings) {
      const bar = barAt(barsBySymbol.get(holding.symbol), moment.at);
      if (!bar) {
        missing.add(holding.symbol);
        continue;
      }
      if (bar.close.gt(holding.unitCost)) counts.paperGains += 1;
      else if (bar.close.lt(holding.unitCost)) counts.paperLosses += 1;
    }
  }

  const sample = replay.sellMoments.length;
  const ratio = (realized: number, paper: number): Decimal | null =>
    missing.size || realized + paper === 0 ? null : new Decimal(realized).div(realized + paper);

  const gains = outcomes.filter((outcome) => outcome.netPnlKrw.gt(0)).map((outcome) => outcome.holdingDays);
  const losses = outcomes.filter((outcome) => outcome.netPnlKrw.lt(0)).map((outcome) => outcome.holdingDays);

  return {
    pgr: mirrorMetric(ratio(counts.realizedGains, counts.paperGains), sample),
    plr: mirrorMetric(ratio(counts.realizedLosses, counts.paperLosses), sample),
    counts,
    gainHoldingDays: mirrorMetric(average(gains), gains.length),
    lossHoldingDays: mirrorMetric(average(losses), losses.length),
    missingCloses: [...missing].sort(),
  };
};

// ─── 손실 비대칭(F010 슬라이스 2 · 리서치 §3-4 습관 2 · §8) ───────────────────

/** 최근 몇 건의 청산을 보나 — 리서치 §8 "최근 20건 최대 손실 / 최대 이익" */
export const LOSS_ASYMMETRY_WINDOW = 20;

/**
 * 최근 20건 청산 중 **가장 큰 손실 ÷ 가장 큰 이익**(순손익, 원). 공개 실거래 실험에서 승패를 가른 단일 지표였다
 * (살아남은 쪽 0.4배, 무너진 쪽 2.3배 — 리서치 §5). 1 보다 크면 가장 큰 손실이 가장 큰 이익보다 컸다.
 *
 * 비율만 내고 판정 문구는 없다(측정 · 미러까지, 사용자 결정 2026-09-27). 이익 · 손실 중 하나라도 없으면 값이 없다.
 */
export interface LossAsymmetryMirror {
  ratio: MirrorMetric;
  maxLossKrw: Decimal | null;
  maxGainKrw: Decimal | null;
  window: number;
}

export const lossAsymmetryMirror = (
  outcomes: Array<Pick<DecisionOutcome, "closedAt" | "netPnlKrw">>
): LossAsymmetryMirror => {
  const recent = [...outcomes]
    .sort((a, b) => b.closedAt.getTime() - a.closedAt.getTime())
    .slice(0, LOSS_ASYMMETRY_WINDOW);
  const losses = recent.map((outcome) => outcome.netPnlKrw).filter((pnl) => pnl.lt(0));
  const gains = recent.map((outcome) => outcome.netPnlKrw).filter((pnl) => pnl.gt(0));
  const maxLoss = losses.length ? Decimal.min(...losses) : null;
  const maxGain = gains.length ? Decimal.max(...gains) : null;
  return {
    ratio: mirrorMetric(maxLoss && maxGain ? maxLoss.abs().div(maxGain) : null, recent.length),
    maxLossKrw: maxLoss,
    maxGainKrw: maxGain,
    window: LOSS_ASYMMETRY_WINDOW,
  };
};

// ─── FR-16 "그냥 들고 있었으면" ──────────────────────────────────────────────

export interface BenchmarkMirror {
  status: MirrorStatus;
  /** 관찰한 일수. 표본 기준도 이것이다 */
  sampleSize: number;
  /** 실제 시간가중수익률(TWR, 수수료 후) */
  actualReturn: Decimal | null;
  /** 시작일 종가 기준 보유 구성을 그대로 들고 있었을 때 */
  holdReturn: Decimal | null;
  /** actual − hold */
  difference: Decimal | null;
  /** 차이 중 수수료 몫(음수) — 수수료가 없었다면의 TWR − 실제 TWR 의 부호 반대 */
  feeComponent: Decimal | null;
  /** 차이 중 나머지(매매 시점 · 종목 선택) */
  timingComponent: Decimal | null;
  from: Date | null;
  to: Date | null;
  /** 마지막 날 종가 평가금(원) — 월간 복기의 회전율 분모 */
  endValue: Decimal | null;
  missingCloses: string[];
}

/** 관찰 구간. `from` 이상 `to` 미만인 일봉만 센다(월간 복기) */
export interface MirrorWindow {
  from: Date;
  to: Date;
}

/**
 * 하루 단위 TWR. 평가금 흐름은 `walkPortfolioDays`(복기와 같은 규칙).
 *
 * - 실제: r_d = (V_d − F_d) ÷ V_{d−1} − 1. F_d = 매수(대금 + 수수료) − 매도(대금 − 수수료)
 * - 보유: 시작일 종가의 종목 비중 w 로 Σ w · (P_T ÷ P_0) − 1. 이후 순입금은 **같은 날 같은 비중으로 샀다**고
 *   가정한다(2026-09-27 사용자 결정) — TWR 은 입출금에 영향받지 않으므로 이 가정에서 보유 수익률은 위 식 그대로다
 * - 수수료 몫: 수수료 0 으로 본 F_d 로 다시 잰 TWR 과의 차이
 * - 시작일: 구간이 없으면 첫 보유일. 구간이 있으면 구간 전날(그날 보유가 있으면) 또는 구간 안 첫 보유일
 */
export const benchmarkMirror = (
  entries: CoachLedgerEntry[],
  barsBySymbol: Map<string, DailyBar[]>,
  now: Date,
  window?: MirrorWindow
): BenchmarkMirror => {
  const empty = (missingCloses: string[] = []): BenchmarkMirror => ({
    status: "insufficient_data",
    sampleSize: 0,
    actualReturn: null,
    holdReturn: null,
    difference: null,
    feeComponent: null,
    timingComponent: null,
    from: null,
    to: null,
    endValue: null,
    missingCloses,
  });
  if (!entries.length) return empty();

  const closedLastDay = Math.floor(now.getTime() / DAY_MS) * DAY_MS - DAY_MS; // 닫힌 마지막 일봉
  const windowFrom = window ? window.from.getTime() : Number.NEGATIVE_INFINITY;
  const lastDay = window ? Math.min(closedLastDay, window.to.getTime() - DAY_MS) : closedLastDay;

  const walk = walkPortfolioDays(entries, barsBySymbol, lastDay, windowFrom - DAY_MS);
  if (walk.status === "missing_close") return empty(walk.missingCloses);

  let actual = new Decimal(1);
  let feeless = new Decimal(1);
  let days = 0;
  let start: PortfolioDay | null = null;
  let end: PortfolioDay | null = null;
  let prev: PortfolioDay | null = null;

  for (const day of walk.days) {
    if (day.day >= windowFrom) {
      // 구간 전날 보유가 있으면 그날 종가가 출발점이다
      if (!start && prev && prev.day < windowFrom && prev.value.gt(0)) start = prev;
      if (start && prev && prev.value.gt(0)) {
        actual = actual.times(day.value.minus(day.flow).div(prev.value));
        feeless = feeless.times(day.value.minus(day.flowFeeless).div(prev.value));
        days += 1;
      }
      if (!start && day.value.gt(0)) start = day;
      end = day;
    }
    prev = day;
  }

  if (!start || !end) return empty();

  let hold = ZERO;
  for (const [symbol, holding] of start.holdings) {
    const weight = holding.quantity.times(holding.price).div(start.value);
    hold = hold.plus(weight.times(end.closes.get(symbol)!.div(holding.price)));
  }
  const actualReturn = actual.minus(1);
  const holdReturn = hold.minus(1);
  const difference = actualReturn.minus(holdReturn);
  const feeComponent = actual.minus(feeless);

  return {
    status: days < MIRROR_MIN_SAMPLE ? "insufficient_sample" : "ok",
    sampleSize: days,
    actualReturn,
    holdReturn,
    difference,
    feeComponent,
    timingComponent: difference.minus(feeComponent),
    from: new Date(start.day),
    to: new Date(end.day + DAY_MS),
    endValue: end.value,
    missingCloses: [],
  };
};

// ─── FR-18 · 19 실수 태그 비용 · 엣지 없음 ───────────────────────────────────

export interface TagCost {
  tag: string;
  count: number;
  netPnlKrw: Decimal;
  avgReturn: Decimal;
  /** 손절가가 있는 청산만의 평균 R. 없으면 `null` */
  avgR: Decimal | null;
  rSampleSize: number;
  status: MirrorStatus;
  /** 표본 ≥ 20 에서 기대값(R 표본이 충분하면 R, 아니면 수익률)이 음수 */
  noEdge: boolean;
}

/** 태그별 손익 합. 비용이 큰(합이 작은) 태그가 앞 */
export const tagCosts = (
  outcomes: Array<Pick<DecisionOutcome, "autoTags" | "userTags" | "userTagsConfirmedAt" | "netPnlKrw" | "netReturn" | "rMultiple">>
): TagCost[] => {
  const groups = new Map<string, typeof outcomes>();
  for (const outcome of outcomes) {
    for (const tag of effectiveTags(outcome)) {
      const group = groups.get(tag) ?? [];
      group.push(outcome);
      groups.set(tag, group);
    }
  }

  return [...groups.entries()]
    .map(([tag, group]) => {
      const rs = group.flatMap((outcome) => (outcome.rMultiple ? [outcome.rMultiple] : []));
      const avgReturn = average(group.map((outcome) => outcome.netReturn))!;
      const avgR = average(rs);
      const expectancy = rs.length >= MIRROR_MIN_SAMPLE ? avgR! : avgReturn;
      return {
        tag,
        count: group.length,
        netPnlKrw: group.reduce((sum, outcome) => sum.plus(outcome.netPnlKrw), ZERO),
        avgReturn,
        avgR,
        rSampleSize: rs.length,
        status: group.length < MIRROR_MIN_SAMPLE ? ("insufficient_sample" as const) : ("ok" as const),
        noEdge: group.length >= MIRROR_MIN_SAMPLE && expectancy.isNegative(),
      };
    })
    .sort((a, b) => a.netPnlKrw.comparedTo(b.netPnlKrw));
};

// ─── FR-17 회전율 기준선 ─────────────────────────────────────────────────────

/**
 * 회전율 비교 기준선 — **서버 상수**(FR-17). 국내 주식 · 일 회전율이다. 코인 · 연 회전율과 단위가 달라
 * 서버가 환산하지 않고 출처 · 단위와 함께 그대로 준다.
 * 근거: `requirements/reports/research/2026-09-24-fund-manager-coach.md` L7.
 */
export const TURNOVER_BASELINE = {
  source: "자본시장연구원(2021) 코로나19 국면의 개인투자자",
  url: "https://www.kcmi.re.kr/report/report_view?report_no=1243",
  period: "2020-03~2020-10",
  market: "국내 주식",
  unit: "daily",
  newRetailDailyTurnover: new Decimal("0.068"),
  marketDailyTurnover: new Decimal("0.014"),
} as const;
