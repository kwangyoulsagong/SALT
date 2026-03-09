import { backendApi } from "./backend-api.service";

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
}

export const appPortfolioService = new AppPortfolioService();
