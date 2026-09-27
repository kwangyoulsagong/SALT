/**
 * 시나리오 — FEATURE-009 FR-25 (`SRV-REQ-038` FR-10).
 *
 * "지금 보유가 −10 · −30 · −50% 면 원화로 얼마" 와 과거 최악 구간을 지금 보유에 다시 얹은 손실.
 * **확률을 붙이지 않는다**(W03) — 얼마나 자주 일어나는지가 아니라 일어나면 얼마인지만 말한다.
 *
 * ## 과거 구간은 종목마다 그 구간 수익률
 *
 * 지금 보유 종목 각각의 구간 시작 · 끝 일봉 종가로 수익률을 잰다. 그 구간에 상장 전이었던 종목은 값이 없고,
 * 하나라도 없으면 합을 만들지 않는다 — 빠진 종목을 0% 로 치면 손실이 조용히 작아진다.
 */

import Decimal from "decimal.js";

import { Money } from "../../../shared/domain";
import type { DailyBar } from "./adherence";

/** 일괄 하락 폭. 순서가 화면 순서다 */
export const SCENARIO_SHOCKS = [new Decimal("-0.1"), new Decimal("-0.3"), new Decimal("-0.5")] as const;

export interface HistoricalEpisode {
  id: string;
  /** 시작 · 끝 일봉(KST 날짜, 업비트 일봉 09:00 경계) — 둘 다 포함 */
  from: string;
  to: string;
}

/**
 * 과거 최악 구간 — **서버 상수**. 근거: 업비트 원화 일봉(`forecast.v_daily_close`)에서 BTC 가
 * 2022-11-05 종가 29,756,000 → 2022-11-21 종가 22,220,000(−25.3%). FTX 파산 신청(11-11) 전후다.
 * 우리 일봉이 2022-09 부터라 그 전 구간(2022-05 루나 등)은 재현할 재료가 없다.
 */
export const HISTORICAL_EPISODES: readonly HistoricalEpisode[] = [
  { id: "2022-11-ftx", from: "2022-11-05", to: "2022-11-21" },
];

export interface ScenarioHolding {
  symbol: string;
  value: Money;
}

export interface ShockScenario {
  shock: Decimal;
  /** 손실(음수 원) */
  loss: Money;
  valueAfter: Money;
  bySymbol: Array<{ symbol: string; loss: Money }>;
}

export interface EpisodeScenario {
  id: string;
  from: string;
  to: string;
  status: "ok" | "insufficient_data";
  /** 보유 전체 손익(원). 종목 하나라도 값이 없으면 `null` */
  loss: Money | null;
  /** 보유 전체 수익률(평가금 가중) */
  returnRate: Decimal | null;
  bySymbol: Array<{ symbol: string; returnRate: Decimal | null; loss: Money | null }>;
  missingSymbols: string[];
}

export interface PortfolioScenarios {
  status: "ok" | "no_holdings";
  totalValue: Money;
  shocks: ShockScenario[];
  episodes: EpisodeScenario[];
}

/** 평가금이 큰 종목이 앞 */
const byValue = (holdings: ScenarioHolding[]) =>
  [...holdings].sort((a, b) => b.value.compare(a.value));

export const shockScenarios = (holdings: ScenarioHolding[]): ShockScenario[] => {
  const sorted = byValue(holdings);
  const total = sorted.reduce((sum, holding) => sum.plus(holding.value), Money.krw(0));
  return SCENARIO_SHOCKS.map((shock) => {
    const loss = total.scale(shock);
    return {
      shock,
      loss,
      valueAfter: total.plus(loss),
      bySymbol: sorted.map((holding) => ({ symbol: holding.symbol, loss: holding.value.scale(shock) })),
    };
  });
};

/** 그 날짜(KST) 일봉 — `openTime` 이 그날 UTC 00:00 이다 */
const closeOn = (bars: DailyBar[] | undefined, isoDate: string): Decimal | null => {
  const at = new Date(`${isoDate}T00:00:00Z`).getTime();
  return bars?.find((bar) => bar.openTime.getTime() === at)?.close ?? null;
};

export const episodeScenario = (
  episode: HistoricalEpisode,
  holdings: ScenarioHolding[],
  barsBySymbol: Map<string, DailyBar[]>
): EpisodeScenario => {
  const sorted = byValue(holdings);
  const missing: string[] = [];
  const bySymbol = sorted.map((holding) => {
    const bars = barsBySymbol.get(holding.symbol);
    const start = closeOn(bars, episode.from);
    const end = closeOn(bars, episode.to);
    if (!start || !end || start.lte(0)) {
      missing.push(holding.symbol);
      return { symbol: holding.symbol, returnRate: null, loss: null };
    }
    const returnRate = end.div(start).minus(1);
    return { symbol: holding.symbol, returnRate, loss: holding.value.scale(returnRate) };
  });

  const total = sorted.reduce((sum, holding) => sum.plus(holding.value), Money.krw(0));
  if (missing.length || total.isZero()) {
    return { ...episode, status: "insufficient_data", loss: null, returnRate: null, bySymbol, missingSymbols: missing };
  }
  const loss = bySymbol.reduce((sum, row) => sum.plus(row.loss!), Money.krw(0));
  return {
    ...episode,
    status: "ok",
    loss,
    returnRate: loss.toDecimal().div(total.toDecimal()),
    bySymbol,
    missingSymbols: [],
  };
};

export const portfolioScenarios = (
  holdings: ScenarioHolding[],
  episodeBars: Map<string, DailyBar[]>
): PortfolioScenarios => {
  const held = holdings.filter((holding) => !holding.value.isZero() && !holding.value.isNegative());
  const totalValue = held.reduce((sum, holding) => sum.plus(holding.value), Money.krw(0));
  if (!held.length) return { status: "no_holdings", totalValue, shocks: [], episodes: [] };
  return {
    status: "ok",
    totalValue,
    shocks: shockScenarios(held),
    episodes: HISTORICAL_EPISODES.map((episode) => episodeScenario(episode, held, episodeBars)),
  };
};

/** 구간 일봉을 읽을 범위 — 가장 이른 시작 ~ 가장 늦은 끝 */
export const episodeBarRange = (): { from: Date; to: Date } => {
  const starts = HISTORICAL_EPISODES.map((episode) => new Date(`${episode.from}T00:00:00Z`).getTime());
  const ends = HISTORICAL_EPISODES.map((episode) => new Date(`${episode.to}T00:00:00Z`).getTime());
  return { from: new Date(Math.min(...starts)), to: new Date(Math.max(...ends)) };
};
