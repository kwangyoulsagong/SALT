import { logger } from "../config/logger";
import { appKrStockService } from "./app-kr-stock.service";
import type { HomeMarketEvent, HomeMarketItem, HomeMarketVM } from "./home-card.viewmodel";
import type { KrMarketSummaryVM, KrSummaryItemVM } from "./kr-stock.viewmodel";
import { marketOverviewService } from "./market-overview.service";
import type { MarketSummaryItemVM, MarketSummaryVM } from "./market-summary.viewmodel";

/**
 * 홈 시장 블록(`BFF-REQ-046` FR-14, 2026-11-26 사용자 "대시보드가 비어 있다 · 정보가 적다") — 개인 기록이 없어도 늘 차는 칸.
 * **무엇을 보일지 BFF 가 고른다**(`done-checklist.md` §2-2 — 프론트에 정하지 않는다): 국내 지수 둘(서버 요약 순서) · 코인 대표 둘(대표 칸 + 첫 칸) ·
 * 국내 공개 일정 셋(서버가 날짜 순으로 준다). 값 · 순서는 원천 그대로(계산 0). 원천 하나가 실패하면 그 줄만 빠지고 `degraded`
 */
export const HOME_MARKET_INDEX_LIMIT = 2;
export const HOME_MARKET_COIN_LIMIT = 2;
export const HOME_MARKET_EVENT_LIMIT = 3;

const uniqueBySymbol = <T extends { symbol: string }>(items: T[]): T[] => {
  const seen = new Set<string>();
  return items.filter((item) => (seen.has(item.symbol) ? false : (seen.add(item.symbol), true)));
};

export const toHomeMarketIndices = (summary: KrMarketSummaryVM): HomeMarketItem[] =>
  uniqueBySymbol([summary.featured, ...summary.items].filter((i): i is KrSummaryItemVM => i !== null && i.kind === "index"))
    .slice(0, HOME_MARKET_INDEX_LIMIT)
    .map((i) => ({
      symbol: i.symbol,
      name: i.name,
      kind: "index",
      logoUrl: null,
      currentPrice: i.currentPrice,
      changeRate: i.change24h,
      sparkline: i.sparkline,
      href: null,
    }));

export const toHomeMarketCoins = (summary: MarketSummaryVM): HomeMarketItem[] =>
  uniqueBySymbol([summary.featured, ...summary.items].filter((i): i is MarketSummaryItemVM => i !== null))
    .slice(0, HOME_MARKET_COIN_LIMIT)
    .map((i) => ({
      symbol: i.symbol,
      name: i.name,
      kind: "coin",
      logoUrl: i.logoUrl || null,
      currentPrice: i.currentPrice,
      changeRate: i.change24h,
      sparkline: i.sparkline,
      href: `/investments/${encodeURIComponent(i.symbol)}`,
    }));

export const toHomeMarketEvents = (summary: KrMarketSummaryVM): HomeMarketEvent[] =>
  summary.schedule.slice(0, HOME_MARKET_EVENT_LIMIT).map((e) => ({ kind: e.kind, eventAt: e.eventAt, daysUntil: e.daysUntil }));

class AppHomeMarketService {
  async getMarket(token: string): Promise<HomeMarketVM> {
    const [kr, coin] = await Promise.allSettled([appKrStockService.getSummary(token), marketOverviewService.getSummary()]);
    const krSummary = kr.status === "fulfilled" && kr.value.status === "ok" ? kr.value : null;
    const coinSummary = coin.status === "fulfilled" ? coin.value : null;
    if (kr.status === "rejected") logger.warn("home market: kr summary failed", { reason: (kr.reason as Error)?.message });
    if (coin.status === "rejected") logger.warn("home market: coin summary failed", { reason: (coin.reason as Error)?.message });
    return {
      items: [...(krSummary ? toHomeMarketIndices(krSummary) : []), ...(coinSummary ? toHomeMarketCoins(coinSummary) : [])],
      events: krSummary ? toHomeMarketEvents(krSummary) : [],
      degraded: !krSummary || !coinSummary || Boolean(krSummary.degraded) || Boolean(coinSummary.degraded),
    };
  }
}

export const appHomeMarketService = new AppHomeMarketService();
