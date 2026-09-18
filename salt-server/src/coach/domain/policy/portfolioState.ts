import type { CoachHolding, PortfolioState, RiskLevel } from "../model";

/**
 * 포트폴리오 집중도 판정 — `portfolio-state.service` 에서 옮겨온 **순수 판정**.
 *
 * 보유 조회는 `PortfolioProbe` 가 한다. 원문에서 같은 조회가 일곱 파일에 있었다.
 */

const EMPTY: PortfolioState = {
  totalValue: 0,
  concentration: 0,
  riskLevel: "low",
  diversificationScore: 0,
};

export const analyzePortfolioState = (
  holdings: CoachHolding[]
): PortfolioState => {
  if (holdings.length === 0) return EMPTY;

  const totalValue = holdings.reduce(
    (sum, h) => sum + Number(h.currentValue ?? 0),
    0
  );
  if (totalValue <= 0) return EMPTY;

  let largestWeight = 0;
  let largestAsset = "";

  for (const h of holdings) {
    const weight = Number(h.currentValue ?? 0) / totalValue;
    if (weight > largestWeight) {
      largestWeight = weight;
      largestAsset = h.symbol;
    }
  }

  let riskLevel: RiskLevel = "low";
  if (largestWeight > 0.7) riskLevel = "high";
  else if (largestWeight > 0.4) riskLevel = "medium";

  return {
    totalValue,
    concentration: largestWeight,
    largestAsset,
    riskLevel,
    diversificationScore: Math.min(100, Math.round((1 - largestWeight) * 100)),
  };
};
