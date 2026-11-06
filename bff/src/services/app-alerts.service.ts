import { backendApi } from "./backend-api.service";
import { ALERT_LIMIT, toAlertViewModels, type AlertsVM } from "./alerts.viewmodel";

/**
 * 알림 (`/api/app/alerts` · `/api/app/me/notifications`). 서버는 Kotlin `notification` 서비스(`SRV-REQ-048` FR-5, 서버 S2c) —
 * 라우팅 표 `config/server-routes.json` `/notifications` → platform. 옛 Express `/investment-notifications` 는 은퇴(소비처가 이 파일 하나였다).
 */

/** 도메인별 알림 설정 — 순서 · 도메인 목록은 서버가 정한다(`BFF-REQ-046` FR-8). 화면은 이 순서로 그린다 */
export const NOTIFICATION_DOMAINS = ["invest", "savings", "household"] as const;

export type NotificationDomain = (typeof NOTIFICATION_DOMAINS)[number];

export interface NotificationPrefsVM {
  domains: Array<{ domain: NotificationDomain; enabled: boolean }>;
}

const isDomain = (value: unknown): value is NotificationDomain => (NOTIFICATION_DOMAINS as readonly unknown[]).includes(value);

/** 서버 모양 → 뷰모델. 모르는 도메인은 버린다(서버가 먼저 늘리면 화면은 다음 판까지 모른다 — 오류로 만들지 않는다) */
export const toNotificationPrefs = (data: unknown): NotificationPrefsVM => {
  const rows = (data as { domains?: unknown } | null)?.domains;
  return {
    domains: (Array.isArray(rows) ? rows : []).flatMap((row) => {
      const r = row as { domain?: unknown; enabled?: unknown };
      return isDomain(r.domain) ? [{ domain: r.domain, enabled: r.enabled === true }] : [];
    }),
  };
};

class AppAlertsService {
  async getAlerts(token: string): Promise<AlertsVM> {
    const [notifications, unread] = await Promise.all([
      backendApi.proxyAuthRequest("GET", `/notifications?page=1&size=${ALERT_LIMIT}`, token),
      backendApi.proxyAuthRequest("GET", "/notifications/unread-count", token),
    ]);

    const items = notifications.data?.data?.items;
    const unreadCount = unread.data?.data?.unreadCount;
    return {
      alerts: toAlertViewModels(Array.isArray(items) ? items : []),
      unreadCount: typeof unreadCount === "number" ? unreadCount : 0,
    };
  }

  async getPrefs(token: string): Promise<NotificationPrefsVM> {
    const { data } = await backendApi.proxyAuthRequest("GET", "/notifications/prefs", token);
    return toNotificationPrefs(data?.data);
  }

  /** 도메인 하나 켬/끔. 모르는 도메인 · 틀린 값은 서버가 400 — BFF 가 미리 거르지 않는다(규칙은 서버 한 곳) */
  async setPref(token: string, domain: string, enabled: unknown): Promise<NotificationPrefsVM> {
    const { data } = await backendApi.proxyAuthRequest("PUT", `/notifications/prefs/${encodeURIComponent(domain)}`, token, { enabled });
    return toNotificationPrefs(data?.data);
  }
}

export const appAlertsService = new AppAlertsService();
