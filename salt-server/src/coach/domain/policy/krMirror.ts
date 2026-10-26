/**
 * 국내 주식 행동 미러 — F011 `SRV-REQ-040` FR-47(리서치 권고 22).
 *
 * 코인 미러(`mirror.ts`)와 같은 원칙이다 — 본인 기록의 통계, 지시 문구 없음, 표본 20 미만은 값과 함께 `insufficient_sample`.
 * 다른 것은 **창이 거래일**이라는 것 하나고, 순서는 국내 근거가 직접적인 순: 회전율 → 처분효과 → 추격 매수(40거래일) → 복권형 비중.
 *
 * ## 거래 시각은 KST 날짜로 붙인다
 *
 * 국내 일봉 `openTime` 은 그 거래일 00:00 UTC 로 맞춰져 있다(`forecastSymbol.dailyOpenTime`). 그런데 화면은 지난 날짜 거래를
 * **그날 00:00 KST**(= 전날 15:00 UTC)로 저장한다. UTC 날짜로 붙이면 하루 앞 거래일이 된다. 그래서 국내 미러는 거래 시각을
 * 9시간 미룬 "KST 벽시계"로 읽는다(`toKrTradingClock`) — 그 뒤 모든 날짜 계산이 KST 날짜와 같다.
 *
 * ## 기준점은 다른 기간 · 다른 정의다
 *
 * KCMI 숫자(2020-03~10, 개인 약 20만 명)는 같은 정의를 원문에서 확인하지 못한 참고값이다. 응답에 출처 · 기간과 함께 주고
 * 판정 문구를 만들지 않는다.
 */

import Decimal from "decimal.js";

import type { DailyBar } from "./adherence";
import { mirrorMetric, type MirrorMetric } from "./mirror";
import { DAY_MS, walkPortfolioDays } from "./portfolioSeries";
import type { LedgerReplay } from "./tradeLedger";
import type { CoachLedgerEntry } from "../model";
import type { KrReturnProfile } from "../ports";

const ZERO = new Decimal(0);
const KST_OFFSET_MS = 9 * 3_600_000;

/** 종가 ÷ 전일 종가가 이 밖이면 원천 끊김이다(상한가 반올림 1.3008 까지 진짜 — 예측 `kr_breaks` · 사이즈 갭과 같은 근거) */
export const KR_RETURN_BREAK_BOUNDS = { min: 0.69, max: 1.31 } as const;

/** 실제 시각 → KST 벽시계 — 이후 `Math.floor(t / DAY_MS)` 가 KST 날짜다 */
export const krWallClock = (at: Date): Date => new Date(at.getTime() + KST_OFFSET_MS);

/** 거래 시각을 KST 벽시계로 */
export const toKrTradingClock = (entries: CoachLedgerEntry[]): CoachLedgerEntry[] =>
  entries.map((entry) => ({ ...entry, transactionDate: krWallClock(entry.transactionDate) }));

/** KST 벽시계 시각의 거래일(그날 00:00 UTC ms) */
export const krDayOf = (at: Date): number => Math.floor(at.getTime() / DAY_MS) * DAY_MS;

/**
 * 일봉을 **실제 KST 하루**([00:00 KST, 다음 날 00:00 KST))로 옮긴다 — 거래 시각을 그대로 두는 경로(판정 배치)용.
 * 저장된 결과의 시각은 실제 시각이어야 해서 거래 대신 봉을 옮긴다. 00:00 KST 로 적은 매수가 그날 봉 안에 들고,
 * 전 거래일 종가는 산 뒤가 아니게 된다(옮기지 않으면 전날 종가 확정 시각이 그날 09:00 KST 로 잡힌다)
 */
export const toKrBarClock = (barsBySymbol: Map<string, DailyBar[]>): Map<string, DailyBar[]> =>
  new Map(
    [...barsBySymbol].map(([symbol, bars]) => [
      symbol,
      bars.map((bar) => ({ ...bar, openTime: new Date(bar.openTime.getTime() - KST_OFFSET_MS) })),
    ])
  );

/** 읽어 온 종목 일봉에 한 번이라도 나온 날 — 주말 · 휴장일이 빠진 거래일 */
export const krTradingDays = (barsBySymbol: Map<string, DailyBar[]>): Set<number> => {
  const days = new Set<number>();
  for (const bars of barsBySymbol.values()) for (const bar of bars) days.add(bar.openTime.getTime());
  return days;
};

const median = (values: Decimal[]): Decimal | null => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a.comparedTo(b));
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : sorted[mid - 1].plus(sorted[mid]).div(2);
};

const medianOf = (values: number[]): number | null => {
  const result = median(values.map((value) => new Decimal(value)));
  return result ? result.toNumber() : null;
};

// ─── ① 회전율(거래일) ──────────────────────────────────────────────────────────

/** 최근 이 거래일 수(≈ 1년) */
export const KR_TURNOVER_WINDOW_TRADING_DAYS = 250;

export interface KrTurnoverMirror {
  /**
   * 일 회전율 = 창 안 (매수 + 매도 대금) ÷ 2 ÷ 보유한 거래일 종가 평가금 합. 기준선(`TURNOVER_BASELINE`)과 같은 **일** 단위.
   * 표본 = 보유한 거래일 수
   */
  dailyTurnover: MirrorMetric;
  tradedNotionalKrw: Decimal;
  tradeCount: number;
  windowTradingDays: number;
  from: Date | null;
  to: Date | null;
  missingCloses: string[];
}

/**
 * `entries` 는 KST 벽시계(`toKrTradingClock`). 마지막 날 = 오늘(KST) — 오늘 봉이 아직 없으면 거래일 집합에 없어 걷지 않는다.
 * 1년보다 오래된 날의 종가 결측은 창 밖이라 건너뛴다.
 */
export const krTurnoverMirror = (
  entries: CoachLedgerEntry[],
  barsBySymbol: Map<string, DailyBar[]>,
  tradingDays: ReadonlySet<number>,
  now: Date
): KrTurnoverMirror => {
  const lastDay = krDayOf(krWallClock(now));
  const walk = walkPortfolioDays(entries, barsBySymbol, lastDay, lastDay - 400 * DAY_MS, tradingDays);
  const empty = (missingCloses: string[] = []): KrTurnoverMirror => ({
    dailyTurnover: mirrorMetric<Decimal>(null, 0),
    tradedNotionalKrw: ZERO,
    tradeCount: 0,
    windowTradingDays: KR_TURNOVER_WINDOW_TRADING_DAYS,
    from: null,
    to: null,
    missingCloses,
  });
  if (walk.status === "missing_close") return empty(walk.missingCloses);
  const window = walk.days.slice(-KR_TURNOVER_WINDOW_TRADING_DAYS);
  if (!window.length) return empty();

  // 창 첫날 앞 거래일 다음부터의 거래 — 주말에 적은 거래도 다음 거래일 몫이다
  const before = walk.days.at(-window.length - 1);
  const since = before ? before.day + DAY_MS : Number.NEGATIVE_INFINITY;
  const trades = entries.filter((entry) => entry.transactionDate.getTime() >= since);
  const notional = trades.reduce((sum, entry) => sum.plus(entry.totalAmount), ZERO);
  const held = window.filter((day) => day.value.gt(0));
  const valueSum = held.reduce((sum, day) => sum.plus(day.value), ZERO);

  return {
    dailyTurnover: mirrorMetric(valueSum.gt(0) ? notional.div(2).div(valueSum) : null, held.length),
    tradedNotionalKrw: notional,
    tradeCount: trades.length,
    windowTradingDays: KR_TURNOVER_WINDOW_TRADING_DAYS,
    from: new Date(window[0].day),
    to: new Date(window.at(-1)!.day + DAY_MS),
    missingCloses: [],
  };
};

// ─── ② 처분효과 — 보유 거래일 · 매수 다음 거래일 매도율 ─────────────────────────

/** 그 종목 봉 중 `(from, to]` 거래일 수 — 같은 날 사고팔면 0 */
const tradingDaysBetween = (bars: DailyBar[] | undefined, from: Date, to: Date): number => {
  const start = krDayOf(from);
  const end = krDayOf(to);
  return bars?.filter((bar) => bar.openTime.getTime() > start && bar.openTime.getTime() <= end).length ?? 0;
};

/**
 * 청산마다 순손익과 **보유 거래일**(조각 수량 가중) — 코인 미러가 배치 결과의 달력일을 쓰는 자리. 국내 결과 배치는 없다
 * (판정 배치는 코인만 — FR-38 "행동 분석은 코인 그대로"), 처분효과의 보유일은 되감기에서 바로 센다.
 */
export const krClosingHoldings = (
  replay: LedgerReplay,
  barsBySymbol: Map<string, DailyBar[]>
): Array<{ netPnlKrw: Decimal; holdingDays: Decimal }> =>
  replay.closings.map((closing) => {
    const bars = barsBySymbol.get(closing.sell.symbol);
    const quantity = closing.pieces.reduce((sum, piece) => sum.plus(piece.quantity), ZERO);
    const weighted = closing.pieces.reduce(
      (sum, piece) =>
        sum.plus(piece.quantity.times(tradingDaysBetween(bars, piece.boughtAt, closing.sell.transactionDate))),
      ZERO
    );
    return { netPnlKrw: closing.netPnlKrw, holdingDays: quantity.gt(0) ? weighted.div(quantity) : ZERO };
  });

/** KCMI(2021) — 매수 다음 날 이익 포지션 41% 매도 · 손실 포지션 22% 매도. 기간 · 기준(절대 · 시장 대비) 원문 미확인 */
export const NEXT_DAY_SELL_BASELINE = {
  source: "자본시장연구원(2021) 개인투자자 거래 분석 — 이코노미스트 2021-08-29 인용",
  url: "https://economist.co.kr/article/view/ecn202108290001",
  period: "2020-03~2020-10",
  market: "국내 주식",
  gainSellRate: new Decimal("0.41"),
  lossSellRate: new Decimal("0.22"),
} as const;

export interface NextDaySellMirror {
  /** 매수 다음 거래일에 이익이던 매수 중 그날 (일부라도) 판 비율. 표본 = 이익이던 매수 수 */
  gainSellRate: MirrorMetric;
  lossSellRate: MirrorMetric;
  counts: { gainPositions: number; gainSold: number; lossPositions: number; lossSold: number };
}

/**
 * 매수 한 건 = 포지션 하나. 매수 다음 거래일(그 종목 봉 기준)에:
 * - 그날 판 매도가 있으면 판 값, 없으면 그날 종가를 매수 단가(수수료 포함)와 비교해 이익 · 손실
 * - 같은 날 다 판 매수(당일 매매) · 다음 거래일 봉이 아직 없는 매수 · 본전은 세지 않는다
 */
export const nextDaySellMirror = (
  replay: LedgerReplay,
  barsBySymbol: Map<string, DailyBar[]>
): NextDaySellMirror => {
  const counts = { gainPositions: 0, gainSold: 0, lossPositions: 0, lossSold: 0 };
  for (const lot of replay.lots.values()) {
    const buyDay = krDayOf(lot.buy.transactionDate);
    if (lot.closedAt && krDayOf(lot.closedAt) === buyDay) continue;
    const next = barsBySymbol.get(lot.buy.symbol)?.find((bar) => bar.openTime.getTime() > buyDay);
    if (!next) continue;
    const nextDay = next.openTime.getTime();
    const soldNextDay = lot.consumedBy.find((sell) => krDayOf(sell.at) === nextDay);
    const unitCost = new Decimal(lot.buy.price).plus(new Decimal(lot.buy.fee).div(lot.buy.quantity));
    const mark = soldNextDay ? soldNextDay.price : next.close;
    if (mark.gt(unitCost)) {
      counts.gainPositions += 1;
      if (soldNextDay) counts.gainSold += 1;
    } else if (mark.lt(unitCost)) {
      counts.lossPositions += 1;
      if (soldNextDay) counts.lossSold += 1;
    }
  }
  const rate = (sold: number, positions: number) =>
    mirrorMetric(positions ? new Decimal(sold).div(positions) : null, positions);
  return {
    gainSellRate: rate(counts.gainSold, counts.gainPositions),
    lossSellRate: rate(counts.lossSold, counts.lossPositions),
    counts,
  };
};

// ─── ③ 추격 매수 — 매수 직전 40거래일 상승률 ───────────────────────────────────

/** KCMI 창(매수 전 40일)과 맞춘다 */
export const KR_CHASE_WINDOW_TRADING_DAYS = 40;

/** KCMI(2021) — 개인 매수 종목의 매수 전 40일 누적수익률 평균 25.8%(매수 후 40일 11.6%) */
export const CHASE_BASELINE = {
  source: "자본시장연구원(2021) 개인투자자 거래 분석 — 이코노미스트 2021-08-29 인용",
  url: "https://economist.co.kr/article/view/ecn202108290001",
  period: "2020-03~2020-10",
  market: "국내 주식",
  priorReturn: new Decimal("0.258"),
} as const;

export interface ChaseMirror {
  /** 매수 직전 40거래일 종가 상승률의 평균 · 중앙값. 표본 = 잰 매수 수 */
  avgPriorReturn: MirrorMetric;
  medianPriorReturn: MirrorMetric;
  counts: { measured: number; shortHistory: number; breaks: number };
  windowTradingDays: number;
}

/**
 * 매수일 **전** 거래일 종가 ÷ 그보다 40거래일 앞 종가 − 1(그 종목 봉 기준 — 정지일은 거래일이 아니다).
 * 봉이 41개 안 되면 `shortHistory`, 창 안에 원천 끊김(`KR_RETURN_BREAK_BOUNDS` 밖)이 있으면 `breaks` — 둘 다 표본이 아니다.
 */
export const chaseMirror = (
  buys: CoachLedgerEntry[],
  barsBySymbol: Map<string, DailyBar[]>
): ChaseMirror => {
  const counts = { measured: 0, shortHistory: 0, breaks: 0 };
  const returns: Decimal[] = [];
  for (const buy of buys) {
    const buyDay = krDayOf(buy.transactionDate);
    const prior = (barsBySymbol.get(buy.symbol) ?? []).filter((bar) => bar.openTime.getTime() < buyDay);
    if (prior.length < KR_CHASE_WINDOW_TRADING_DAYS + 1) {
      counts.shortHistory += 1;
      continue;
    }
    const window = prior.slice(-(KR_CHASE_WINDOW_TRADING_DAYS + 1));
    const broken = window.some((bar, i) => {
      if (i === 0) return false;
      const ratio = bar.close.div(window[i - 1].close).toNumber();
      return ratio < KR_RETURN_BREAK_BOUNDS.min || ratio > KR_RETURN_BREAK_BOUNDS.max;
    });
    if (broken) {
      counts.breaks += 1;
      continue;
    }
    counts.measured += 1;
    returns.push(window.at(-1)!.close.div(window[0].close).minus(1));
  }
  const avg = returns.length ? returns.reduce((sum, value) => sum.plus(value), ZERO).div(returns.length) : null;
  return {
    avgPriorReturn: mirrorMetric(avg, returns.length),
    medianPriorReturn: mirrorMetric(median(returns), returns.length),
    counts,
    windowTradingDays: KR_CHASE_WINDOW_TRADING_DAYS,
  };
};

// ─── ④ 복권형 비중 ─────────────────────────────────────────────────────────────

/**
 * 복권형 = Kumar(2009) 정의를 총변동으로 단순화: 지난달 말까지 6개월 일봉으로 **주가 < 중앙값 · 변동성 > 중앙값 ·
 * 왜도 > 중앙값**(국내 전 종목 단면). 원문은 고유변동성 · 고유왜도(요인 잔차)다 — 요인 모형이 없어 총변동을 쓴다.
 */
export const KR_LOTTERY_LOOKBACK_MONTHS = 6;
/** 6개월 약 120거래일 중 이만큼 수익률이 있어야 단면에 든다 */
export const KR_LOTTERY_MIN_RETURNS = 100;
/** 최근 이 날수 매수만 — 리스크 게이지 회전율과 같은 1년 */
export const KR_LOTTERY_BUY_WINDOW_DAYS = 365;

/** KCMI — 복권형 종목 매수 비중 가중 시장 대비 초과성과 −10.42%(2016~2023). 비중 기준점이 아니라 성과 근거다 */
export const LOTTERY_EVIDENCE = {
  source: "자본시장연구원 — 뉴데일리 2024-01-25 인용",
  url: "https://biz.newdaily.co.kr/site/data/html/2024/01/25/2024012500358.amp.html",
  period: "2016~2023",
  market: "국내 주식",
  excessReturn: new Decimal("-0.1042"),
} as const;

export interface LotteryWindow {
  key: string;
  /** 실제 시각(KST 00:00) — 조회 구간 `[from, to)` */
  from: Date;
  to: Date;
}

/** 매수(KST 벽시계)가 쓰는 단면 구간 — 매수 달 1일 00:00 KST 앞 6개월 */
export const lotteryWindowFor = (buyAt: Date): LotteryWindow => {
  const year = buyAt.getUTCFullYear();
  const month = buyAt.getUTCMonth();
  const to = new Date(Date.UTC(year, month, 1) - KST_OFFSET_MS);
  const from = new Date(Date.UTC(year, month - KR_LOTTERY_LOOKBACK_MONTHS, 1) - KST_OFFSET_MS);
  return { key: to.toISOString(), from, to };
};

export interface LotteryCutoffs {
  price: number;
  volatility: number;
  skewness: number;
  /** 단면 종목 중 복권형 비율(동일 가중) — 매수 비중과 나란히 놓는 기준 */
  marketShare: number;
  universe: number;
}

export const isLotteryStock = (profile: KrReturnProfile, cutoffs: LotteryCutoffs): boolean =>
  profile.volatility !== null &&
  profile.skewness !== null &&
  profile.lastClose < cutoffs.price &&
  profile.volatility > cutoffs.volatility &&
  profile.skewness > cutoffs.skewness;

export const lotteryCutoffs = (profiles: KrReturnProfile[]): LotteryCutoffs | null => {
  const price = medianOf(profiles.map((profile) => profile.lastClose));
  const volatility = medianOf(profiles.flatMap((profile) => (profile.volatility === null ? [] : [profile.volatility])));
  const skewness = medianOf(profiles.flatMap((profile) => (profile.skewness === null ? [] : [profile.skewness])));
  if (price === null || volatility === null || skewness === null) return null;
  const partial = { price, volatility, skewness, marketShare: 0, universe: profiles.length };
  const flagged = profiles.filter((profile) => isLotteryStock(profile, partial)).length;
  return { ...partial, marketShare: flagged / profiles.length };
};

export interface LotteryMirror {
  /** 최근 1년 매수 대금 중 복권형 종목 몫. 표본 = 판정한 매수 수 */
  buyShare: MirrorMetric;
  /** 같은 매수들의 단면에서 복권형 종목 비율(매수 대금 가중 평균) — 무작위로 골랐다면 이 근처 */
  marketShare: Decimal | null;
  counts: { lotteryBuys: number; judgedBuys: number; unknownBuys: number };
  lookbackMonths: number;
  buyWindowDays: number;
}

/**
 * `buys` 는 KST 벽시계 · 최근 1년. `sections` = 구간 키 → 그 단면. 단면에 없는 종목(이력 6개월 미만 · 마스터 밖)은
 * `unknownBuys` 이고 비중의 분모에 넣지 않는다.
 */
export const lotteryMirror = (
  buys: CoachLedgerEntry[],
  sections: Map<string, KrReturnProfile[]>
): LotteryMirror => {
  const cutoffsByKey = new Map<string, LotteryCutoffs | null>();
  const counts = { lotteryBuys: 0, judgedBuys: 0, unknownBuys: 0 };
  let judgedAmount = ZERO;
  let lotteryAmount = ZERO;
  let marketWeighted = ZERO;

  for (const buy of buys) {
    const { key } = lotteryWindowFor(buy.transactionDate);
    const profiles = sections.get(key) ?? [];
    if (!cutoffsByKey.has(key)) cutoffsByKey.set(key, lotteryCutoffs(profiles));
    const cutoffs = cutoffsByKey.get(key)!;
    const profile = profiles.find((candidate) => candidate.symbol === buy.symbol);
    if (!cutoffs || !profile) {
      counts.unknownBuys += 1;
      continue;
    }
    const amount = new Decimal(buy.totalAmount);
    counts.judgedBuys += 1;
    judgedAmount = judgedAmount.plus(amount);
    marketWeighted = marketWeighted.plus(amount.times(cutoffs.marketShare));
    if (isLotteryStock(profile, cutoffs)) {
      counts.lotteryBuys += 1;
      lotteryAmount = lotteryAmount.plus(amount);
    }
  }

  const known = judgedAmount.gt(0);
  return {
    buyShare: mirrorMetric(known ? lotteryAmount.div(judgedAmount) : null, counts.judgedBuys),
    marketShare: known ? marketWeighted.div(judgedAmount) : null,
    counts,
    lookbackMonths: KR_LOTTERY_LOOKBACK_MONTHS,
    buyWindowDays: KR_LOTTERY_BUY_WINDOW_DAYS,
  };
};
