import { backendApi } from "./backend-api.service";

class AppAlertsService {
  async getAlerts(token: string) {
    const [notifications, unread] = await Promise.all([
      backendApi.proxyAuthRequest(
        "GET",
        "/investment-notifications?page=1&size=20",
        token,
      ),
      backendApi.proxyAuthRequest(
        "GET",
        "/investment-notifications/unread-count",
        token,
      ),
    ]);

    return {
      notifications: notifications.data,
      unreadCount: unread.data,
    };
  }
}

export const appAlertsService = new AppAlertsService();
