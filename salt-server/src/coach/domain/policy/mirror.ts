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
import type { LedgerReplay } from "./tradeLedger";
import type { AdherenceLabel, TradePlan } from "./tradePlan";
import type { CoachLedgerEntry } from "../model";

const ZERO = new Decimal(0);
const DAY_MS = 24 * 60 * 60 * 1000;

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

// ─── FR-16 "그냥 들고 있었으면" ──────────────────────────────────────────────

export interface BenchmarkMirror {
  status: MirrorStatus;
  /** 관찰한 일수. 표본 기준도 이것이다 */
  sampleSize: number;
  /** 실제 시간가중수익률(TWR, 수수료 후) */
  actualReturn: Decimal | null;
  /** 첫 거래일 종가 기준 보유 구성을 그대로 들고 있었을 때 */
  holdReturn: Decimal | null;
  /** actual − hold */
  difference: Decimal | null;
  /** 차이 중 수수료 몫(음수) — 수수료가 없었다면의 TWR − 실제 TWR 의 부호 반대 */
  feeComponent: Decimal | null;
  /** 차이 중 나머지(매매 시점 · 종목 선택) */
  timingComponent: Decimal | null;
  from: Date | null;
  to: Date | null;
  missingCloses: string[];
}

/**
 * 하루 단위 TWR. 거래는 그날 일봉 종가 시점의 입출금으로 본다.
 *
 * - 실제: r_d = (V_d − F_d) ÷ V_{d−1} − 1. F_d = 매수(대금 + 수수료) − 매도(대금 − 수수료)
 * - 보유: 첫 거래일 종가의 종목 비중 w 로 Σ w · (P_T ÷ P_0) − 1. 이후 순입금은 **같은 날 같은 비중으로 샀다**고
 *   가정한다(2026-09-27 사용자 결정) — TWR 은 입출금에 영향받지 않으므로 이 가정에서 보유 수익률은 위 식 그대로다
 * - 수수료 몫: 수수료 0 으로 본 F_d 로 다시 잰 TWR 과의 차이
 * - 종가가 빠진 날은 직전 종가를 쓴다. 들고 있는 종목의 첫 종가가 아직 없으면 계산하지 않는다
 */
export const benchmarkMirror = (
  entries: CoachLedgerEntry[],
  barsBySymbol: Map<string, DailyBar[]>,
  now: Date
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
    missingCloses,
  });
  if (!entries.length) return empty();

  const closeIndex = new Map<string, Map<number, Decimal>>();
  for (const [symbol, bars] of barsBySymbol) {
    closeIndex.set(symbol, new Map(bars.map((bar) => [bar.openTime.getTime(), bar.close])));
  }

  const firstDay = Math.floor(entries[0].transactionDate.getTime() / DAY_MS) * DAY_MS;
  const lastDay = Math.floor(now.getTime() / DAY_MS) * DAY_MS - DAY_MS; // 닫힌 마지막 일봉

  const quantities = new Map<string, Decimal>();
  const lastClose = new Map<string, Decimal>();
  let cursor = 0;
  let prevValue = ZERO;
  let actual = new Decimal(1);
  let feeless = new Decimal(1);
  let days = 0;
  let start: { day: number; weights: Map<string, Decimal>; closes: Map<string, Decimal> } | null = null;

  for (let day = firstDay; day <= lastDay; day += DAY_MS) {
    const closeAt = day + DAY_MS;
    let flow = ZERO;
    let flowFeeless = ZERO;
    while (cursor < entries.length && entries[cursor].transactionDate.getTime() < closeAt) {
      const entry = entries[cursor++];
      const symbol = entry.symbol.toUpperCase();
      const quantity = new Decimal(entry.quantity);
      const current = quantities.get(symbol) ?? ZERO;
      const amount = new Decimal(entry.totalAmount);
      if (entry.side === "buy") {
        quantities.set(symbol, current.plus(quantity));
        flow = flow.plus(amount).plus(entry.fee);
        flowFeeless = flowFeeless.plus(amount);
      } else {
        quantities.set(symbol, Decimal.max(ZERO, current.minus(quantity)));
        flow = flow.minus(amount.minus(entry.fee));
        flowFeeless = flowFeeless.minus(amount);
      }
    }

    let value = ZERO;
    const missing: string[] = [];
    for (const [symbol, quantity] of quantities) {
      const close = closeIndex.get(symbol)?.get(day);
      if (close) lastClose.set(symbol, close);
      if (quantity.lte(0)) continue;
      // 산 날 일봉이 비었으면 그 전 마지막 종가
      const price =
        lastClose.get(symbol) ??
        barsBySymbol
          .get(symbol)
          ?.filter((bar) => bar.openTime.getTime() <= day)
          .at(-1)?.close;
      if (price) lastClose.set(symbol, price);
      if (!price) missing.push(symbol);
      else value = value.plus(quantity.times(price));
    }
    if (missing.length) return empty(missing.sort());

    if (prevValue.gt(0)) {
      actual = actual.times(value.minus(flow).div(prevValue));
      feeless = feeless.times(value.minus(flowFeeless).div(prevValue));
      days += 1;
    }
    if (!start && value.gt(0)) {
      const weights = new Map<string, Decimal>();
      const closes = new Map<string, Decimal>();
      for (const [symbol, quantity] of quantities) {
        if (quantity.lte(0)) continue;
        const price = lastClose.get(symbol)!;
        weights.set(symbol, quantity.times(price).div(value));
        closes.set(symbol, price);
      }
      start = { day, weights, closes };
    }
    prevValue = value;
  }

  if (!start) return empty();

  let hold = ZERO;
  for (const [symbol, weight] of start.weights) {
    hold = hold.plus(weight.times(lastClose.get(symbol)!.div(start.closes.get(symbol)!)));
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
    to: new Date(lastDay + DAY_MS),
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
