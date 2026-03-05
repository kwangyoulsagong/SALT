import prisma from "../../config/database";
import type { PortfolioTransaction, AssetType } from "@prisma/client";

const hoursAgo = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000);

type BehaviorPayload =
  | {
      kind: "over_trading";
      windowHours: number;
      trades: number;
      threshold: number;
      symbols: string[];
    }
  | {
      kind: "panic_sell";
      windowHours: number;
      sellCount: number;
      lossSellCount: number;
      avgSellLossRate: number; // 0~1
      examples: Array<{ symbol: string; lossRate: number; soldAt: Date }>;
    }
  | {
      kind: "chasing_high";
      windowHours: number;
      buyCount: number;
      highChaseCount: number;
      thresholdRatio: number; // ex 0.98
      examples: Array<{
        symbol: string;
        buyPrice: number;
        recentHigh: number;
        boughtAt: Date;
      }>;
    };

export class BehaviorAnalysisService {
  /**
   * 사용자 투자 행동 분석 → InvestmentInsight(behavior_analysis) upsert
   */
  async generateBehaviorAnalysis(userId: string) {
    const profile = await prisma.userInvestmentProfile.findUnique({
      where: { userId },
    });

    // 기본값(필요시 조정)
    const overTradingWindowHours = 24;
    const overTradingThreshold = 12;
    const panicSellWindowHours = profile?.panicSellWindowHours ?? 24;
    const chasingWindowHours = 48;
    const chasingThresholdRatio = 0.98;

    const since = hoursAgo(
      Math.max(
        overTradingWindowHours,
        panicSellWindowHours,
        chasingWindowHours,
      ),
    );

    const txs = await prisma.portfolioTransaction.findMany({
      where: {
        userId,
        transactionDate: { gt: since },
        assetType: "crypto" satisfies AssetType, // 우선 crypto만
      },
      orderBy: { transactionDate: "desc" },
      take: 200,
    });

    const results = await Promise.allSettled([
      this.detectOverTrading(
        userId,
        txs,
        overTradingWindowHours,
        overTradingThreshold,
      ),
      this.detectPanicSell(userId, txs, panicSellWindowHours),
      this.detectChasingHigh(
        userId,
        txs,
        chasingWindowHours,
        chasingThresholdRatio,
      ),
    ]);

    const insights = results
      .filter((r) => r.status === "fulfilled")
      .map((r) => (r as PromiseFulfilledResult<any>).value)
      .filter(Boolean);

    return insights;
  }

  private async upsertBehaviorInsight(
    userId: string,
    dedupeKey: string,
    title: string,
    summary: string,
    severity: number,
    confidence: number,
    payload: BehaviorPayload,
    ttlHours = 6,
  ) {
    return prisma.investmentInsight.upsert({
      where: {
        userId_type_dedupeKey: {
          userId,
          type: "behavior_analysis",
          dedupeKey,
        },
      },
      create: {
        userId,
        type: "behavior_analysis",
        title,
        summary,
        severity,
        confidence,
        payload,
        expiresAt: new Date(Date.now() + ttlHours * 60 * 60 * 1000),
      },
      update: {
        title,
        summary,
        severity,
        confidence,
        payload,
        expiresAt: new Date(Date.now() + ttlHours * 60 * 60 * 1000),
      },
    });
  }

  /**
   * 1) Over Trading: 최근 N시간 거래 횟수 과다
   */
  private async detectOverTrading(
    userId: string,
    txs: PortfolioTransaction[],
    windowHours: number,
    threshold: number,
  ) {
    const cutoff = hoursAgo(windowHours);
    const windowTxs = txs.filter((t) => t.transactionDate > cutoff);

    if (windowTxs.length < threshold) return null;

    const symbols = Array.from(new Set(windowTxs.map((t) => t.symbol))).slice(
      0,
      10,
    );

    const trades = windowTxs.length;

    const severity = Math.min(
      100,
      40 + Math.round(((trades - threshold) / threshold) * 60),
    );

    return this.upsertBehaviorInsight(
      userId,
      `overtrading:${windowHours}h`,
      "과다 거래 경고",
      `최근 ${windowHours}시간 동안 ${trades}회 거래가 감지되었습니다. (기준 ${threshold}회)`,
      severity,
      0.75,
      {
        kind: "over_trading",
        windowHours,
        trades,
        threshold,
        symbols,
      },
      6,
    );
  }

  /**
   * 2) Panic Sell: 최근 N시간 내 손실 매도 의심
   * - 현재 버전: 현재가 대비로 '손절성 매도' 시그널 추정
   * - 고도화: realizedProfit / averageBuyPrice 기반으로 정확한 손익 계산
   */
  private async detectPanicSell(
    userId: string,
    txs: PortfolioTransaction[],
    windowHours: number,
  ) {
    const cutoff = hoursAgo(windowHours);

    const sells = txs
      .filter((t) => t.transactionType === "sell")
      .filter((t) => t.transactionDate > cutoff);

    if (sells.length === 0) return null;

    const symbols = Array.from(new Set(sells.map((t) => t.symbol)));

    const market = await prisma.marketAsset.findMany({
      where: { symbol: { in: symbols } },
      select: { symbol: true, currentPrice: true },
    });

    const currentPriceMap = new Map(
      market.map((m) => [
        m.symbol,
        m.currentPrice ? Number(m.currentPrice) : null,
      ]),
    );

    const examples: Array<{ symbol: string; lossRate: number; soldAt: Date }> =
      [];
    let lossSellCount = 0;
    let lossSum = 0;

    for (const s of sells) {
      const current = currentPriceMap.get(s.symbol);
      if (!current || !s.price) continue;

      // 손실률 추정(현재가 대비 매도단가가 낮을수록 '손절성 매도' 가능성 ↑)
      const lossRate = Math.max(0, (current - s.price) / current); // 0~1

      if (lossRate >= 0.03) {
        lossSellCount++;
        lossSum += lossRate;

        if (examples.length < 5) {
          examples.push({
            symbol: s.symbol,
            lossRate,
            soldAt: s.transactionDate,
          });
        }
      }
    }

    if (lossSellCount === 0) return null;

    const avgSellLossRate = lossSum / lossSellCount;

    const severity = Math.min(
      100,
      45 + Math.round(avgSellLossRate * 200) + lossSellCount * 5,
    );

    return this.upsertBehaviorInsight(
      userId,
      `panicsell:${windowHours}h`,
      "패닉 셀 가능성",
      `최근 ${windowHours}시간 내 손실 매도 의심 거래가 ${lossSellCount}건 감지되었습니다.`,
      severity,
      0.65,
      {
        kind: "panic_sell",
        windowHours,
        sellCount: sells.length,
        lossSellCount,
        avgSellLossRate,
        examples,
      },
      6,
    );
  }

  /**
   * 3) Chasing High: 최근 N시간 내 “고점 근처에서 매수” 감지
   * - PriceHistory(5m) 기반 최근 고점 대비 매수단가가 높은지 확인
   */
  private async detectChasingHigh(
    userId: string,
    txs: PortfolioTransaction[],
    windowHours: number,
    thresholdRatio: number,
  ) {
    const cutoff = hoursAgo(windowHours);

    const buys = txs
      .filter((t) => t.transactionType === "buy")
      .filter((t) => t.transactionDate > cutoff);

    if (buys.length === 0) return null;

    const symbols = Array.from(new Set(buys.map((b) => b.symbol)));

    // ✅ 성능 개선: 600 row 가져와 max 계산 대신, DB aggregate로 max(close)
    const recentHighMap = new Map<string, number>();

    const highs = await Promise.allSettled(
      symbols.map(async (symbol) => {
        const agg = await prisma.priceHistory.aggregate({
          where: {
            symbol,
            timeframe: "5m",
            timestamp: { gt: cutoff },
          },
          _max: { close: true },
        });

        const maxClose = agg._max.close ? Number(agg._max.close) : null;
        return { symbol, maxClose };
      }),
    );

    highs.forEach((r) => {
      if (r.status === "fulfilled" && r.value.maxClose) {
        recentHighMap.set(r.value.symbol, r.value.maxClose);
      }
    });

    const examples: Array<{
      symbol: string;
      buyPrice: number;
      recentHigh: number;
      boughtAt: Date;
    }> = [];

    let highChaseCount = 0;

    for (const b of buys) {
      const recentHigh = recentHighMap.get(b.symbol);
      if (!recentHigh || !b.price) continue;

      if (b.price >= recentHigh * thresholdRatio) {
        highChaseCount++;

        if (examples.length < 5) {
          examples.push({
            symbol: b.symbol,
            buyPrice: b.price,
            recentHigh,
            boughtAt: b.transactionDate,
          });
        }
      }
    }

    if (highChaseCount === 0) return null;

    const ratio = highChaseCount / buys.length;
    const severity = Math.min(100, 40 + Math.round(ratio * 70));

    return this.upsertBehaviorInsight(
      userId,
      `chasinghigh:${windowHours}h`,
      "추격 매수 경고",
      `최근 ${windowHours}시간 내 고점 근처에서 매수가 ${highChaseCount}건 감지되었습니다.`,
      severity,
      0.7,
      {
        kind: "chasing_high",
        windowHours,
        buyCount: buys.length,
        highChaseCount,
        thresholdRatio,
        examples,
      },
      6,
    );
  }
}
