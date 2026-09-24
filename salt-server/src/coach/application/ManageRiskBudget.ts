import Decimal from "decimal.js";

import type { Money } from "../../shared/domain";
import {
  concentrationGauge,
  DEFAULT_MAX_SINGLE_ASSET_WEIGHT,
  DEFAULT_TARGET_VOLATILITY,
  drawdownGauge,
  resolveBudget,
  turnoverGauge,
  type BudgetSetting,
  type CoachProfileStore,
  type ConcentrationGauge,
  type DrawdownGauge,
  type MarketProbe,
  type PortfolioProbe,
  type TurnoverGauge,
} from "../domain";
import { loadRiskSnapshot } from "./lib/loadRiskSnapshot";

/**
 * 리스크 예산 조회 · 수정 — `GET · PUT /api/coach/risk-budget` (FEATURE-009 FR-1~3 · FR-17 · FR-23~24).
 *
 * 게이지 3개(이번 달 낙폭 · 종목 집중도 · 회전율 · 수수료)와 사용자가 정한 예산. 아무것도 막지 않는다 —
 * 예산을 넘으면 상태가 `exceeded` 가 될 뿐이다. 시나리오(FR-25)는 슬라이스 6 이다.
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
  };
  totalValue: Money;
  gauges: {
    drawdown: DrawdownGauge;
    concentration: ConcentrationGauge;
    turnover: TurnoverGauge;
  };
  monthStart: Date;
  asOf: Date;
}

export class GetRiskBudget {
  constructor(
    private readonly profiles: CoachProfileStore,
    private readonly portfolio: PortfolioProbe,
    private readonly market: MarketProbe,
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

    return {
      settings: {
        monthlyLossBudget: profile?.monthlyLossBudget ?? null,
        perTradeMaxLoss: profile?.perTradeMaxLoss ?? null,
        monthlyLossBudgetKrw,
        perTradeMaxLossKrw: resolveBudget(profile?.perTradeMaxLoss ?? null, snapshot.totalValue),
        targetVolatility: profile?.targetVolatility ?? DEFAULT_TARGET_VOLATILITY,
        targetVolatilityIsDefault: !profile?.targetVolatility,
      },
      totalValue: snapshot.totalValue,
      gauges: {
        drawdown: drawdownGauge(monthlyLossBudgetKrw, snapshot.month),
        concentration: concentrationGauge(
          snapshot.holdings.map((holding) => ({ symbol: holding.symbol, value: holding.currentValue })),
          new Decimal(profile?.maxSingleAssetWeight ?? DEFAULT_MAX_SINGLE_ASSET_WEIGHT)
        ),
        turnover: turnoverGauge({
          trades: snapshot.ledger.entries,
          totalValue: snapshot.totalValue,
          yearStart: snapshot.yearStart,
          truncated: snapshot.ledger.truncated,
        }),
      },
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
}

export class UpdateRiskBudget {
  constructor(
    private readonly profiles: CoachProfileStore,
    private readonly getRiskBudget: GetRiskBudget
  ) {}

  async execute(userId: string, command: UpdateRiskBudgetCommand): Promise<RiskBudgetView> {
    await this.profiles.upsert(userId, command);
    return this.getRiskBudget.execute(userId);
  }
}
