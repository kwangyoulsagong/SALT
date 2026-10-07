import Decimal from "decimal.js";

import { Money } from "../../shared/domain";
import {
  buildTargetWeightGuide,
  DEFAULT_MAX_SINGLE_ASSET_WEIGHT,
  DEFAULT_TARGET_VOLATILITY,
  drawdownGauge,
  isForecastStale,
  isPriceFresh,
  nearestTargetRecord,
  resolveBudget,
  TARGET_WEIGHT_ALT_SHARE_RECORD,
  TARGET_WEIGHT_BACKTEST,
  TARGET_WEIGHT_CORE_SYMBOLS,
  TARGET_WEIGHT_LIVE_MIN_WEEKS,
  type CoachProfileStore,
  type ForecastReader,
  type MarketProbe,
  type PortfolioProbe,
  type TargetWeightBacktest,
  type TargetWeightGuide,
  type TargetWeightLiveRecord,
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
 * 알트는 규칙 밖이다(`target-weight@2` 채택 없음) — 보유 알트는 `excluded`(`no_record`)로 나가고, 판정 기록이
 * `altShare` 로 같이 나간다. 과거 성적은 core 모델 포트폴리오 라이브 원장이 30주 쌓이면 라이브로 바뀐다(`recordSource`).
 *
 * 쿼리: 리스크 재료(프로필 · 보유 · 거래 · 월초 종가) + 변동성 1 + 시세 1 + 라이브 요약 1. 외부 호출 없음.
 */

export interface TargetWeightView {
  guide: TargetWeightGuide;
  targetVolatility: Decimal;
  targetVolatilityIsDefault: boolean;
  maxSingleAssetWeight: Decimal;
  /** 사용자 목표 σ 에 가장 가까운 등록 목표의 기록(core · BTC · ETH) */
  record: TargetWeightRecord;
  backtest: Pick<TargetWeightBacktest, "preregKey" | "report" | "window" | "cadence" | "feeRatePerSide" | "holdBtc">;
  /** 알트 위험 몫 판정 기록(`target-weight@2`) */
  altShare: typeof TARGET_WEIGHT_ALT_SHARE_RECORD;
  /** core 모델 포트폴리오 라이브 성적(같은 등록 목표). 첫 리밸런스 전이면 `null` */
  live: TargetWeightLiveRecord | null;
  liveMinWeeks: number;
  /** 과거 성적 자리에 무엇을 쓰나 — 라이브 `nWeeks ≥ liveMinWeeks` 이면 `live`, 아니면 `backtest` */
  recordSource: "backtest" | "live";
  renderable: boolean;
  /** `stale_inputs` — 변동성 배치가 사흘 넘게 멈췄다 · `no_volatility` — σ 가 있는 종목이 없다(아직 계산 전 포함) */
  blockedReason: "no_volatility" | "stale_inputs" | null;
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
    const targetVolatility = profile?.targetVolatility ?? DEFAULT_TARGET_VOLATILITY;
    const record = nearestTargetRecord(targetVolatility.toNumber());
    const [risk, quotes, live] = await Promise.all([
      this.forecasts.symbolRisk(symbols),
      this.market.quotes(symbols),
      this.forecasts.targetWeightLive(record.target),
    ]);

    const prices = new Map<string, Money>();
    let staleQuotes = 0;
    for (const symbol of symbols) {
      const quote = quotes.get(symbol);
      const held = snapshot.holdings.find((holding) => holding.symbol.toUpperCase() === symbol);
      // 시세가 없으면 보유 평가에 쓴 현재가 — 둘 다 없으면 그 종목은 빠진다(`price_unavailable`).
      // 30분 넘게 멈춘 시세는 없는 것으로 본다 — 보유 평가가도 같은 시세라 대신 쓰지 않는다(F010 슬라이스 7 · FR-195)
      const fresh = quote ? isPriceFresh(quote.priceUpdatedAt, now) : true;
      if (!fresh) staleQuotes += 1;
      const price = fresh ? (quote?.currentPrice ?? held?.currentPrice ?? null) : null;
      if (price !== null && price > 0) prices.set(symbol, Money.krw(price));
    }

    const monthlyBudget = resolveBudget(profile?.monthlyLossBudget ?? null, snapshot.totalValue);
    const drawdown = drawdownGauge(monthlyBudget, snapshot.month);
    const monthlyBudgetRemaining =
      drawdown.budget && drawdown.used ? drawdown.budget.minus(drawdown.used) : null;

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
            // 사전등록 [protocol] sigma = EWMA 그 자체. 사이즈 계산의 QLIKE 게이트(`annualized`)는 여기 쓰지 않는다 —
            // 백테스트가 게이트 없이 돌았고, 게이트를 쓰면 ETH 처럼 채점에 진 종목이 규칙에서 빠져 기록과 다른 규칙이 된다
            sigma: row.ewma === null ? null : new Decimal(row.ewma),
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

    // 비중이 하나도 안 나오면 왜인지 가른다(FR-196) — 시세가 멈췄거나 변동성 배치가 사흘 넘게 멈췄으면 `stale_inputs`.
    // 배치 시각은 σ 가 하나도 없을 때만 한 번 더 읽는다
    const blockedReason: TargetWeightView["blockedReason"] =
      guide.rows.length > 0
        ? null
        : staleQuotes > 0 ||
            (risk.size === 0 && isForecastStale(await this.forecasts.volatilityAsOf().catch(() => null), now))
          ? "stale_inputs"
          : "no_volatility";

    const { records: _records, ...backtest } = TARGET_WEIGHT_BACKTEST;
    return {
      guide,
      targetVolatility,
      targetVolatilityIsDefault: !profile?.targetVolatility,
      maxSingleAssetWeight,
      record,
      backtest,
      altShare: TARGET_WEIGHT_ALT_SHARE_RECORD,
      live,
      liveMinWeeks: TARGET_WEIGHT_LIVE_MIN_WEEKS,
      recordSource: live && live.nWeeks >= TARGET_WEIGHT_LIVE_MIN_WEEKS ? "live" : "backtest",
      renderable: blockedReason === null,
      blockedReason,
      asOf: now,
      orderExecution: false,
    };
  }
}
