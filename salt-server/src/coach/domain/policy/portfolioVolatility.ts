/**
 * 보유 합산 변동성 — 코인 + 국내 주식 (F011 `SRV-REQ-040` FR-46, 리서치 권고 20).
 *
 * 코인 · 국내 주식 상관을 잰 학술 근거가 없고(급락일 반대 · 고점 동조 보도가 둘 다 있다) 상관은 불안정하다. 그래서 한 값이
 * 아니라 **범위**로 준다: (a) 상관 1 가정 = 종목 변동성의 가중 합(보수적 상한), (b) 최근 창 실현 공분산 √(wᵀΣw).
 *
 * ## 달력을 하나로 맞춘다
 *
 * 국내 주식을 들고 있으면 **KRX 거래일 축**이다. 그날 코인 값은 KRX 종가(15:30 KST) 시점에 알 수 있던 마지막 코인 일봉
 * 종가 = 그날 09:00 KST 종가(전날 UTC 일봉)다 — 미래를 쓰지 않는 as-of 정렬이고, 주말 · 휴장일 코인 변동은 다음 거래일
 * 수익률에 쌓인다. 그래서 두 자산군 수익률이 같은 252일 축에 있고 연율화도 √252 하나다(365/252 환산이 여기서 끝난다).
 * 6.5시간 어긋남(09:00 vs 15:30)은 근사다 — 코인 시간봉을 보관하지 않는다.
 * 코인만 들고 있으면 달력일 축 · √365.
 *
 * 국내 종목 정지일은 직전 종가 그대로(수익률 0 — 결측이 아니다). 종가 비율이 0.69~1.31 밖인 날은 원천 끊김이라 그날을 통째로 뺀다.
 */

import Decimal from "decimal.js";

import type { DailyBar } from "./adherence";
import { KR_RETURN_BREAK_BOUNDS } from "./krMirror";
import { DAY_MS } from "./portfolioSeries";

/** 최근 이만큼의 축 날짜(≈ 1년) */
export const PORTFOLIO_VOL_WINDOW = 250;
/** 수익률이 이만큼 있어야 값을 낸다 */
export const PORTFOLIO_VOL_MIN_RETURNS = 60;

export type VolatilityGrid = "krx_trading_day" | "calendar_day";

export interface VolatilityHolding {
  symbol: string;
  assetType: "crypto" | "kr_stock";
  value: Decimal;
}

export interface PortfolioVolatility {
  status: "ok" | "insufficient_data";
  /** 연율. 상관 1 가정(종목 변동성 가중 합) */
  upper: Decimal | null;
  /** 연율. 최근 창 실현 공분산 */
  realized: Decimal | null;
  /** 코인 몫과 국내 주식 몫 수익률의 상관(둘 다 들고 있을 때만) */
  crossCorrelation: Decimal | null;
  grid: VolatilityGrid;
  periodsPerYear: number;
  returns: number;
  from: Date | null;
  to: Date | null;
  /** 값을 낸 보유의 평가금 몫(이력이 모자란 종목은 빠진다) */
  coveredWeight: Decimal | null;
  missingSymbols: string[];
}

const empty = (grid: VolatilityGrid, missingSymbols: string[] = []): PortfolioVolatility => ({
  status: "insufficient_data",
  upper: null,
  realized: null,
  crossCorrelation: null,
  grid,
  periodsPerYear: grid === "krx_trading_day" ? 252 : 365,
  returns: 0,
  from: null,
  to: null,
  coveredWeight: null,
  missingSymbols,
});

/** 축 날짜마다 종가(이전 값 이어 쓰기). 그 종목 첫 봉 전 날은 `null` */
const pricesOnGrid = (bars: DailyBar[], grid: number[], lagDays: number): Array<number | null> => {
  const byDay = new Map(bars.map((bar) => [bar.openTime.getTime(), bar.close.toNumber()]));
  const first = bars.length ? bars[0].openTime.getTime() : Number.POSITIVE_INFINITY;
  let last: number | null = null;
  return grid.map((day) => {
    const key = day - lagDays * DAY_MS;
    const close = byDay.get(key);
    if (close !== undefined) last = close;
    else if (key < first) return null;
    else if (last === null) {
      // 축 첫날이 휴장이었으면 그 앞 마지막 봉
      const before = bars.filter((bar) => bar.openTime.getTime() <= key).at(-1);
      last = before ? before.close.toNumber() : null;
    }
    return last;
  });
};

const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;

const covariance = (a: number[], b: number[]): number => {
  const ma = mean(a);
  const mb = mean(b);
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] - ma) * (b[i] - mb);
  return sum / (a.length - 1);
};

/**
 * `barsBySymbol` 의 `openTime` 은 코인 · 국내 모두 "그날 00:00 UTC"(코인은 09:00 KST 시작 봉, 국내는 KST 거래일 —
 * `forecastSymbol.dailyOpenTime`). `now` 이후 봉은 쓰지 않는다.
 */
export const portfolioVolatility = (
  holdings: VolatilityHolding[],
  barsBySymbol: Map<string, DailyBar[]>,
  now: Date
): PortfolioVolatility => {
  const held = holdings.filter((holding) => holding.value.gt(0));
  const hasKr = held.some((holding) => holding.assetType === "kr_stock");
  const grid: VolatilityGrid = hasKr ? "krx_trading_day" : "calendar_day";
  if (!held.length) return empty(grid);

  // 축: 국내가 있으면 국내 종목 봉 날짜의 합집합(거래일), 아니면 코인 봉 날짜
  const today = Math.floor(now.getTime() / DAY_MS) * DAY_MS;
  const axisDays = new Set<number>();
  for (const holding of held) {
    if (hasKr && holding.assetType !== "kr_stock") continue;
    for (const bar of barsBySymbol.get(holding.symbol) ?? []) {
      const day = bar.openTime.getTime();
      if (day <= today) axisDays.add(day);
    }
  }
  const axis = [...axisDays].sort((a, b) => a - b).slice(-(PORTFOLIO_VOL_WINDOW + 1));
  if (axis.length < 2) return empty(grid);

  // 코인은 KRX 축에서 하루 앞 UTC 봉(= 그날 09:00 KST 종가)
  const series = held.map((holding) => ({
    holding,
    prices: pricesOnGrid(
      barsBySymbol.get(holding.symbol) ?? [],
      axis,
      hasKr && holding.assetType === "crypto" ? 1 : 0
    ),
  }));
  const covered = series.filter((entry) => entry.prices.every((price) => price !== null && price > 0));
  const missingSymbols = series
    .filter((entry) => !covered.includes(entry))
    .map((entry) => entry.holding.symbol)
    .sort();
  if (!covered.length) return empty(grid, missingSymbols);

  // 수익률 행렬 — 끊긴 날(국내 종가 비율 경계 밖)은 그 행을 통째로 뺀다
  const rows: number[][] = [];
  for (let t = 1; t < axis.length; t++) {
    let broken = false;
    const row = covered.map(({ holding, prices }) => {
      const ratio = prices[t]! / prices[t - 1]!;
      if (holding.assetType === "kr_stock" && (ratio < KR_RETURN_BREAK_BOUNDS.min || ratio > KR_RETURN_BREAK_BOUNDS.max)) {
        broken = true;
      }
      return Math.log(ratio);
    });
    if (!broken) rows.push(row);
  }
  if (rows.length < PORTFOLIO_VOL_MIN_RETURNS) return { ...empty(grid, missingSymbols), returns: rows.length };

  const totalValue = held.reduce((sum, holding) => sum.plus(holding.value), new Decimal(0));
  const coveredValue = covered.reduce((sum, entry) => sum.plus(entry.holding.value), new Decimal(0));
  const weights = covered.map((entry) => entry.holding.value.div(coveredValue).toNumber());
  const columns = covered.map((_, i) => rows.map((row) => row[i]));
  const periodsPerYear = grid === "krx_trading_day" ? 252 : 365;
  const annualize = Math.sqrt(periodsPerYear);

  let variance = 0;
  let upper = 0;
  for (let i = 0; i < covered.length; i++) {
    upper += weights[i] * Math.sqrt(covariance(columns[i], columns[i]));
    for (let j = 0; j < covered.length; j++) variance += weights[i] * weights[j] * covariance(columns[i], columns[j]);
  }

  // 자산군 몫 수익률(그 몫 안 가중 평균)의 상관
  const part = (assetType: VolatilityHolding["assetType"]): number[] | null => {
    const idx = covered.map((entry, i) => (entry.holding.assetType === assetType ? i : -1)).filter((i) => i >= 0);
    if (!idx.length) return null;
    const share = idx.reduce((sum, i) => sum + weights[i], 0);
    return rows.map((row) => idx.reduce((sum, i) => sum + (weights[i] / share) * row[i], 0));
  };
  const coin = part("crypto");
  const kr = part("kr_stock");
  const cross =
    coin && kr ? covariance(coin, kr) / Math.sqrt(covariance(coin, coin) * covariance(kr, kr)) : null;

  return {
    status: "ok",
    upper: new Decimal(upper * annualize),
    realized: new Decimal(Math.sqrt(Math.max(variance, 0)) * annualize),
    crossCorrelation: cross === null || !Number.isFinite(cross) ? null : new Decimal(cross),
    grid,
    periodsPerYear,
    returns: rows.length,
    from: new Date(axis[0]),
    to: new Date(axis[axis.length - 1] + DAY_MS),
    coveredWeight: totalValue.gt(0) ? coveredValue.div(totalValue) : null,
    missingSymbols,
  };
};
