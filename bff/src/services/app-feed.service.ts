import { backendApi } from "./backend-api.service";

class AppFeedService {
  async getFeed(token: string) {
    const [feed, topInsights] = await Promise.all([
      backendApi.proxyAuthRequest("GET", "/feed", token),
      backendApi.proxyAuthRequest("GET", "/investment-insight/top", token),
    ]);

    return {
      feed: feed.data,
      topInsights: topInsights.data,
    };
  }
}

export const appFeedService = new AppFeedService();
