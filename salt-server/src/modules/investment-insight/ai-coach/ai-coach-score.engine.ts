import type {
  AICoachContext,
  Candidate,
  ScoredCandidate,
  ScoreFactor,
  SymbolFeature,
} from "./ai-coach.types";

export class AICoachScoreEngine {
  scoreCandidate(ctx: AICoachContext, candidate: Candidate): ScoredCandidate {
    const feature = ctx.symbolFeatures.get(candidate.symbol);

    const positiveFactors: ScoreFactor[] = [];
    const negativeFactors: ScoreFactor[] = [];

    let score = 0;

    if (!feature) {
      return {
        ...candidate,
        score: 0,
        positiveFactors,
        negativeFactors,
      };
    }

    switch (candidate.action) {
      case "buy":
        score += this.scoreBuy(ctx, feature, positiveFactors, negativeFactors);
        break;
      case "sell":
        score += this.scoreSell(ctx, feature, positiveFactors, negativeFactors);
        break;
      case "hold":
        score += this.scoreHold(ctx, feature, positiveFactors, negativeFactors);
        break;
      case "rebalance":
        score += this.scoreRebalance(
          ctx,
          feature,
          positiveFactors,
          negativeFactors,
        );
        break;
    }

    return {
      ...candidate,
      score: Math.max(0, Math.round(score)),
      positiveFactors,
      negativeFactors,
    };
  }

  private scoreBuy(
    ctx: AICoachContext,
    feature: SymbolFeature,
    positive: ScoreFactor[],
    negative: ScoreFactor[],
  ): number {
    let score = 20;

    const holdingWeight = this.getHoldingWeight(ctx, feature.symbol);

    if (feature.buyZoneInsight) {
      const add = Math.min(
        18,
        Math.round((feature.buyZoneInsight.severity ?? 50) / 5),
      );
      score += add;
      positive.push({
        key: "buy_zone",
        score: add,
        message: `${feature.symbol} 스마트 매수 구간 신호`,
      });
    }

    const rsi = feature.indicator?.rsi14;
    if (rsi != null) {
      if (rsi < 30) {
        const add = Math.min(20, Math.round((30 - rsi) * 1.5));
        score += add;
        positive.push({
          key: "rsi_oversold",
          score: add,
          message: `RSI ${rsi.toFixed(1)} 과매도`,
        });
      } else if (rsi > 65) {
        const minus = Math.min(18, Math.round((rsi - 65) * 1.5));
        score -= minus;
        negative.push({
          key: "rsi_hot",
          score: -minus,
          message: `RSI ${rsi.toFixed(1)} 과열 구간 접근`,
        });
      }
    }

    const ma20 = feature.indicator?.ma20;
    const currentPrice = feature.currentPrice ?? 0;
    if (ma20 != null && ma20 > 0 && currentPrice > 0) {
      const diffPct = ((currentPrice - ma20) / ma20) * 100;

      if (diffPct < -3) {
        const add = Math.min(12, Math.round(Math.abs(diffPct)));
        score += add;
        positive.push({
          key: "below_ma20",
          score: add,
          message: `MA20 대비 ${Math.abs(diffPct).toFixed(1)}% 하단`,
        });
      } else if (diffPct > 5) {
        const minus = Math.min(10, Math.round(diffPct));
        score -= minus;
        negative.push({
          key: "above_ma20",
          score: -minus,
          message: `MA20 대비 ${diffPct.toFixed(1)}% 상단`,
        });
      }
    }

    const fearGreed = feature.sentiment?.fearGreedIndex;
    if (fearGreed != null) {
      if (fearGreed < 30) {
        const add = Math.min(10, Math.round((30 - fearGreed) / 2));
        score += add;
        positive.push({
          key: "fear_market",
          score: add,
          message: `공포지수 ${fearGreed}`,
        });
      } else if (fearGreed > 70) {
        const minus = Math.min(10, Math.round((fearGreed - 70) / 2));
        score -= minus;
        negative.push({
          key: "greedy_market",
          score: -minus,
          message: `공포지수 ${fearGreed} (과열 심리)`,
        });
      }
    }

    const news = ctx.newsAnalysisMap?.get(feature.symbol);
    if (news) {
      if (news.sentiment === "bullish") {
        const add = Math.min(15, Math.round(news.score / 8));
        score += add;
        positive.push({
          key: "news_bullish",
          score: add,
          message: news.summary,
        });
      } else if (news.sentiment === "bearish") {
        const minus = Math.min(15, Math.round(Math.abs(news.score) / 8));
        score -= minus;
        negative.push({
          key: "news_bearish",
          score: -minus,
          message: news.summary,
        });
      }
    }

    const whaleNet = this.getWhaleNet(feature);
    if (whaleNet > 0) {
      const add = Math.min(15, this.scaleWhaleScore(whaleNet));
      score += add;
      positive.push({
        key: "whale_buy",
        score: add,
        message: `${feature.symbol} 고래 순매수`,
      });
    } else if (whaleNet < 0) {
      const minus = Math.min(15, this.scaleWhaleScore(Math.abs(whaleNet)));
      score -= minus;
      negative.push({
        key: "whale_sell",
        score: -minus,
        message: `${feature.symbol} 고래 순매도`,
      });
    }

    if (ctx.marketRegime === "panic") {
      score += 8;
      positive.push({
        key: "panic_regime",
        score: 8,
        message: "시장 공포 구간에서 분할 진입 우위",
      });
    }

    if (ctx.marketRegime === "bullish") {
      score += 6;
      positive.push({
        key: "bullish_regime",
        score: 6,
        message: "시장 상승 추세",
      });
    }

    if (ctx.marketRegime === "bearish") {
      score -= 10;
      negative.push({
        key: "bearish_regime",
        score: -10,
        message: "시장 하락 추세",
      });
    }

    if (ctx.marketRegime === "euphoric") {
      score -= 12;
      negative.push({
        key: "euphoric_regime",
        score: -12,
        message: "시장 과열 구간",
      });
    }

    if (holdingWeight >= ctx.maxWeight * 0.9) {
      score -= 20;
      negative.push({
        key: "position_limit",
        score: -20,
        message: `${feature.symbol} 비중이 이미 높음`,
      });
    }

    if (ctx.portfolioState.riskLevel === "high") {
      score -= 10;
      negative.push({
        key: "portfolio_concentration",
        score: -10,
        message: "포트폴리오 집중도 높음",
      });
    }

    const behaviorPenalty = this.behaviorPenalty(ctx);
    if (behaviorPenalty > 0) {
      score -= behaviorPenalty;
      negative.push({
        key: "behavior_penalty",
        score: -behaviorPenalty,
        message: "최근 감정적 거래 패턴 감지",
      });
    }

    return score;
  }

  private scoreSell(
    ctx: AICoachContext,
    feature: SymbolFeature,
    positive: ScoreFactor[],
    negative: ScoreFactor[],
  ): number {
    let score = 20;

    const rsi = feature.indicator?.rsi14;
    if (rsi != null && rsi > 70) {
      const add = Math.min(20, Math.round((rsi - 70) * 1.5));
      score += add;
      positive.push({
        key: "rsi_overbought",
        score: add,
        message: `RSI ${rsi.toFixed(1)} 과열`,
      });
    }

    const profitRate = Number(feature.holding?.unrealizedProfitRate ?? 0);
    if (profitRate >= 0.12) {
      const add = Math.min(18, Math.round(profitRate * 100));
      score += add;
      positive.push({
        key: "profit_taking",
        score: add,
        message: `평가수익 ${(profitRate * 100).toFixed(1)}%`,
      });
    }

    const news = ctx.newsAnalysisMap?.get(feature.symbol);
    if (news) {
      if (news.sentiment === "bearish") {
        const add = Math.min(15, Math.round(Math.abs(news.score) / 8));
        score += add;
        positive.push({
          key: "news_bearish",
          score: add,
          message: news.summary,
        });
      }
    }

    const whaleNet = this.getWhaleNet(feature);
    if (whaleNet < 0) {
      const add = Math.min(15, this.scaleWhaleScore(Math.abs(whaleNet)));
      score += add;
      positive.push({
        key: "whale_sell",
        score: add,
        message: `${feature.symbol} 고래 순매도`,
      });
    }

    if (ctx.marketRegime === "euphoric") {
      score += 10;
      positive.push({
        key: "euphoric_regime",
        score: 10,
        message: "시장 과열 구간",
      });
    }

    if (ctx.portfolioState.largestAsset === feature.symbol) {
      const weight = this.getHoldingWeight(ctx, feature.symbol);
      if (weight >= ctx.maxWeight) {
        score += 14;
        positive.push({
          key: "concentration_relief",
          score: 14,
          message: `${feature.symbol} 비중이 높아 일부 축소 필요`,
        });
      }
    }

    if (profitRate < 0 && whaleNet > 0 && ctx.marketRegime === "panic") {
      score -= 10;
      negative.push({
        key: "premature_sell",
        score: -10,
        message: "공포 구간 + 고래 매수에서 성급한 매도 위험",
      });
    }

    return score;
  }

  private scoreHold(
    ctx: AICoachContext,
    feature: SymbolFeature,
    positive: ScoreFactor[],
    negative: ScoreFactor[],
  ): number {
    let score = 35;

    const rsi = feature.indicator?.rsi14;
    if (rsi != null && rsi >= 40 && rsi <= 60) {
      score += 8;
      positive.push({
        key: "neutral_rsi",
        score: 8,
        message: `RSI ${rsi.toFixed(1)} 중립`,
      });
    }

    if (ctx.marketRegime === "sideways" || ctx.marketRegime === "bearish") {
      score += 8;
      positive.push({
        key: "wait_market",
        score: 8,
        message: "지금은 관망이 유리한 시장 상태",
      });
    }

    const whaleNet = this.getWhaleNet(feature);
    if (Math.abs(whaleNet) < 1_000_000_000) {
      score += 5;
      positive.push({
        key: "neutral_whale",
        score: 5,
        message: "고래 흐름이 중립적",
      });
    }

    const profitRate = Number(feature.holding?.unrealizedProfitRate ?? 0);
    if (profitRate > 0.2) {
      score -= 6;
      negative.push({
        key: "too_profitable_to_hold",
        score: -6,
        message: "차익실현 후보일 수 있음",
      });
    }

    return score;
  }

  private scoreRebalance(
    ctx: AICoachContext,
    feature: SymbolFeature,
    positive: ScoreFactor[],
    negative: ScoreFactor[],
  ): number {
    let score = 20;

    if (ctx.portfolioState.riskLevel === "high") {
      score += 20;
      positive.push({
        key: "high_concentration",
        score: 20,
        message: "포트폴리오 집중도가 높음",
      });
    } else if (ctx.portfolioState.riskLevel === "medium") {
      score += 10;
      positive.push({
        key: "medium_concentration",
        score: 10,
        message: "포트폴리오 집중도가 다소 높음",
      });
    }

    const weight = this.getHoldingWeight(ctx, feature.symbol);
    if (weight >= ctx.maxWeight) {
      score += 18;
      positive.push({
        key: "largest_asset_trim",
        score: 18,
        message: `${feature.symbol} 비중 축소형 리밸런싱 필요`,
      });
    }

    const behaviorPenalty = this.behaviorPenalty(ctx);
    if (behaviorPenalty > 0) {
      score += 6;
      positive.push({
        key: "behavior_reset",
        score: 6,
        message: "감정적 거래를 줄이기 위해 리밸런싱이 유효",
      });
    }

    return score;
  }

  private getHoldingWeight(ctx: AICoachContext, symbol: string): number {
    const holding = ctx.symbolFeatures.get(symbol)?.holding;
    if (!holding || ctx.portfolioState.totalValue <= 0) return 0;
    return Number(holding.currentValue ?? 0) / ctx.portfolioState.totalValue;
  }

  private getWhaleNet(feature: SymbolFeature): number {
    const buy = Number(feature.whaleFlow?.buy ?? 0);
    const sell = Number(feature.whaleFlow?.sell ?? 0);
    return buy - sell;
  }

  private scaleWhaleScore(amount: number): number {
    if (amount >= 50_000_000_000) return 15;
    if (amount >= 20_000_000_000) return 12;
    if (amount >= 10_000_000_000) return 9;
    if (amount >= 5_000_000_000) return 6;
    if (amount >= 1_000_000_000) return 3;
    return 1;
  }

  private behaviorPenalty(ctx: AICoachContext): number {
    if (!ctx.behaviorInsights.length) return 0;

    const maxSeverity = Math.max(
      ...ctx.behaviorInsights.map((b) => Number(b.severity ?? 0)),
    );

    if (maxSeverity >= 80) return 12;
    if (maxSeverity >= 60) return 8;
    if (maxSeverity >= 40) return 5;
    return 2;
  }
}
