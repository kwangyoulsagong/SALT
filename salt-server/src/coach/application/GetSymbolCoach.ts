import {
  DEFAULT_MAX_SINGLE_ASSET_WEIGHT,
  GAUGE_HORIZON_DAYS,
  gaugeBucketCode,
  gaugeBucketIndex,
  isForecastOwner,
  JUDGMENT_MODES,
  KrStockJudgmentNotAvailableError,
  toGaugeTrackRecord,
  type Clock,
  type CoachMode,
  type CoachProfileStore,
  type CoachSentiment,
  type ForecastReader,
  type GaugeTrackRecordView,
  type GaugeTrackStore,
  type MarketProbe,
  type ModeDecision,
  type PortfolioProbe,
  type SymbolJudgmentStore,
  type Zone,
} from "../domain";
import { collectJudgmentMaterials, indicatorFor, judgeSymbol, materialGuards } from "./lib/judgeSymbols";
import { DEFAULT_COACH_MODE } from "./ManageCoachProfile";
import {
  attachJudgmentTrack,
  JUDGMENT_DISCLAIMER,
  type ModeCoachView,
} from "./lib/judgmentTrack";
import { resolveZones } from "./lib/resolveZones";

/** 모드 하나의 화면 블록 — 판단 · 게이트 · 성적표에 `zone` 이 붙는다(`SRV-REQ-025` FR-44). */
export type SymbolModeView = ModeCoachView & { zone: Zone };

export interface SymbolCoachQuery {
  symbol: string;
  mode?: CoachMode;
  preview?: boolean;
  /** 보는 사람 이메일 — 국내 주식 종목은 소유자만(F011 §정책). 없으면 비소유자다 */
  viewerEmail?: string;
}

export interface SymbolCoachView {
  symbol: string;
  mode: CoachMode;
  preview: boolean;
  headline: string;
  /**
   * 두 모드 판단 + 게이트 + 성적표 + 실패사례 (F004 · `SRV-REQ-025` FR-40~43).
   * 화면은 이것을 읽는다. 아래 `modeDecision` · `dualDecision` 은 하위 호환이다.
   */
  modes: { scalp: SymbolModeView; longTerm: SymbolModeView };
  /**
   * 게이지 아래 한 줄 — 지금 구간에 있던 과거 날들의 30일 뒤 수익률 분포(B9).
   * **표본 0 인 게이지는 빠진다**(`SRV-REQ-025` FR-46). 지금은 `sentiment` 하나다.
   */
  gaugeTrackRecords: GaugeTrackRecordView[];
  modeDecision: ModeDecision;
  dualDecision: { scalp: ModeDecision; longTerm: ModeDecision };
  riskGuard: {
    hasHolding: boolean;
    holdingWeightLimit: number;
    currentValue: number;
    unrealizedProfitRate: number | null;
  };
  evidence: {
    price: number | null;
    change24h: number | null;
    sentiment: { score: number; label: string; calculatedAt: Date } | null;
    technical: { rsi: number | null; timestamp: Date } | null;
    whale: { buyAmountKRW: number; sellAmountKRW: number; count: number };
  };
  /** 빠진 재료. **숨기지 않고 내려보낸다** — 판단의 전제를 드러내는 값이다. */
  missingData: string[];
  dataFreshness: {
    priceUpdatedAt: Date | null;
    sentimentCalculatedAt: Date | null;
    indicatorTimestamp: Date | null;
    generatedAt: string;
  };
  /**
   * 거래소 표시(F010 슬라이스 6 · `SRV-REQ-024` FR-191 · 192). `warning` 이면 두 모드 다 `exchange_warning` 으로 막힌다.
   * `cautions` 만 켜졌으면 판정은 그대로 나가고 소비처가 한 줄로 알린다. 스냅샷이 없거나 3일 넘었으면 `null`
   */
  exchangeFlag: { warning: boolean; cautions: string[]; fetchedAt: string } | null;
  disclaimer: string;
}

/**
 * 종목 하나에 대한 두 모드 판단.
 *
 * 보유가 없어도 답한다 — 관심 종목을 훑어보는 화면이 이것을 쓴다. 그래서
 * `GenerateCoachRecommendation` 이 보유 없음으로 `null` 을 받을 때의 대체 경로이기도 하다.
 *
 * ## 지표 주기가 `m5` 로 고정됐다
 *
 * 원문은 `technicalIndicator` 를 주기 제한 없이 최신순으로 하나 읽었다. 그러면 같은
 * 심볼이 호출마다 `m5` 와 `h1` 중 아무거나 주고, RSI 과열 판정이 흔들린다.
 * `MarketProbe` 가 `m5` 로 고정한다 — 원문의 다른 경로(`ai-coach-feature.extractor`)가
 * 이미 `m5` 였으므로 **둘 중 하나를 고른 것**이고, 그 사실을 여기 적어 둔다.
 */
export class GetSymbolCoach {
  constructor(
    private readonly market: MarketProbe,
    private readonly portfolio: PortfolioProbe,
    private readonly profiles: CoachProfileStore,
    private readonly judgments: SymbolJudgmentStore,
    private readonly gauges: GaugeTrackStore,
    private readonly clock: Clock = () => new Date(),
    /** 보유 익절 계획의 실현 변동성(F010 슬라이스 2). 없으면 고정 비율 */
    private readonly forecasts: Pick<ForecastReader, "symbolRisk" | "marketWarnings"> | null = null,
    /** 국내 주식 판단을 볼 수 있는 이메일 — 시세 경로와 같은 목록(`FORECAST_OWNER_EMAILS`) */
    private readonly krViewerEmails: readonly string[] = []
  ) {}

  private async sentimentTrack(
    symbol: string,
    sentiment: CoachSentiment | undefined
  ): Promise<GaugeTrackRecordView[]> {
    if (!sentiment) return [];

    const value = sentiment.sentimentScore;
    const [stats, baseline] = await Promise.all([
      this.gauges.find(symbol, "sentiment", gaugeBucketCode(gaugeBucketIndex(value)), GAUGE_HORIZON_DAYS),
      this.gauges.baselinePositiveRate(symbol, "sentiment", GAUGE_HORIZON_DAYS),
    ]);
    const record = toGaugeTrackRecord(stats, value, baseline);
    return record ? [record] : [];
  }

  async execute(
    userId: string,
    query: SymbolCoachQuery
  ): Promise<SymbolCoachView> {
    const symbol = query.symbol.toUpperCase();
    const now = this.clock();

    const [materialsBySymbol, cryptoHolding, profile, risk, warnings] = await Promise.all([
      collectJudgmentMaterials(this.market, [symbol]),
      // 자산군은 시세를 읽어야 안다 — 코인 보유를 같이 읽고, 국내 주식이면 아래에서 그 자산군으로 한 번 더(행 1개 조회)
      this.portfolio.getHolding(userId, symbol),
      this.profiles.findByUser(userId),
      // 변동성이 실패해도 판단은 나간다 — 익절 계획만 고정 비율로
      this.forecasts ? this.forecasts.symbolRisk([symbol]).catch(() => null) : null,
      // 표시를 못 읽어도 판정은 나간다(FR-191) — 지금까지와 같은 화면. 모르는 것을 "유의"로 지어내지 않는다
      this.forecasts ? this.forecasts.marketWarnings([symbol]).catch(() => null) : null,
    ]);
    const flag = warnings?.get(symbol) ?? null;
    const warned = flag?.warning === true;

    const materials = materialsBySymbol.get(symbol)!;
    const { quote, sentiment, whales, assetClass } = materials;
    if (assetClass === "kr_stock" && !isForecastOwner(query.viewerEmail, this.krViewerEmails)) {
      throw new KrStockJudgmentNotAvailableError();
    }
    const holding =
      assetClass === "kr_stock" ? await this.portfolio.getHolding(userId, symbol, "kr_stock") : cryptoHolding;
    const { scalp, longTerm, whaleBuy, whaleSell, missingData } = judgeSymbol(
      symbol,
      materials,
      Boolean(holding)
    );

    // 점수는 그대로 계산하고 표시만 막는다 — 오래된 재료로 낸 판정을 오늘 것처럼 보이지 않는다(FR-194).
    // 막음 재료는 해설과 같은 함수다(국내 주식 거래일 신선도 · 연 모드 · 이력, F011 슬라이스 4)
    const guardsFor = (mode: CoachMode) => ({ exchangeWarning: warned, ...materialGuards(materials, mode, now) });

    // 게이트는 `preview` 에서도 생략하지 않는다 (`SRV-REQ-025` FR-49).
    // `zone` 도 싣는다 — 생략은 "할 수 있다"이고, 모양이 둘이 되면 소비처가 둘을 다룬다
    const [scalpView, longTermView, zones, gaugeTrackRecords] =
      await Promise.all([
        attachJudgmentTrack(this.judgments, scalp, guardsFor("scalp"), assetClass),
        attachJudgmentTrack(this.judgments, longTerm, guardsFor("long_term"), assetClass),
        resolveZones(this.market, {
          symbol,
          holding,
          quote,
          now,
          annualizedVolatility: risk?.get(symbol)?.annualized ?? null,
        }),
        this.sentimentTrack(symbol, sentiment),
      ]);

    // 요청 → 사용자가 고른 기본 모드 → 단타 (`SRV-REQ-025` FR-48 · B16). 국내 주식은 연 모드(장기)가 기본이다 —
    // 사용자의 기본 모드가 단타여도 열지 않은 모드를 먼저 보여 주지 않는다(F011 FR-63)
    const openModes = JUDGMENT_MODES[assetClass];
    const preferred = query.mode ?? profile?.defaultMode ?? DEFAULT_COACH_MODE;
    const selectedMode: CoachMode =
      query.mode ?? (openModes.includes(preferred) ? preferred : openModes[0]);
    const modeDecision = selectedMode === "scalp" ? scalp : longTerm;
    // 근거 · 신선도의 지표는 **고른 모드의 봉**이다(단타 1시간봉 · 장기 일봉)
    const indicator = indicatorFor(materials, selectedMode);

    return {
      symbol,
      mode: selectedMode,
      preview: Boolean(query.preview),
      headline: modeDecision.headline,
      modes: {
        scalp: { ...scalpView, zone: zones.scalp },
        longTerm: { ...longTermView, zone: zones.long_term },
      },
      gaugeTrackRecords,
      modeDecision,
      dualDecision: { scalp, longTerm },
      riskGuard: {
        hasHolding: Boolean(holding),
        holdingWeightLimit:
          profile?.maxSingleAssetWeight ?? DEFAULT_MAX_SINGLE_ASSET_WEIGHT,
        currentValue: holding?.currentValue ?? 0,
        unrealizedProfitRate: holding?.unrealizedProfitRate ?? null,
      },
      evidence: {
        price: quote?.currentPrice ?? null,
        change24h: quote?.change24h ?? null,
        sentiment: sentiment
          ? {
              score: sentiment.sentimentScore,
              label: sentiment.sentimentLabel,
              calculatedAt: sentiment.calculatedAt,
            }
          : null,
        technical: indicator
          ? {
              rsi: indicator.rsi14 === null ? null : Number(indicator.rsi14),
              timestamp: indicator.timestamp,
            }
          : null,
        whale: {
          buyAmountKRW: whaleBuy,
          sellAmountKRW: whaleSell,
          count: whales.length,
        },
      },
      missingData,
      dataFreshness: {
        priceUpdatedAt: quote?.priceUpdatedAt ?? null,
        sentimentCalculatedAt: sentiment?.calculatedAt ?? null,
        indicatorTimestamp: indicator?.timestamp ?? null,
        generatedAt: now.toISOString(),
      },
      exchangeFlag: flag
        ? { warning: flag.warning, cautions: flag.cautions, fetchedAt: flag.fetchedAt.toISOString() }
        : null,
      disclaimer: JUDGMENT_DISCLAIMER,
    };
  }
}
