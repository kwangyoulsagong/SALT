import { backendApi } from "./backend-api.service";
import { upbitWSService } from "./upbit-ws.service";

class MarketOverviewService {
  async getOverview(query: any) {
    // 1) 백엔드에서 Market 목록 + 페이징 + 정렬 정보 가져오기
    const { items, pagination } = await backendApi.getMarketOverview(query);

    // 2) BFF WebSocket 캐시에서 실시간 가격 가져오기
    const priceCache = upbitWSService.getPriceCache();

    // 3) Market + Price Merge
    const enriched = items.map((m: any) => {
      const live = priceCache.get(m.symbol);
      return {
        ...m,
        currentPrice: live?.currentPrice ?? null,
        change24h: live?.change24h ?? null,
      };
    });

    return { items: enriched, pagination };
  }
  async getSymbols() {
    const response = await backendApi.getMarketSymbols(); // BFF → Backend 요청
    return response;
  }
}

export const marketOverviewService = new MarketOverviewService();
