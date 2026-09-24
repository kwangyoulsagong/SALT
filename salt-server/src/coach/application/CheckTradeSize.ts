import Decimal from "decimal.js";

import { Money } from "../../shared/domain";
import {
  calculateSizing,
  DEFAULT_MAX_SINGLE_ASSET_WEIGHT,
  DEFAULT_TARGET_VOLATILITY,
  resolveBudget,
  SIZING_FEE_RATE_PER_SIDE,
  type CoachProfileStore,
  type ForecastReader,
  type MarketProbe,
  type PortfolioProbe,
  type SizingResult,
} from "../domain";
import { loadRiskSnapshot } from "./lib/loadRiskSnapshot";

export interface CheckTradeSizeCommand {
  symbol: string;
  side: "buy" | "sell";
  quantity: Decimal;
  price: Decimal;
  stopPrice?: Decimal;
  /** FR-6 — 둘 다 있을 때만 켈리를 계산한다 */
  winRate?: Decimal;
  payoffRatio?: Decimal;
}

export interface TradeSizeCheck {
  symbol: string;
  side: "buy" | "sell";
  sizing: SizingResult;
  /** 계산에 쓴 전제 — 화면이 "수수료 0.05% 가정"처럼 밝힌다 */
  assumptions: {
    feeRatePerSide: Decimal;
    targetVolatility: Decimal;
    targetVolatilityIsDefault: boolean;
    maxSingleAssetWeight: Decimal;
  };
  volatilityAsOf: Date | null;
  asOf: Date;
  /** 사실 서술. 켜면 주문이 되는 코드가 이 뒤에 없다(공통 수용 기준 2) */
  orderExecution: false;
}

/**
 * 포지션 사이즈 계산 — `POST /api/coach/size-check` (FEATURE-009 FR-4~8 · `SRV-REQ-038`).
 *
 * 재료를 모으고 `domain/policy/sizing` 에 넘길 뿐이다. 월 예산 잔여는 리스크 게이지와 **같은 스냅샷**
 * (`loadRiskSnapshot`)에서 온다 — 두 화면이 다른 잔여를 말하지 않는다.
 */
export class CheckTradeSize {
  constructor(
    private readonly profiles: CoachProfileStore,
    private readonly portfolio: PortfolioProbe,
    private readonly market: MarketProbe,
    private readonly forecasts: ForecastReader,
    private readonly now: () => Date = () => new Date()
  ) {}

  async execute(userId: string, command: CheckTradeSizeCommand): Promise<TradeSizeCheck> {
    const symbol = command.symbol.toUpperCase();
    const now = this.now();

    const [snapshot, volatility] = await Promise.all([
      loadRiskSnapshot(
        { profiles: this.profiles, portfolio: this.portfolio, market: this.market },
        userId,
        now
      ),
      this.forecasts.realizedVolatility(symbol),
    ]);

    const profile = snapshot.profile;
    const existing = snapshot.holdings.find((holding) => holding.symbol === symbol);
    const targetVolatility = profile?.targetVolatility ?? DEFAULT_TARGET_VOLATILITY;
    const maxSingleAssetWeight = new Decimal(
      profile?.maxSingleAssetWeight ?? DEFAULT_MAX_SINGLE_ASSET_WEIGHT
    );

    const monthlyBudget = resolveBudget(profile?.monthlyLossBudget ?? null, snapshot.totalValue);
    const monthlyUsed =
      snapshot.month.status === "ok"
        ? snapshot.month.pnl.isNegative()
          ? snapshot.month.pnl.scale(-1)
          : Money.krw(0)
        : null;

    const sizing = calculateSizing({
      side: command.side,
      quantity: command.quantity,
      price: Money.krw(command.price),
      stopPrice: command.stopPrice ? Money.krw(command.stopPrice) : null,
      perTradeBudget: resolveBudget(profile?.perTradeMaxLoss ?? null, snapshot.totalValue),
      monthlyBudget,
      monthlyUsed,
      totalValue: snapshot.totalValue,
      existingSymbolValue: Money.krw(existing?.currentValue ?? 0),
      maxSingleAssetWeight,
      realizedVolatility: volatility?.annualized ?? null,
      targetVolatility,
      kelly:
        command.winRate && command.payoffRatio
          ? { winRate: command.winRate, payoffRatio: command.payoffRatio }
          : undefined,
    });

    return {
      symbol,
      side: command.side,
      sizing,
      assumptions: {
        feeRatePerSide: SIZING_FEE_RATE_PER_SIDE,
        targetVolatility,
        targetVolatilityIsDefault: !profile?.targetVolatility,
        maxSingleAssetWeight,
      },
      volatilityAsOf: volatility?.asOf ?? null,
      asOf: now,
      orderExecution: false,
    };
  }
}
