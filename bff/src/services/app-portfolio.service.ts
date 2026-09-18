import { backendApi } from "./backend-api.service";
import { logger } from "../config/logger";
import {
  toPortfolioSummaryViewModel,
  type PortfolioSummaryVM,
  type ServerPortfolioSummary,
} from "./portfolio.viewmodel";

export type { PortfolioSummaryVM };

/** 이름을 붙이려고 읽는 시세 목록 크기. 실시간 테이블과 같은 상한이다. */
const NAME_LOOKUP_LIMIT = 100;

class AppPortfolioService {
  async getPortfolio(token: string) {
    const [holdings, stats, performance] = await Promise.all([
      backendApi.proxyAuthRequest("GET", "/portfolio/holdings", token),
      backendApi.proxyAuthRequest("GET", "/portfolio/stats", token),
      backendApi.proxyAuthRequest("GET", "/portfolio/performance", token),
    ]);

    return {
      holdings: holdings.data,
      stats: stats.data,
      performance: performance.data,
    };
  }

  /**
   * 홈 "주식" 섹션 요약.
   *
   * 서버는 **심볼만** 안다(`portfolio_holdings` 에 이름 컬럼이 없다). 사람이 읽는
   * 이름은 시세 목록에 있으므로 **BFF 가 붙인다** — 그게 조합 레이어의 일이고,
   * 서버가 `portfolio` → `market` 크로스 컨텍스트 조회를 하나 더 갖는 것보다 싸다.
   *
   * 둘을 **`allSettled`** 로 부른다. 이름 조회가 실패해도 금액은 내려보낸다 —
   * 이름이 없다고 보유가 없는 것은 아니다. 그때는 심볼을 이름 자리에 쓰고
   * `namesDegraded: true` 로 알린다.
   */
  async getSummary(token: string): Promise<PortfolioSummaryVM> {
    const [summaryResult, marketResult] = await Promise.allSettled([
      backendApi.proxyAuthRequest("GET", "/portfolio/summary", token),
      backendApi.getMarketOverview({ page: 1, limit: NAME_LOOKUP_LIMIT }),
    ]);

    if (summaryResult.status === "rejected") throw summaryResult.reason;

    const summary: ServerPortfolioSummary | undefined =
      summaryResult.value.data?.data;

    const nameBySymbol = new Map<string, string>();
    let namesDegraded = true;

    if (marketResult.status === "fulfilled") {
      namesDegraded = false;
      for (const asset of marketResult.value?.items ?? []) {
        if (asset?.symbol && asset?.koreanName) {
          nameBySymbol.set(String(asset.symbol).toUpperCase(), asset.koreanName);
        }
      }
    } else {
      logger.warn(
        "보유 요약에 종목명을 붙이지 못했다 — 심볼로 대체한다",
        marketResult.reason?.message
      );
    }

    return toPortfolioSummaryViewModel(summary, nameBySymbol, namesDegraded);
  }
}

export const appPortfolioService = new AppPortfolioService();
