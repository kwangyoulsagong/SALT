import type { DispositionMirror } from "../../domain";
import type { KrBehaviorMirrorView } from "../../application/GetKrBehaviorMirror";
import { days, metric, rate } from "./mirrorView";

/**
 * 국내 주식 미러 응답(F011 FR-47). 규칙은 코인 미러(`mirrorView`)와 같다 — 비율 · 수익률은 소수 6자리, 금액은 원 정수.
 * 기준값(`Decimal`)은 숫자로. 일수는 **거래일**이라 `dayUnit` 을 함께 준다.
 */

const disposition = (value: DispositionMirror) => ({
  pgr: metric(value.pgr),
  plr: metric(value.plr),
  counts: value.counts,
  gainHoldingDays: metric(value.gainHoldingDays, days),
  lossHoldingDays: metric(value.lossHoldingDays, days),
  dayUnit: "trading_day" as const,
  missingCloses: value.missingCloses,
});

export const toKrBehaviorMirrorResponse = (view: KrBehaviorMirrorView) => {
  const { turnover, nextDaySell, chase, lottery } = view;
  return {
    status: view.status,
    turnover: {
      dailyTurnover: turnover.mirror ? metric(turnover.mirror.dailyTurnover) : null,
      tradedNotionalKrw: turnover.mirror ? turnover.mirror.tradedNotionalKrw.toDecimalPlaces(0).toNumber() : null,
      tradeCount: turnover.mirror?.tradeCount ?? null,
      windowTradingDays: turnover.mirror?.windowTradingDays ?? null,
      from: turnover.mirror?.from ?? null,
      to: turnover.mirror?.to ?? null,
      missingCloses: turnover.mirror?.missingCloses ?? [],
      baseline: {
        ...turnover.baseline,
        newRetailDailyTurnover: turnover.baseline.newRetailDailyTurnover.toNumber(),
        marketDailyTurnover: turnover.baseline.marketDailyTurnover.toNumber(),
      },
    },
    disposition: view.disposition && disposition(view.disposition),
    nextDaySell: {
      gainSellRate: nextDaySell.mirror ? metric(nextDaySell.mirror.gainSellRate) : null,
      lossSellRate: nextDaySell.mirror ? metric(nextDaySell.mirror.lossSellRate) : null,
      counts: nextDaySell.mirror?.counts ?? null,
      baseline: {
        ...nextDaySell.baseline,
        gainSellRate: nextDaySell.baseline.gainSellRate.toNumber(),
        lossSellRate: nextDaySell.baseline.lossSellRate.toNumber(),
      },
    },
    chase: {
      avgPriorReturn: chase.mirror ? metric(chase.mirror.avgPriorReturn) : null,
      medianPriorReturn: chase.mirror ? metric(chase.mirror.medianPriorReturn) : null,
      counts: chase.mirror?.counts ?? null,
      windowTradingDays: chase.mirror?.windowTradingDays ?? null,
      baseline: { ...chase.baseline, priorReturn: chase.baseline.priorReturn.toNumber() },
    },
    lottery: {
      buyShare: lottery.mirror ? metric(lottery.mirror.buyShare) : null,
      marketShare: rate(lottery.mirror?.marketShare ?? null),
      counts: lottery.mirror?.counts ?? null,
      lookbackMonths: lottery.mirror?.lookbackMonths ?? null,
      buyWindowDays: lottery.mirror?.buyWindowDays ?? null,
      definition: "kumar2009_total_volatility" as const,
      evidence: { ...lottery.evidence, excessReturn: lottery.evidence.excessReturn.toNumber() },
    },
    tradeCount: view.tradeCount,
    minSample: view.minSample,
    asOf: view.asOf,
  };
};
