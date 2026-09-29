import {
  buildProfitPlanWarnings,
  calculateProfitPlan,
  priceGap,
  type ForecastReader,
  type PortfolioProbe,
} from "../domain";

/** 이 계획이 보는 자산군. 원문이 `crypto` 로 좁혔다. */
const COACH_ASSET_TYPE = "crypto" as const;

export interface ProfitPlanQuery {
  symbol?: string;
}

/**
 * 익절·손절 계획 목록 — `profit-plan.service` 에서 옮겨왔다.
 *
 * 보유마다 단계 계획을 만든다. 계산은 `domain/policy/profitPlan` 이 하고, 여기는
 * 보유를 읽어 넘기기만 한다. 원문은 `prisma.portfolioHolding` 을 직접 뒤졌다.
 *
 * **가격 단계는 검토 지점이지 목표주가가 아니다.** 문구(`buildProfitPlanWarnings`)가
 * 그 구분을 유지한다 (전 영역 공통 수용 기준 4).
 */
export class ListProfitPlans {
  constructor(
    private readonly portfolio: PortfolioProbe,
    /** 실현 변동성(F010 슬라이스 2) — 종목 전부 한 쿼리. 없거나 실패하면 고정 비율 */
    private readonly forecasts: Pick<ForecastReader, "symbolRisk"> | null = null
  ) {}

  async execute(userId: string, query: ProfitPlanQuery = {}) {
    // 원문이 `assetType: crypto` 로 좁혔다 — 손절·익절 비율이 자산군마다 다르다
    const holdings = await this.portfolio.listHoldings(userId, COACH_ASSET_TYPE);
    const symbol = query.symbol?.toUpperCase();
    const targets = holdings.filter((holding) => !symbol || holding.symbol === symbol);
    const risk =
      this.forecasts && targets.length
        ? await this.forecasts
            .symbolRisk(targets.map((holding) => holding.symbol))
            .catch(() => null)
        : null;

    const plans = targets.map((holding) => {
      const plan = calculateProfitPlan(
        {
          currentPrice: holding.currentPrice,
          averageBuyPrice: holding.averageBuyPrice,
          unrealizedProfitRate: holding.unrealizedProfitRate,
        },
        risk?.get(holding.symbol.toUpperCase())?.annualized ?? null
      );

      return {
        symbol: holding.symbol,
        status: plan.status,
        currentPrice: plan.currentPrice,
        averageBuyPrice: holding.averageBuyPrice,
        totalQuantity: holding.totalQuantity,
        currentValue: holding.currentValue,
        unrealizedProfit: holding.unrealizedProfit,
        unrealizedProfitRate: holding.unrealizedProfitRate,
        // 기존 필드는 그대로 두고 거리만 더한다(`SRV-REQ-025` FR-16). 화면이 빼지 않게
        stages: plan.stages.map((stage) => ({
          ...stage,
          gapFromCurrent: priceGap(stage.price, plan.currentPrice),
        })),
        // 가격선 근거 — 변동성 배수 · 고정 비율(F010 슬라이스 2). 기존 필드는 그대로
        basis: plan.basis,
        warnings: buildProfitPlanWarnings(plan.status),
        generatedAt: new Date().toISOString(),
      };
    });

    return { status: plans.length ? "active" : "empty", plans };
  }
}
