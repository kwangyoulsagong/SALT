import Decimal from "decimal.js";

import { Money } from "../../shared/domain";
import {
  buildTargetWeightGuide,
  DEFAULT_MAX_SINGLE_ASSET_WEIGHT,
  DEFAULT_TARGET_VOLATILITY,
  drawdownGauge,
  nearestTargetRecord,
  resolveBudget,
  TARGET_WEIGHT_BACKTEST,
  TARGET_WEIGHT_CORE_SYMBOLS,
  type CoachProfileStore,
  type ForecastReader,
  type MarketProbe,
  type PortfolioProbe,
  type TargetWeightBacktest,
  type TargetWeightGuide,
  type TargetWeightRecord,
} from "../domain";
import { loadRiskSnapshot } from "./lib/loadRiskSnapshot";

/**
 * 목표 비중 안내 — `GET /api/coach/target-weights` (F010 슬라이스 5 · `SRV-REQ-024` FR-182~186).
 *
 * 리스크 게이지와 **같은 재료**(`loadRiskSnapshot`)를 읽는다 — 손절선에 닿았을 때의 손실을 "이번 달 남은 예산의 몇 %"로
 * 말하려면 게이지와 같은 월 손익이어야 한다. 규칙 · 계산은 `domain/policy/targetWeight`, 과거 성적은
 * `targetWeightRecord`(사전등록 `target-weight@1` 리포트 상수)다.
 *
 * 3종 고지(근거 · 과거 성적 · 실패 사례)가 **항상** 함께 나간다. 과거 성적은 상수라 빠질 일이 없고, 근거는 종목별 σ 다 —
 * σ 가 있는 종목이 하나도 없으면 `renderable: false`(`blockedReason: no_volatility`)로 비중을 내지 않는다.
 *
 * 쿼리: 리스크 재료(프로필 · 보유 · 거래 · 월초 종가) + 변동성 1 + 시세 1. 외부 호출 없음.
 */

export interface TargetWeightView {
  guide: TargetWeightGuide;
  targetVolatility: Decimal;
  targetVolatilityIsDefault: boolean;
  maxSingleAssetWeight: Decimal;
  /** 사용자 목표 σ 에 가장 가까운 등록 목표의 기록(core · BTC · ETH) */
  record: TargetWeightRecord;
  backtest: Pick<TargetWeightBacktest, "preregKey" | "report" | "window" | "cadence" | "feeRatePerSide" | "holdBtc">;
  renderable: boolean;
  blockedReason: "no_volatility" | null;
  asOf: Date;
  /** 이 앱은 주문하지 않는다(공통 수용 기준 2) */
  orderExecution: false;
}

export class GetTargetWeights {
  constructor(
    private readonly profiles: CoachProfileStore,
    private readonly portfolio: PortfolioProbe,
    private readonly market: MarketProbe,
    private readonly forecasts: ForecastReader,
    private readonly now: () => Date = () => new Date()
  ) {}

  async execute(userId: string): Promise<TargetWeightView> {
    const now = this.now();
    const snapshot = await loadRiskSnapshot(
      { profiles: this.profiles, portfolio: this.portfolio, market: this.market },
      userId,
      now
    );
    const profile = snapshot.profile;
    const symbols = [
      ...new Set([...TARGET_WEIGHT_CORE_SYMBOLS, ...snapshot.holdings.map((holding) => holding.symbol.toUpperCase())]),
    ];
    const [risk, quotes] = await Promise.all([
      this.forecasts.symbolRisk(symbols),
      this.market.quotes(symbols),
    ]);

    const prices = new Map<string, Money>();
    for (const symbol of symbols) {
      const quote = quotes.get(symbol);
      const held = snapshot.holdings.find((holding) => holding.symbol.toUpperCase() === symbol);
      // 시세가 없으면 보유 평가에 쓴 현재가 — 둘 다 없으면 그 종목은 빠진다(`price_unavailable`)
      const price = quote?.currentPrice ?? held?.currentPrice ?? null;
      if (price !== null && price > 0) prices.set(symbol, Money.krw(price));
    }

    const monthlyBudget = resolveBudget(profile?.monthlyLossBudget ?? null, snapshot.totalValue);
    const drawdown = drawdownGauge(monthlyBudget, snapshot.month);
    const monthlyBudgetRemaining =
      drawdown.budget && drawdown.used ? drawdown.budget.minus(drawdown.used) : null;

    const targetVolatility = profile?.targetVolatility ?? DEFAULT_TARGET_VOLATILITY;
    const maxSingleAssetWeight = new Decimal(profile?.maxSingleAssetWeight ?? DEFAULT_MAX_SINGLE_ASSET_WEIGHT);

    const guide = buildTargetWeightGuide({
      investableCapital: profile?.investableCapital ?? null,
      holdings: snapshot.holdings.map((holding) => ({
        symbol: holding.symbol.toUpperCase(),
        quantity: new Decimal(holding.totalQuantity),
        value: Money.krw(holding.currentValue),
      })),
      prices,
      risk: new Map(
        [...risk].map(([symbol, row]) => [
          symbol.toUpperCase(),
          {
            sigma: row.annualized === null ? null : new Decimal(row.annualized),
            btcBeta: row.btcBeta,
            asOf: row.asOf,
          },
        ])
      ),
      targetVolatility,
      maxSingleAssetWeight,
      monthlyBudgetRemaining,
      now,
    });

    const { records: _records, ...backtest } = TARGET_WEIGHT_BACKTEST;
    return {
      guide,
      targetVolatility,
      targetVolatilityIsDefault: !profile?.targetVolatility,
      maxSingleAssetWeight,
      record: nearestTargetRecord(targetVolatility.toNumber()),
      backtest,
      renderable: guide.rows.length > 0,
      blockedReason: guide.rows.length > 0 ? null : "no_volatility",
      asOf: now,
      orderExecution: false,
    };
  }
}
