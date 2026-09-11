import { contextApis } from "../../composition";

export type PortfolioState = {
  totalValue: number;
  concentration: number;
  largestAsset?: string;
  riskLevel: "low" | "medium" | "high";
  diversificationScore: number;
};

const EMPTY: PortfolioState = {
  totalValue: 0,
  concentration: 0,
  riskLevel: "low",
  diversificationScore: 0,
};

/**
 * 포트폴리오 집중도 판정.
 *
 * ## `prisma` 를 직접 뒤지지 않는다
 *
 * 원문은 `prisma.portfolioHolding` 을 직접 조회했다. 같은 조회가 `trade-preflight` ·
 * `profit-plan` · `risk-alert` · `portfolio-rebalance` · `ai-coach-feature.extractor` ·
 * `dashboard` 에도 각자 있었다 — **일곱 곳**이다.
 *
 * 이제 `portfolio` 의 공개 API 를 부른다 (`SRV-REQ-006` FR-32a). **이 파일은 아직
 * `modules/` 에 있다** — `coach` 이관은 FR-32 이고, 그때 이 판정이
 * `coach/domain/policy` 로 간다. 나머지 여섯도 그때 같은 API 로 옮긴다.
 */
export class PortfolioStateService {
  async analyze(userId: string): Promise<PortfolioState> {
    const holdings = await contextApis.portfolio.listHoldings(userId);
    if (holdings.length === 0) return EMPTY;

    const totalValue = holdings.reduce(
      (sum, h) => sum + Number(h.currentValue ?? 0),
      0,
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

    let riskLevel: "low" | "medium" | "high" = "low";
    if (largestWeight > 0.7) riskLevel = "high";
    else if (largestWeight > 0.4) riskLevel = "medium";

    return {
      totalValue,
      concentration: largestWeight,
      largestAsset,
      riskLevel,
      diversificationScore: Math.min(
        100,
        Math.round((1 - largestWeight) * 100),
      ),
    };
  }
}
