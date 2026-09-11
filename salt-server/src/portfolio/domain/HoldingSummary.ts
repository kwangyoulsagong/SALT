import Decimal from "decimal.js";

/**
 * 보유 합산 — 목록 요약과 통계가 **같은 함수**를 쓴다.
 *
 * 원문에서는 `getHoldings()` 와 `getPortfolioStats()` 가 같은 합계를 각자 `reduce` 로
 * 계산했고, 그래서 `totalProfit` 의 정의가 두 곳에 있었다(둘은 같았지만, 한쪽만 고치면
 * 목록 요약과 통계가 다른 답을 낸다).
 *
 * `Float` 합산이 아니라 `Decimal` 누적이다 — 보유 수가 늘수록 차이가 커지는 쪽이고,
 * 이 합계가 청구서·세금 화면의 입력이 된다. `number` 로 내리는 것은 **응답 경계 한 번**이다.
 */

/** 합산에 필요한 값만. Prisma 행 전체를 받지 않는다. */
export interface HoldingFact {
  totalInvested: number;
  currentValue: number;
  unrealizedProfit: number;
  realizedProfit: number;
  unrealizedProfitRate: number;
}

export interface HoldingTotals {
  totalValue: number;
  totalInvested: number;
  totalProfit: number;
  totalProfitRate: number;
  unrealizedProfit: number;
  realizedProfit: number;
}

const sum = (values: Decimal[]) =>
  values.reduce((acc, value) => acc.plus(value), new Decimal(0));

export const summarizeHoldings = (holdings: HoldingFact[]): HoldingTotals => {
  const totalValue = sum(holdings.map((h) => new Decimal(h.currentValue)));
  const totalInvested = sum(holdings.map((h) => new Decimal(h.totalInvested)));
  const unrealizedProfit = sum(
    holdings.map((h) => new Decimal(h.unrealizedProfit))
  );
  const realizedProfit = sum(holdings.map((h) => new Decimal(h.realizedProfit)));
  const totalProfit = unrealizedProfit.plus(realizedProfit);

  return {
    totalValue: totalValue.toNumber(),
    totalInvested: totalInvested.toNumber(),
    totalProfit: totalProfit.toNumber(),
    /** 투자금이 0 이면 수익률은 0 이다 — 0 으로 나누지 않는다 (원문). */
    totalProfitRate: totalInvested.isZero()
      ? 0
      : totalProfit.div(totalInvested).times(100).toNumber(),
    unrealizedProfit: unrealizedProfit.toNumber(),
    realizedProfit: realizedProfit.toNumber(),
  };
};

/**
 * 현재가를 반영한 평가액과 미실현 손익.
 *
 * 원문은 이 셋을 `updateHoldingPrices()` 루프 안에서 계산했다. 순수 함수로 꺼내면
 * **"평가액은 수량 × 현재가"라는 정의가 한 곳**이 된다.
 */
export const revalue = (holding: {
  totalQuantity: number;
  totalInvested: number;
}, currentPrice: number) => {
  const invested = new Decimal(holding.totalInvested);
  const currentValue = new Decimal(holding.totalQuantity).times(currentPrice);
  const unrealizedProfit = currentValue.minus(invested);

  return {
    currentPrice,
    currentValue: currentValue.toNumber(),
    unrealizedProfit: unrealizedProfit.toNumber(),
    unrealizedProfitRate: invested.isZero()
      ? 0
      : unrealizedProfit.div(invested).times(100).toNumber(),
  };
};

/**
 * 수익률 최고·최저 보유.
 *
 * 보유가 하나면 **최고와 최저가 같은 행**이다(원문 동작). 보유가 없으면 둘 다 `null`.
 */
export const rankByProfitRate = <T extends { unrealizedProfitRate: number }>(
  holdings: T[]
): { best: T | null; worst: T | null } => {
  if (holdings.length === 0) return { best: null, worst: null };

  const sorted = [...holdings].sort(
    (a, b) => b.unrealizedProfitRate - a.unrealizedProfitRate
  );

  return { best: sorted[0], worst: sorted[sorted.length - 1] };
};
