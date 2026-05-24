import { backendApi } from "./backend-api.service";

class AppHomeService {
  async getHome(token: string) {
    const [dashboard, topInsights, unreadNotifications, marketOverview] =
      await Promise.all([
        backendApi.proxyAuthRequest("GET", "/dashboard", token),
        backendApi.proxyAuthRequest("GET", "/investment-insight/top", token),
        backendApi.proxyAuthRequest(
          "GET",
          "/investment-notifications/unread-count",
          token,
        ),
        backendApi.getMarketOverview({ page: 1, limit: 20 }),
      ]);

    return {
      dashboard: dashboard.data,
      topInsights: topInsights.data,
      unreadNotifications: unreadNotifications.data,
      marketOverview: marketOverview,
    };
  }
}

export const appHomeService = new AppHomeService();
