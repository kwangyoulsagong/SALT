/**
 * 월간 복기 — FEATURE-009 FR-28 (`SRV-REQ-038` FR-10).
 *
 * 한 달(KST)의 미러 요약 + IPS 이탈 일수 + Brier + "이번 달 한 가지". **수치는 서버, 문장은 템플릿**이다.
 * LLM 을 부르지 않는다 — 개인 금액이 들어가는 복기라 다듬을 문장이 없다(FR-28 · FR-31).
 *
 * ## 월초에 한 번 만들고 고치지 않는다
 *
 * 저장은 유스케이스 몫(`BuildMonthlyReview`)이고 여기는 계산만 한다. 저장한 복기는 뒤에 태그를 고쳐도
 * 바뀌지 않는다 — 그달에 본 것을 그대로 남긴다(W06 "이전 판단을 다시 쓰지 않는다"). 지금 기준의 숫자는 미러에 있다.
 *
 * ## IPS 이탈은 지금 기준으로 센다
 *
 * 예산 · 상한 설정의 이력을 저장하지 않는다. 그래서 "그달에 **지금 기준**을 넘은 날"이다(`basis: current_settings`).
 * 비율 예산은 월초 평가금 대비다(게이지는 지금 평가금 대비 — 한 달이 끝난 뒤엔 월초가 기준이 맞다).
 *
 * ## 국내 주식판(F011 `SRV-REQ-040` FR-48)
 *
 * 자산군마다 한 벌이다. 국내판은 `kr` 를 주고, **모든 시각이 KST 벽시계로 옮겨져 들어온다**(국내 미러와 같은 축 —
 * 일봉 `openTime` 이 KST 날짜 00:00 UTC 다). 날은 거래일만 걷고(주말 · 휴장일은 IPS 이탈 날이 아니다),
 * 휴장일 매도의 장부 손익은 직전 거래일 종가, 보유 기간은 거래일이다. 저장하는 시각(`from` · `to` · 빗나간 예측)은
 * 실제 시각으로 되돌린다 — 화면이 코인판과 같은 규칙으로 읽는다.
 */

import Decimal from "decimal.js";

import type { DailyBar } from "./adherence";
import { krClosingHoldings } from "./krMirror";
import { brierSummary, type BrierPlan, type BrierSummary } from "./brier";
import type { DecisionOutcome } from "./decisionOutcome";
import {
  adherenceMirror,
  benchmarkMirror,
  dispositionMirror,
  tagCosts,
  type AdherenceMirror,
  type BenchmarkMirror,
  type DispositionMirror,
  type MirrorWindow,
  type TagCost,
} from "./mirror";
import { DAY_MS, walkPortfolioDays } from "./portfolioSeries";
import type { LedgerReplay } from "./tradeLedger";
import type { TradePlan } from "./tradePlan";
import type { BudgetSetting, CoachLedgerEntry } from "../model";

const ZERO = new Decimal(0);
const MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

// ─── 달 ──────────────────────────────────────────────────────────────────────

export const isReviewMonth = (month: string): boolean => MONTH_PATTERN.test(month);

/** KST 그달 1일 0시 ~ 다음 달 1일 0시(UTC 시각) */
export const reviewMonthWindow = (month: string): MirrorWindow => {
  const match = MONTH_PATTERN.exec(month);
  if (!match) throw new RangeError(`month must be YYYY-MM: ${month}`);
  const year = Number(match[1]);
  const index = Number(match[2]) - 1;
  return {
    from: new Date(Date.UTC(year, index, 1) - KST_OFFSET_MS),
    to: new Date(Date.UTC(year, index + 1, 1) - KST_OFFSET_MS),
  };
};

/** 같은 달을 KST 벽시계 축으로 — 국내판 계산 창(그달 1일 00:00 UTC ~ 다음 달 1일 00:00 UTC) */
const reviewMonthWallWindow = (month: string): MirrorWindow => {
  const window = reviewMonthWindow(month);
  return {
    from: new Date(window.from.getTime() + KST_OFFSET_MS),
    to: new Date(window.to.getTime() + KST_OFFSET_MS),
  };
};

/** KST 기준 지난달 — 복기가 만들어지는 달 */
export const previousReviewMonth = (now: Date): string => {
  const kst = new Date(now.getTime() + KST_OFFSET_MS);
  const previous = new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth() - 1, 1));
  return `${previous.getUTCFullYear()}-${String(previous.getUTCMonth() + 1).padStart(2, "0")}`;
};

/** 그달이 끝났나(KST). 끝나지 않은 달은 만들지 않는다 — 반쯤 찬 복기가 저장되면 고칠 수 없다 */
export const isReviewMonthClosed = (month: string, now: Date): boolean => reviewMonthWindow(month).to <= now;

// ─── IPS 이탈 ────────────────────────────────────────────────────────────────

export interface IpsDeviation {
  /** 판단 기준 — 설정 이력이 없어 지금 설정으로 센다 */
  basis: "current_settings";
  observedDays: number;
  lossBudget: {
    status: "ok" | "budget_not_set" | "insufficient_data";
    /** 그달 누적 시가 평가 손실이 월 예산을 넘은 날 */
    days: number | null;
    budget: Decimal | null;
  };
  concentration: {
    status: "ok" | "insufficient_data";
    /** 가장 큰 종목 비중이 한 종목 상한을 넘은 날 */
    days: number | null;
    limit: Decimal;
  };
  /** 둘 중 하나라도 넘은 날. 둘 다 못 쟀으면 `null` */
  days: number | null;
  missingCloses: string[];
}

export const ipsDeviation = (input: {
  entries: CoachLedgerEntry[];
  barsBySymbol: Map<string, DailyBar[]>;
  window: MirrorWindow;
  now: Date;
  monthlyLossBudget: BudgetSetting | null;
  maxSingleAssetWeight: Decimal;
  /** 국내 주식(벽시계 축) — 이 날만 센다 */
  tradingDays?: ReadonlySet<number>;
}): IpsDeviation => {
  const from = input.window.from.getTime();
  const closedLastDay = Math.floor(input.now.getTime() / DAY_MS) * DAY_MS - DAY_MS;
  const lastDay = Math.min(closedLastDay, input.window.to.getTime() - DAY_MS);
  const unavailable = (missingCloses: string[] = []): IpsDeviation => ({
    basis: "current_settings",
    observedDays: 0,
    lossBudget: {
      status: input.monthlyLossBudget ? "insufficient_data" : "budget_not_set",
      days: null,
      budget: null,
    },
    concentration: { status: "insufficient_data", days: null, limit: input.maxSingleAssetWeight },
    days: null,
    missingCloses,
  });

  const walk = walkPortfolioDays(input.entries, input.barsBySymbol, lastDay, from - DAY_MS, input.tradingDays);
  if (walk.status === "missing_close") return unavailable(walk.missingCloses);

  const before = walk.days.filter((day) => day.day < from).at(-1);
  const inMonth = walk.days.filter((day) => day.day >= from);
  if (!inMonth.length) return unavailable();

  const startValue = before?.value ?? ZERO;
  const setting = input.monthlyLossBudget;
  const budget =
    setting === null
      ? null
      : setting.unit === "krw"
        ? setting.amount
        : startValue.gt(0)
          ? startValue.times(setting.amount)
          : null;

  let cumulativeFlow = ZERO;
  let lossDays = 0;
  let concentrationDays = 0;
  let eitherDays = 0;
  for (const day of inMonth) {
    cumulativeFlow = cumulativeFlow.plus(day.flow);
    const pnl = day.value.minus(startValue).minus(cumulativeFlow);
    const lossExceeded = budget !== null && pnl.negated().gt(budget);

    let top = ZERO;
    for (const holding of day.holdings.values()) {
      const value = holding.quantity.times(holding.price);
      if (value.gt(top)) top = value;
    }
    const concentrationExceeded = day.value.gt(0) && top.div(day.value).gt(input.maxSingleAssetWeight);

    if (lossExceeded) lossDays += 1;
    if (concentrationExceeded) concentrationDays += 1;
    if (lossExceeded || concentrationExceeded) eitherDays += 1;
  }

  return {
    basis: "current_settings",
    observedDays: inMonth.length,
    lossBudget: {
      status: setting === null ? "budget_not_set" : budget === null ? "insufficient_data" : "ok",
      days: budget === null ? null : lossDays,
      budget,
    },
    concentration: { status: "ok", days: concentrationDays, limit: input.maxSingleAssetWeight },
    days: eitherDays,
    missingCloses: [],
  };
};

// ─── 복기 ────────────────────────────────────────────────────────────────────

/** 서버 문장에 쓰는 태그 이름 — 화면의 `mirrorMessages.tagNames` 와 같은 말이다 */
export const MISTAKE_TAG_NAMES: Readonly<Record<string, string>> = {
  chasing: "급등 추격",
  averaging_down: "물타기",
  revenge: "손실 뒤 재진입",
  off_plan: "계획 없음",
  late_night: "심야 거래",
};

export interface MonthlyTurnover {
  status: "ok" | "insufficient_data";
  /** 그달 (매수 + 매도 대금) ÷ 2 ÷ 월말 평가금. 연환산하지 않는다 */
  value: Decimal | null;
  tradedNotional: Decimal;
  fees: Decimal;
}

export interface MonthlyReview {
  month: string;
  from: Date;
  to: Date;
  activity: { tradeCount: number; buyCount: number; sellCount: number; closedCount: number };
  adherence: AdherenceMirror;
  disposition: DispositionMirror;
  benchmark: BenchmarkMirror;
  turnover: MonthlyTurnover;
  tagCosts: TagCost[];
  /** 그달 손익 합이 가장 작은(음수) 태그. 없으면 `null` */
  topMistake: TagCost | null;
  ipsDeviation: IpsDeviation;
  /** 만기가 그달에 든 "오를 확률" 채점 */
  brier: BrierSummary;
  /** "이번 달 한 가지" — 템플릿 문장. 금액을 넣지 않는다(금액은 `topMistake` 숫자로) */
  oneThing: string;
}

export interface MonthlyReviewInput {
  month: string;
  /** 거래 전 기간(시간순, 대문자 종목) */
  entries: CoachLedgerEntry[];
  replay: LedgerReplay;
  barsBySymbol: Map<string, DailyBar[]>;
  /** 거래에 연결된 live 계획 */
  linkedPlans: TradePlan[];
  /** live 결정 결과 전부 */
  outcomes: DecisionOutcome[];
  /** "오를 확률"을 적은 계획 */
  forecastPlans: BrierPlan[];
  monthlyLossBudget: BudgetSetting | null;
  maxSingleAssetWeight: Decimal;
  now: Date;
  /**
   * 국내 주식판 — 있으면 `entries` · `replay` · 결과 `closedAt` · 계획 시각 · `now` 가 전부 KST 벽시계이고
   * `barsBySymbol` 은 옮기지 않은 일봉이다. `tradingDays` 는 그 일봉에 나온 날(`krTradingDays`)
   */
  kr?: { tradingDays: ReadonlySet<number> };
}

const inWindow = (at: Date, window: MirrorWindow) => at >= window.from && at < window.to;

export const oneThingSentence = (month: string, top: TagCost | null, closedCount: number): string => {
  const label = `${Number(month.slice(5))}월`;
  if (closedCount === 0) return `${label}에는 청산한 거래가 없어요.`;
  if (!top) return `${label}에는 손실로 끝난 태그가 없어요.`;
  const name = MISTAKE_TAG_NAMES[top.tag] ?? top.tag;
  return `${label}에 손익을 가장 많이 깎은 태그는 '${name}'(${top.count}건)이에요.`;
};

/** 벽시계로 센 빗나간 예측의 시각을 실제 시각으로 */
const brierToRealClock = (brier: BrierSummary): BrierSummary => ({
  ...brier,
  recentMisses: brier.recentMisses.map((miss) => ({
    ...miss,
    plannedAt: new Date(miss.plannedAt.getTime() - KST_OFFSET_MS),
    dueAt: new Date(miss.dueAt.getTime() - KST_OFFSET_MS),
  })),
});

export const buildMonthlyReview = (input: MonthlyReviewInput): MonthlyReview => {
  const realWindow = reviewMonthWindow(input.month);
  const window = input.kr ? reviewMonthWallWindow(input.month) : realWindow;
  const tradingDays = input.kr?.tradingDays;
  const monthEntries = input.entries.filter((entry) => inWindow(entry.transactionDate, window));
  const monthOutcomes = input.outcomes.filter((outcome) => inWindow(outcome.closedAt, window));

  // 그달에 체결된 거래에 연결된 계획만 — 판정은 배치가 이미 붙였다
  const monthTransactionIds = new Set(monthEntries.map((entry) => entry.id));
  const monthPlans = input.linkedPlans.filter(
    (plan) => plan.transactionId !== null && monthTransactionIds.has(plan.transactionId)
  );

  const monthReplay: LedgerReplay = {
    ...input.replay,
    sellMoments: input.replay.sellMoments.filter((moment) => inWindow(moment.at, window)),
  };

  const benchmark = benchmarkMirror(input.entries, input.barsBySymbol, input.now, window, tradingDays);
  const tradedNotional = monthEntries.reduce((sum, entry) => sum.plus(entry.totalAmount), ZERO);
  const fees = monthEntries.reduce((sum, entry) => sum.plus(entry.fee), ZERO);
  const endValue = benchmark.endValue;
  const turnover: MonthlyTurnover =
    endValue && endValue.gt(0)
      ? { status: "ok", value: tradedNotional.div(2).div(endValue), tradedNotional, fees }
      : { status: "insufficient_data", value: null, tradedNotional, fees };

  const costs = tagCosts(monthOutcomes);
  const topMistake = costs.find((cost) => cost.netPnlKrw.isNegative()) ?? null;

  // 국내는 보유 기간을 거래일로 센다(국내 미러와 같은 규칙) — 그달에 판 청산만
  const holdingSample = input.kr
    ? krClosingHoldings(
        {
          ...input.replay,
          closings: input.replay.closings.filter((closing) => inWindow(closing.sell.transactionDate, window)),
        },
        input.barsBySymbol
      )
    : monthOutcomes;
  const brier = brierSummary(input.forecastPlans, input.barsBySymbol, input.now, window);

  return {
    month: input.month,
    from: realWindow.from,
    to: realWindow.to,
    activity: {
      tradeCount: monthEntries.length,
      buyCount: monthEntries.filter((entry) => entry.side === "buy").length,
      sellCount: monthEntries.filter((entry) => entry.side === "sell").length,
      closedCount: monthOutcomes.length,
    },
    adherence: adherenceMirror(monthPlans, monthOutcomes),
    disposition: dispositionMirror(monthReplay, input.barsBySymbol, holdingSample, { carryForward: Boolean(input.kr) }),
    benchmark,
    turnover,
    tagCosts: costs,
    topMistake,
    ipsDeviation: ipsDeviation({
      entries: input.entries,
      barsBySymbol: input.barsBySymbol,
      window,
      now: input.now,
      monthlyLossBudget: input.monthlyLossBudget,
      maxSingleAssetWeight: input.maxSingleAssetWeight,
      tradingDays,
    }),
    brier: input.kr ? brierToRealClock(brier) : brier,
    oneThing: oneThingSentence(input.month, topMistake, monthOutcomes.length),
  };
};
