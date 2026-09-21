import {
  DEFAULT_MAX_SINGLE_ASSET_WEIGHT,
  type Clock,
  type CoachMode,
  type CoachProfileStore,
  type MarketProbe,
  type ModeDecision,
  type PortfolioProbe,
  type SymbolJudgmentStore,
  type Zone,
} from "../domain";
import { collectJudgmentMaterials, judgeSymbol } from "./lib/judgeSymbols";
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
    private readonly clock: Clock = () => new Date()
  ) {}

  async execute(
    userId: string,
    query: SymbolCoachQuery
  ): Promise<SymbolCoachView> {
    const symbol = query.symbol.toUpperCase();
    const now = this.clock();

    const [materialsBySymbol, holding, profile] = await Promise.all([
      collectJudgmentMaterials(this.market, [symbol]),
      this.portfolio.getHolding(userId, symbol),
      this.profiles.findByUser(userId),
    ]);

    const materials = materialsBySymbol.get(symbol)!;
    const { quote, sentiment, indicator, whales } = materials;
    const { scalp, longTerm, whaleBuy, whaleSell, missingData } = judgeSymbol(
      symbol,
      materials,
      Boolean(holding)
    );

    // 게이트는 `preview` 에서도 생략하지 않는다 (`SRV-REQ-025` FR-49).
    // `zone` 도 싣는다 — 생략은 "할 수 있다"이고, 모양이 둘이 되면 소비처가 둘을 다룬다
    const [scalpView, longTermView, zones] = await Promise.all([
      attachJudgmentTrack(this.judgments, scalp),
      attachJudgmentTrack(this.judgments, longTerm),
      resolveZones(this.market, { symbol, holding, quote, now }),
    ]);

    const selectedMode: CoachMode = query.mode ?? "scalp";
    const modeDecision = selectedMode === "scalp" ? scalp : longTerm;

    return {
      symbol,
      mode: selectedMode,
      preview: Boolean(query.preview),
      headline: modeDecision.headline,
      modes: {
        scalp: { ...scalpView, zone: zones.scalp },
        longTerm: { ...longTermView, zone: zones.long_term },
      },
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
      disclaimer: JUDGMENT_DISCLAIMER,
    };
  }
}
