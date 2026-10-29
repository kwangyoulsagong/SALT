import {
  calculatePreflight,
  DEFAULT_MAX_SINGLE_ASSET_WEIGHT,
  judgmentAssetClassFor,
  PreflightMode,
  type CoachProfileStore,
  type MarketProbe,
  type PortfolioProbe,
} from "../domain";

export interface TradePreflightCommand {
  symbol: string;
  entryPrice: number;
  stopPrice?: number;
  stopLossRate?: number;
  takeProfitPrices: number[];
  amount: number;
  mode: PreflightMode;
}

/**
 * 주문 전 계산 — `trade-preflight.service` 에서 옮겨왔다.
 *
 * ## 주문을 실행하지 않는다
 *
 * 손익비·최대손실·비중을 **계산해 보여줄 뿐**이고, 게이트도 차단도 주문도 없다
 * (전 영역 공통 수용 기준 2). 응답의 `orderExecution: false` 는 그 사실의 서술이지
 * 스위치가 아니다 — 켜면 주문이 되는 코드가 이 뒤에 없다.
 *
 * 산술은 `domain/policy/preflight` 에 있고 여기는 재료만 모은다.
 *
 * ## 자산군은 시세가 정한다
 *
 * 비중 분모는 **같은 자산군 보유**다 — 원문이 코인으로 좁혔고(비중 한도는 같은 자산군 안에서만 뜻이 있다) 국내 주식도
 * 같은 규칙으로 국내 주식 보유만 본다(F004 슬라이스 16 후속). 자산군은 사이즈 계산(`CheckTradeSize`)과 같이 시세 조회의
 * `assetType` 으로 고른다 — 시세를 모르면 코인(지금까지와 같다). 응답 `assetType` 으로 화면이 분모 이름을 밝힌다
 */
export class CheckTradePreflight {
  constructor(
    private readonly market: MarketProbe,
    private readonly portfolio: PortfolioProbe,
    private readonly profiles: CoachProfileStore
  ) {}

  async execute(userId: string, command: TradePreflightCommand) {
    const symbol = command.symbol.toUpperCase();

    const [quotes, profile] = await Promise.all([
      this.market.quotes([symbol]),
      this.profiles.findByUser(userId),
    ]);
    const assetType = judgmentAssetClassFor(quotes.get(symbol)?.assetType);
    const [holdings, holding] = await Promise.all([
      this.portfolio.listHoldings(userId, assetType),
      this.portfolio.getHolding(userId, symbol, assetType),
    ]);

    const totalValue = holdings.reduce(
      (sum, item) => sum + item.currentValue,
      0
    );
    const maxSingleAssetWeight =
      profile?.maxSingleAssetWeight ?? DEFAULT_MAX_SINGLE_ASSET_WEIGHT;

    const calculation = calculatePreflight({
      entryPrice: command.entryPrice,
      stopPrice: command.stopPrice,
      stopLossRate: command.stopLossRate,
      takeProfitPrices: command.takeProfitPrices,
      amount: command.amount,
      mode: command.mode,
      totalValue,
      existingSymbolValue: holding?.currentValue ?? 0,
      maxSingleAssetWeight,
      priceUpdatedAt: quotes.get(symbol)?.priceUpdatedAt ?? null,
      now: new Date(),
    });

    return {
      symbol,
      assetType,
      mode: command.mode,
      orderExecution: false,
      calculation: {
        entryPrice: command.entryPrice,
        // 손절 칩(`stopLossRate`)이면 서버가 환산한 가격이다 — 화면은 이 값을 그린다
        stopPrice: calculation.effectiveStopPrice,
        stopLossRate: command.stopPrice ? null : command.stopLossRate ?? null,
        // 목표가는 입력한 것만 — 서버가 기본값을 만들지 않는다(FR-52)
        takeProfitPrices: command.takeProfitPrices,
        amount: command.amount,
        riskRewardRatio: calculation.riskRewardRatio,
        maxLossAmount: calculation.maxLossAmount,
        maxLossRate: calculation.maxLossRate,
        maxLossOfTotalRate: calculation.maxLossOfTotalRate,
        // 첫 목표가 도달 시 손익(원 정수 · 부호 그대로) — 목표가를 넣었을 때만
        targetGainAmount: calculation.targetGainAmount,
        targetGainRate: calculation.targetGainRate,
        projectedWeight: calculation.projectedWeight,
        maxSingleAssetWeight,
      },
      portfolioImpact: {
        totalValue,
        existingSymbolValue: holding?.currentValue ?? 0,
        projectedTotalValue: calculation.projectedTotalValue,
        projectedSymbolValue: calculation.projectedSymbolValue,
        projectedWeight: calculation.projectedWeight,
      },
      checklist: calculation.checklist,
      warnings: calculation.warnings,
      dataFreshness: {
        priceUpdatedAt: quotes.get(symbol)?.priceUpdatedAt ?? null,
        stale: calculation.stalePrice,
      },
    };
  }
}
