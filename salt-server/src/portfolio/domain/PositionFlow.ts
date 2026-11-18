import Decimal from "decimal.js";

import type { PortfolioAssetType } from "./ports";

/**
 * 평가금 흐름 · 시간가중 수익률 · 최대 낙폭(F006 G절 FR-71 · `SRV-REQ-028` FR-81).
 *
 * ## `PerformanceSeries` 와 무엇이 다른가
 *
 * 저것은 **지금 수량 × 과거 가격**이다(원문 그대로 — 그 파일 머리 주석). 이 흐름은 **그날 실제로 들고 있던 수량**을
 * 거래 기록에서 복원해 그날 종가로 평가한다. "과거 사실이고 예측이 아니다"(FR-71)가 성립하는 쪽이 이것이다.
 *
 * ## 수익률과 낙폭은 매수 · 매도 금액을 뺀다
 *
 * 평가금 자체로 낙폭을 재면 **판 날이 낙폭**이 되고 산 날이 상승이 된다. 그래서 하루 수익률은 **전날 들고 있던 수량**으로만
 * 잰다 — r = Σ q(전날) × (p(오늘) − p(전날)) / Σ q(전날) × p(전날). 이것을 이어 붙인 지수(시간가중)가 30일 수익률 · MDD 의 입력이다.
 * 차트에 그리는 값은 평가금(실제 금액)이고, 숫자(수익률 · MDD)는 지수다 — 둘의 뜻이 다르다는 것을 화면 문구가 말한다.
 *
 * ## 날짜 키는 KST 날짜
 *
 * 일봉 시각은 UTC 로 저장된다(코인 00:00 UTC = 09:00 KST 시작 · 국내 15:00 UTC = 다음날 00:00 KST). 거래일도 KST 날짜로 자른다.
 * 종가가 없는 날(국내 주말 · 휴장)은 **앞날 종가를 이어 쓴다** — 코인과 섞인 보유에서 국내 칸이 주말마다 0 이 되지 않게.
 */

export interface TimelineTrade {
  symbol: string;
  assetType: PortfolioAssetType;
  transactionType: "buy" | "sell";
  quantity: number;
  transactionDate: Date;
}

export interface DailyClose {
  symbol: string;
  assetType: PortfolioAssetType;
  close: number;
  timestamp: Date;
}

export interface FlowPoint {
  /** KST 날짜 `YYYY-MM-DD` */
  date: string;
  valueKrw: number;
  /** 시간가중 지수(첫 점 = 1) */
  index: number;
}

export interface Drawdown {
  /** 음수 또는 0 — 최고점 대비 가장 깊이 내려간 비율(%) */
  pct: number;
  peakDate: string;
  troughDate: string;
}

export interface PositionFlow {
  points: FlowPoint[];
  /** 그날 들고 있었는데 종가가 아직 없던 종목 — 그 칸은 평가금에서 빠진다(조용히 작아지지 않게 드러낸다) */
  missingSymbols: string[];
}

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export const kstDate = (at: Date): string => new Date(at.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);

const keyOf = (symbol: string, assetType: PortfolioAssetType) => `${assetType}:${symbol}`;

/** `from` ~ `to`(포함) KST 날짜 목록 */
const daysBetween = (from: string, to: string): string[] => {
  const days: string[] = [];
  for (let t = Date.parse(`${from}T00:00:00Z`); t <= Date.parse(`${to}T00:00:00Z`); t += DAY_MS) {
    days.push(new Date(t).toISOString().slice(0, 10));
  }
  return days;
};

/**
 * 거래(아무 순서)와 일봉 종가로 `from` ~ `to` 의 하루 점을 만든다. 보유가 0 인 날은 점을 만들지 않는다.
 * 종가 입력은 `from` 보다 앞선 것도 받는다 — 구간 첫날의 앞날 종가가 이어 쓰기 · 첫 수익률에 필요하다.
 */
export const buildPositionFlow = (
  trades: TimelineTrade[],
  closes: DailyClose[],
  from: string,
  to: string,
): PositionFlow => {
  const sortedTrades = [...trades].sort((a, b) => a.transactionDate.getTime() - b.transactionDate.getTime());
  const closeByDay = new Map<string, Map<string, Decimal>>();
  for (const close of closes) {
    const day = kstDate(close.timestamp);
    const bucket = closeByDay.get(day) ?? new Map<string, Decimal>();
    bucket.set(keyOf(close.symbol, close.assetType), new Decimal(close.close));
    closeByDay.set(day, bucket);
  }

  const quantity = new Map<string, Decimal>();
  const lastClose = new Map<string, Decimal>();
  let tradeCursor = 0;
  const firstDay = [...closeByDay.keys(), ...sortedTrades.map((t) => kstDate(t.transactionDate))].sort()[0];
  const points: FlowPoint[] = [];
  const missing = new Set<string>();
  let index = new Decimal(1);
  let previousHeld: Map<string, Decimal> | null = null;
  let previousClose: Map<string, Decimal> | null = null;

  if (!firstDay) return { points, missingSymbols: [] };

  for (const day of daysBetween(firstDay < from ? firstDay : from, to)) {
    for (const [key, close] of closeByDay.get(day) ?? []) lastClose.set(key, close);
    while (tradeCursor < sortedTrades.length && kstDate(sortedTrades[tradeCursor].transactionDate) <= day) {
      const trade = sortedTrades[tradeCursor++];
      const key = keyOf(trade.symbol, trade.assetType);
      const signed = new Decimal(trade.quantity).times(trade.transactionType === "sell" ? -1 : 1);
      quantity.set(key, (quantity.get(key) ?? new Decimal(0)).plus(signed));
    }

    // 하루 수익률 — 전날 들고 있던 수량만, 두 날 다 종가가 있는 종목만
    if (previousHeld && previousClose) {
      let base = new Decimal(0);
      let gain = new Decimal(0);
      for (const [key, held] of previousHeld) {
        const before = previousClose.get(key);
        const now = lastClose.get(key);
        if (!before || !now) continue;
        base = base.plus(held.times(before));
        gain = gain.plus(held.times(now.minus(before)));
      }
      if (!base.isZero()) index = index.times(new Decimal(1).plus(gain.div(base)));
    }

    const held = new Map([...quantity].filter(([, q]) => q.greaterThan(0)));
    let value = new Decimal(0);
    for (const [key, q] of held) {
      const close = lastClose.get(key);
      if (!close) {
        if (day >= from) missing.add(key.slice(key.indexOf(":") + 1));
        continue;
      }
      value = value.plus(q.times(close));
    }

    if (day >= from && held.size > 0) {
      points.push({ date: day, valueKrw: value.toDecimalPlaces(0).toNumber(), index: index.toNumber() });
    }
    previousHeld = held;
    previousClose = new Map(lastClose);
  }

  // 지수는 구간 첫 점 = 1 로 다시 맞춘다 — 구간 앞의 움직임이 구간 숫자에 섞이지 않게
  const base = points[0]?.index;
  return {
    points: base ? points.map((p) => ({ ...p, index: p.index / base })) : points,
    missingSymbols: [...missing].sort(),
  };
};

/** 지수의 최대 낙폭. 점이 2개 미만이면 `null` — 0 으로 그리지 않는다 */
export const maxDrawdown = (points: Array<{ date: string; index: number }>): Drawdown | null => {
  if (points.length < 2) return null;
  let peak = points[0];
  let worst: Drawdown = { pct: 0, peakDate: peak.date, troughDate: peak.date };
  for (const point of points) {
    if (point.index > peak.index) peak = point;
    const pct = (point.index / peak.index - 1) * 100;
    if (pct < worst.pct) worst = { pct, peakDate: peak.date, troughDate: point.date };
  }
  return worst;
};

/** 지수의 구간 수익률(%) — 첫 점 대비 마지막 점. 점이 2개 미만이면 `null` */
export const periodReturn = (points: Array<{ index: number }>): number | null =>
  points.length < 2 ? null : (points[points.length - 1].index / points[0].index - 1) * 100;

/**
 * 하루 수익률의 표준편차를 연율로(%) — 달력일 365 를 쓴다(코인은 매일, 국내는 휴장일에 앞날 종가를 이어 써 수익률 0).
 * 하루 수익률이 `minDays` 개 미만이면 `null`
 */
export const annualizedVolatility = (points: Array<{ index: number }>, minDays: number): number | null => {
  const returns: number[] = [];
  for (let i = 1; i < points.length; i += 1) returns.push(points[i].index / points[i - 1].index - 1);
  if (returns.length < minDays || returns.length < 2) return null;
  const mean = returns.reduce((acc, r) => acc + r, 0) / returns.length;
  const variance = returns.reduce((acc, r) => acc + (r - mean) ** 2, 0) / (returns.length - 1);
  return Math.sqrt(variance) * Math.sqrt(365) * 100;
};
