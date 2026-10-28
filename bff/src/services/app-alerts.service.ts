import { backendApi } from "./backend-api.service";
import { ALERT_LIMIT, toAlertViewModels, type AlertsVM } from "./alerts.viewmodel";

class AppAlertsService {
  async getAlerts(token: string): Promise<AlertsVM> {
    const [notifications, unread] = await Promise.all([
      backendApi.proxyAuthRequest(
        "GET",
        `/investment-notifications?page=1&size=${ALERT_LIMIT}`,
        token,
      ),
      backendApi.proxyAuthRequest(
        "GET",
        "/investment-notifications/unread-count",
        token,
      ),
    ]);

    const items = notifications.data?.data?.items;
    const unreadCount = unread.data?.data?.unreadCount;
    return {
      alerts: toAlertViewModels(Array.isArray(items) ? items : []),
      unreadCount: typeof unreadCount === "number" ? unreadCount : 0,
    };
  }
}

export const appAlertsService = new AppAlertsService();
