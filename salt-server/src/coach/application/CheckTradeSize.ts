import Decimal from "decimal.js";

import { logger } from "../../shared/config/logger";
import { Money } from "../../shared/domain";
import {
  calculateSizing,
  DEFAULT_MAX_SINGLE_ASSET_WEIGHT,
  DEFAULT_ROUND_TRIP_COSTS,
  DEFAULT_TARGET_VOLATILITY,
  judgmentAssetClassFor,
  KR_GAP_BREAK_BOUNDS,
  KR_GAP_LOOKBACK_DAYS,
  KR_GAP_QUANTILE,
  krGapScenarios,
  resolveBudget,
  sizingCosts,
  type RoundTripCosts,
  type CoachProfileStore,
  type ForecastReader,
  type MarketProbe,
  type OutcomeAssetType,
  type PortfolioProbe,
  type GapScenarios,
  type OvernightGapHistory,
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
  /**
   * 국내 주식 매수 — 손절가에서 안 팔렸을 때 두 줄(하한가 · 과거 하위 1% 갭, F011 FR-45). 코인 · 매도 · 손절가 없음은 `null`.
   * 갭 분포를 못 읽으면 하한가 줄만 나간다
   */
  gapScenarios: GapScenarios | null;
  /** 계산에 쓴 전제 — 화면이 "수수료 0.05% 가정"처럼 밝힌다 */
  assumptions: {
    feeRatePerSide: Decimal;
    /** 매도 거래세(오늘 매도 기준, 청산 금액에만). 코인은 `null` — 세금 줄이 없다(F011 FR-44) */
    sellTaxRate: Decimal | null;
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
    /** 국내 주식 수수료 한쪽(F011 FR-44) — 거래세는 날짜 표가 정한다 */
    private readonly costs: RoundTripCosts = DEFAULT_ROUND_TRIP_COSTS
  ) {}

  async execute(userId: string, command: CheckTradeSizeCommand): Promise<TradeSizeCheck> {
    const symbol = command.symbol.toUpperCase();
    const now = this.now();

    // 자산군 — 수수료가 갈리고, 행동 미리보기가 같은 자산군 기록만 본다(F011 FR-47). 시세를 모르면 코인(지금까지와 같다)
    const assetClassP = this.market
      .quotes([symbol])
      .catch(() => new Map())
      .then((quotes) => judgmentAssetClassFor(quotes.get(symbol)?.assetType));
    const [snapshot, volatility, behavior, assetClass] = await Promise.all([
      loadRiskSnapshot(
        { profiles: this.profiles, portfolio: this.portfolio, market: this.market },
        userId,
        now
      ),
      this.forecasts.realizedVolatility(symbol),
      assetClassP.then((assetClass) =>
        this.previewBehavior(userId, symbol, command, assetClass, sizingCosts(assetClass, this.costs, now).feeRatePerSide)
      ),
      assetClassP,
    ]);
    const costs = sizingCosts(assetClass, this.costs, now);
    const { feeRatePerSide, sellTaxRate } = costs;

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
      sellTaxRate,
    });

    const gapScenarios =
      assetClass === "kr_stock"
        ? krGapScenarios({
            side: command.side,
            quantity: command.quantity,
            price: Money.krw(command.price),
            stopPrice: command.stopPrice ? Money.krw(command.stopPrice) : null,
            costs,
            history: command.side === "buy" && command.stopPrice ? await this.gapHistory(symbol, now) : null,
          })
        : null;

    return {
      symbol,
      side: command.side,
      sizing,
      gapScenarios,
      assumptions: {
        feeRatePerSide,
        sellTaxRate: assetClass === "kr_stock" ? sellTaxRate : null,
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

  /** 갭 분포는 보조 줄이다 — 못 읽으면 `null`(하한가 줄은 그대로 나간다). 자산군을 알아야 불러서 시세 조회 뒤 한 번 더 간다 */
  private async gapHistory(symbol: string, now: Date): Promise<OvernightGapHistory | null> {
    const since = new Date(now.getTime() - KR_GAP_LOOKBACK_DAYS * 24 * 3600_000);
    try {
      const stats = await this.market.overnightGapStats(symbol, since, KR_GAP_QUANTILE, KR_GAP_BREAK_BOUNDS);
      return {
        sample: stats.sample,
        quantile: stats.quantile === null ? null : new Decimal(stats.quantile),
        worst: stats.worst === null ? null : new Decimal(stats.worst),
        since,
      };
    } catch (error) {
      logger.warn(`사이즈 계산 갭 분포 실패: ${symbol} ${error instanceof Error ? error.name : "unknown"}`);
      return null;
    }
  }

  /** 미리보기는 보조 줄이다 — 실패를 사이즈 계산 실패로 번지게 하지 않는다 */
  private async previewBehavior(
    userId: string,
    symbol: string,
    command: CheckTradeSizeCommand,
    assetType: OutcomeAssetType,
    feeRatePerSide: Decimal
  ): Promise<TradeBehaviorPreview | null> {
    if (!this.preview) return null;
    try {
      return await this.preview.execute(userId, {
        symbol,
        side: command.side,
        quantity: command.quantity,
        price: command.price,
        hasPlan: command.hasPlan ?? command.stopPrice !== undefined,
        assetType,
        feeRatePerSide,
      });
    } catch (error) {
      logger.warn(`사이즈 계산 행동 미리보기 실패: ${error instanceof Error ? error.name : "unknown"}`);
      return null;
    }
  }
}
