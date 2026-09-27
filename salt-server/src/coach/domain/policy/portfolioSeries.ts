/**
 * 일별 평가금 흐름 — 보유 대비(FR-16) · 월간 복기의 IPS 이탈 일수(FR-28)가 같이 쓴다.
 *
 * 둘이 같은 평가금을 봐야 한다. 복기의 "상한 넘은 날"과 미러의 TWR 이 다른 종가 규칙을 쓰면 한 화면 안에서
 * 서로를 부정한다. 그래서 거래를 일봉에 붙이는 규칙이 여기 한 벌이다.
 *
 * - 거래는 그날 일봉 종가 시점의 입출금으로 본다(`openTime` UTC 00:00 = KST 09:00 경계)
 * - 종가가 빠진 날은 직전 종가를 쓴다. 들고 있는 종목의 첫 종가가 아직 없으면 그날 값을 만들지 않는다
 */

import Decimal from "decimal.js";

import type { DailyBar } from "./adherence";
import type { CoachLedgerEntry } from "../model";

const ZERO = new Decimal(0);
export const DAY_MS = 24 * 60 * 60 * 1000;

export interface PortfolioDay {
  /** 그날 일봉의 `openTime`(ms) */
  day: number;
  /** 종가 평가금(원) */
  value: Decimal;
  /** 순입금 = 매수(대금 + 수수료) − 매도(대금 − 수수료) */
  flow: Decimal;
  /** 수수료를 0 으로 본 순입금 */
  flowFeeless: Decimal;
  /** 그날 들고 있던 종목(수량 > 0)의 수량 · 종가 */
  holdings: Map<string, { quantity: Decimal; price: Decimal }>;
  /** 지금까지 본 모든 종목의 마지막 종가(팔고 없는 종목 포함) — 보유 대비의 끝값 */
  closes: Map<string, Decimal>;
}

export type PortfolioWalk =
  | { status: "ok"; days: PortfolioDay[] }
  | { status: "missing_close"; missingCloses: string[] };

/**
 * 첫 거래일부터 `lastDay`(닫힌 마지막 일봉)까지 하루씩.
 * `requireFrom` 이전 날은 종가가 비어도 건너뛰고(그날은 결과에 없다), 이후 날에 비면 `missing_close` 다.
 */
export const walkPortfolioDays = (
  entries: CoachLedgerEntry[],
  barsBySymbol: Map<string, DailyBar[]>,
  lastDay: number,
  requireFrom = Number.NEGATIVE_INFINITY
): PortfolioWalk => {
  if (!entries.length) return { status: "ok", days: [] };

  const closeIndex = new Map<string, Map<number, Decimal>>();
  for (const [symbol, bars] of barsBySymbol) {
    closeIndex.set(symbol, new Map(bars.map((bar) => [bar.openTime.getTime(), bar.close])));
  }

  const firstDay = Math.floor(entries[0].transactionDate.getTime() / DAY_MS) * DAY_MS;
  const quantities = new Map<string, Decimal>();
  const lastClose = new Map<string, Decimal>();
  const days: PortfolioDay[] = [];
  let cursor = 0;

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
    const holdings = new Map<string, { quantity: Decimal; price: Decimal }>();
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
      if (!price) {
        missing.push(symbol);
        continue;
      }
      lastClose.set(symbol, price);
      holdings.set(symbol, { quantity, price });
      value = value.plus(quantity.times(price));
    }
    if (missing.length) {
      if (day >= requireFrom) return { status: "missing_close", missingCloses: missing.sort() };
      continue;
    }

    days.push({ day, value, flow, flowFeeless, holdings, closes: new Map(lastClose) });
  }

  return { status: "ok", days };
};
