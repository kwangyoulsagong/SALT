import Decimal from "decimal.js";

import { Money } from "../../shared/domain";
import {
  btcBetaGauge,
  concentrationGauge,
  DEFAULT_MAX_SINGLE_ASSET_WEIGHT,
  DEFAULT_TARGET_VOLATILITY,
  drawdownGauge,
  episodeBarRange,
  portfolioScenarios,
  resolveBudget,
  turnoverGauge,
  type BtcBetaGauge,
  type BudgetSetting,
  type CoachProfileStore,
  type ConcentrationGauge,
  type DrawdownGauge,
  type ForecastReader,
  type MarketProbe,
  type MarketRegimeState,
  type PortfolioScenarios,
  type PortfolioProbe,
  type TurnoverGauge,
} from "../domain";
import { loadRiskSnapshot } from "./lib/loadRiskSnapshot";

/**
 * 리스크 예산 조회 · 수정 — `GET · PUT /api/coach/risk-budget` (FEATURE-009 FR-1~3 · FR-17 · FR-23~24).
 *
 * 게이지 3개(이번 달 낙폭 · 종목 집중도 · 회전율 · 수수료)와 사용자가 정한 예산. 아무것도 막지 않는다 —
 * 예산을 넘으면 상태가 `exceeded` 가 될 뿐이다.
 *
 * 시나리오(FR-25, 슬라이스 6)가 같이 나간다 — 게이지와 같은 보유 · 평가금을 봐야 "지금 보유가 −30% 면"이
 * 게이지의 총자산과 같은 수에서 출발한다. 과거 구간 일봉만 실패하면 시나리오의 그 구간만 `insufficient_data` 다.
 */

export interface RiskBudgetView {
  settings: {
    monthlyLossBudget: BudgetSetting | null;
    perTradeMaxLoss: BudgetSetting | null;
    /** 비율 예산은 지금 평가금액으로 환산한 원. 정하지 않았거나 평가금액이 0 이면 `null` */
    monthlyLossBudgetKrw: Money | null;
    perTradeMaxLossKrw: Money | null;
    targetVolatility: Decimal;
    targetVolatilityIsDefault: boolean;
    /** 한 종목 상한(IPS 3문항의 셋째). 기본 0.6 */
    maxSingleAssetWeight: Decimal;
  };
  totalValue: Money;
  gauges: {
    drawdown: DrawdownGauge;
    concentration: ConcentrationGauge;
    turnover: TurnoverGauge;
    /** BTC 베타 합(F010 슬라이스 2) */
    btcBeta: BtcBetaGauge;
  };
  /**
   * 시장 국면 라벨(F010 슬라이스 2 · `FC-REQ-009`) — BTC 200일선 · HMM 고변동 확률 · 365일 낙폭 · 다음 이벤트.
   * 사전등록 `regime-gate@1` 이 게이트를 채택하지 않아 **아무것도 막거나 줄이지 않는다**. 없거나 낡았으면 `null`
   */
  market: MarketRegimeState | null;
  scenarios: PortfolioScenarios;
  monthStart: Date;
  asOf: Date;
}

export class GetRiskBudget {
  constructor(
    private readonly profiles: CoachProfileStore,
    private readonly portfolio: PortfolioProbe,
    private readonly market: MarketProbe,
    private readonly forecasts: ForecastReader,
    private readonly now: () => Date = () => new Date()
  ) {}

  async execute(userId: string): Promise<RiskBudgetView> {
    const now = this.now();
    const snapshot = await loadRiskSnapshot(
      { profiles: this.profiles, portfolio: this.portfolio, market: this.market },
      userId,
      now
    );
    const profile = snapshot.profile;
    const monthlyLossBudgetKrw = resolveBudget(profile?.monthlyLossBudget ?? null, snapshot.totalValue);
    const maxSingleAssetWeight = new Decimal(profile?.maxSingleAssetWeight ?? DEFAULT_MAX_SINGLE_ASSET_WEIGHT);

    const holdings = snapshot.holdings.map((holding) => ({
      symbol: holding.symbol.toUpperCase(),
      value: Money.krw(holding.currentValue),
    }));
    const range = episodeBarRange();
    // 과거 구간 일봉이 없어도 게이지는 나간다 — 시나리오의 구간 줄만 값이 빈다
    const symbols = holdings.map((holding) => holding.symbol);
    const [episodeBars, risk, market] = await Promise.all([
      this.forecasts.dailyCloses(symbols, range.from, range.to).catch(() => new Map()),
      // 베타 · 국면이 실패해도 게이지 셋은 나간다 — 그 칸만 insufficient_data · null
      this.forecasts.symbolRisk(symbols).catch(() => new Map<string, { btcBeta: number | null }>()),
      this.forecasts.marketRegime().catch(() => null),
    ]);
    const betas = new Map([...risk].map(([symbol, row]) => [symbol, row.btcBeta]));

    return {
      settings: {
        monthlyLossBudget: profile?.monthlyLossBudget ?? null,
        perTradeMaxLoss: profile?.perTradeMaxLoss ?? null,
        monthlyLossBudgetKrw,
        perTradeMaxLossKrw: resolveBudget(profile?.perTradeMaxLoss ?? null, snapshot.totalValue),
        targetVolatility: profile?.targetVolatility ?? DEFAULT_TARGET_VOLATILITY,
        targetVolatilityIsDefault: !profile?.targetVolatility,
        maxSingleAssetWeight,
      },
      totalValue: snapshot.totalValue,
      gauges: {
        drawdown: drawdownGauge(monthlyLossBudgetKrw, snapshot.month),
        concentration: concentrationGauge(
          snapshot.holdings.map((holding) => ({ symbol: holding.symbol, value: holding.currentValue })),
          maxSingleAssetWeight
        ),
        turnover: turnoverGauge({
          trades: snapshot.ledger.entries,
          totalValue: snapshot.totalValue,
          yearStart: snapshot.yearStart,
          truncated: snapshot.ledger.truncated,
        }),
        btcBeta: btcBetaGauge(
          snapshot.holdings.map((holding) => ({ symbol: holding.symbol, value: holding.currentValue })),
          betas
        ),
      },
      market,
      scenarios: portfolioScenarios(holdings, episodeBars),
      monthStart: snapshot.monthStart,
      asOf: now,
    };
  }
}

/** `undefined` 는 그대로, `null` 은 지운다(다시 "기준을 정하면 보여요") */
export interface UpdateRiskBudgetCommand {
  monthlyLossBudget?: BudgetSetting | null;
  perTradeMaxLoss?: BudgetSetting | null;
  targetVolatility?: Decimal | null;
  /** 한 종목 상한(0.05~1). `null` 이면 기본값(0.6)으로 되돌린다 — 컬럼이 NOT NULL 이다 */
  maxSingleAssetWeight?: Decimal | null;
}

export class UpdateRiskBudget {
  constructor(
    private readonly profiles: CoachProfileStore,
    private readonly getRiskBudget: GetRiskBudget
  ) {}

  async execute(userId: string, command: UpdateRiskBudgetCommand): Promise<RiskBudgetView> {
    const { maxSingleAssetWeight, ...budgets } = command;
    await this.profiles.upsert(userId, {
      ...budgets,
      ...(maxSingleAssetWeight === undefined
        ? {}
        : {
            maxSingleAssetWeight:
              maxSingleAssetWeight === null ? DEFAULT_MAX_SINGLE_ASSET_WEIGHT : maxSingleAssetWeight.toNumber(),
          }),
    });
    return this.getRiskBudget.execute(userId);
  }
}
