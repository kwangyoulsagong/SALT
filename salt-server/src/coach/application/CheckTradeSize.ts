import Decimal from "decimal.js";

import { logger } from "../../shared/config/logger";
import { Money } from "../../shared/domain";
import {
  calculateSizing,
  DEFAULT_MAX_SINGLE_ASSET_WEIGHT,
  DEFAULT_ROUND_TRIP_COSTS,
  DEFAULT_TARGET_VOLATILITY,
  judgmentAssetClassFor,
  resolveBudget,
  sizingFeeRatePerSide,
  type RoundTripCosts,
  type CoachProfileStore,
  type ForecastReader,
  type MarketProbe,
  type PortfolioProbe,
  type SizingResult,
} from "../domain";
import { loadRiskSnapshot } from "./lib/loadRiskSnapshot";
import type { PreviewTradeBehavior, TradeBehaviorPreview } from "./PreviewTradeBehavior";

export interface CheckTradeSizeCommand {
  symbol: string;
  side: "buy" | "sell";
  quantity: Decimal;
  price: Decimal;
  stopPrice?: Decimal;
  /** FR-6 — 둘 다 있을 때만 켈리를 계산한다 */
  winRate?: Decimal;
  payoffRatio?: Decimal;
  /** 폼에 계획(손절가 또는 이유)이 있는가 — 계획 외 후보 판정. 없으면 `stopPrice` 유무로 본다 */
  hasPlan?: boolean;
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
  /** 입력 중 행동 미리보기(FR-12). 미리보기만 실패하면 `null` — 사이즈 결과는 그대로 나간다 */
  behavior: TradeBehaviorPreview | null;
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
    private readonly now: () => Date = () => new Date(),
    private readonly preview: PreviewTradeBehavior | null = null,
    /** 국내 주식 수수료(F011 슬라이스 4) — 왕복 비용의 절반을 한쪽으로 */
    private readonly costs: RoundTripCosts = DEFAULT_ROUND_TRIP_COSTS
  ) {}

  async execute(userId: string, command: CheckTradeSizeCommand): Promise<TradeSizeCheck> {
    const symbol = command.symbol.toUpperCase();
    const now = this.now();

    const [snapshot, volatility, behavior, quotes] = await Promise.all([
      loadRiskSnapshot(
        { profiles: this.profiles, portfolio: this.portfolio, market: this.market },
        userId,
        now
      ),
      this.forecasts.realizedVolatility(symbol),
      this.previewBehavior(userId, symbol, command),
      // 자산군 — 수수료가 갈린다. 시세를 모르면 코인 수수료(지금까지와 같다)
      this.market.quotes([symbol]).catch(() => new Map()),
    ]);
    const feeRatePerSide = sizingFeeRatePerSide(judgmentAssetClassFor(quotes.get(symbol)?.assetType), this.costs);

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
      feeRatePerSide,
    });

    return {
      symbol,
      side: command.side,
      sizing,
      assumptions: {
        feeRatePerSide,
        targetVolatility,
        targetVolatilityIsDefault: !profile?.targetVolatility,
        maxSingleAssetWeight,
      },
      volatilityAsOf: volatility?.asOf ?? null,
      behavior,
      asOf: now,
      orderExecution: false,
    };
  }

  /** 미리보기는 보조 줄이다 — 실패를 사이즈 계산 실패로 번지게 하지 않는다 */
  private async previewBehavior(
    userId: string,
    symbol: string,
    command: CheckTradeSizeCommand
  ): Promise<TradeBehaviorPreview | null> {
    if (!this.preview) return null;
    try {
      return await this.preview.execute(userId, {
        symbol,
        side: command.side,
        quantity: command.quantity,
        price: command.price,
        hasPlan: command.hasPlan ?? command.stopPrice !== undefined,
      });
    } catch (error) {
      logger.warn(`사이즈 계산 행동 미리보기 실패: ${error instanceof Error ? error.name : "unknown"}`);
      return null;
    }
  }
}
