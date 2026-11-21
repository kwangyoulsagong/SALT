import { backendApi } from "./backend-api.service";
import { ALERT_LIMIT, toAlertViewModels, toNextPage, type AlertsVM, type AlertUnreadVM } from "./alerts.viewmodel";

/**
 * 알림 (`/api/app/alerts` · `/api/app/me/notifications`). 서버는 Kotlin `notification` 서비스(`SRV-REQ-048` FR-5, 서버 S2c) —
 * 라우팅 표 `config/server-routes.json` `/notifications` → platform. 옛 Express `/investment-notifications` 는 은퇴(소비처가 이 파일 하나였다).
 * 웹 푸시(`BFF-REQ-056`, F019 순서 4) — `/api/app/me/push` 셋. 같은 라우팅 줄(`/notifications/push/*`)이라 표는 그대로.
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

/**
 * 웹 푸시 설정(`BFF-REQ-056` FR-1 · `SRV-REQ-062` FR-4) — 켜졌나 · 서버 공개키. 키가 문자열이 아니면 꺼짐으로(화면이 구독을 시도하지 않게).
 * 공개키는 비밀이 아니다 — 브라우저가 `applicationServerKey` 로 쓴다.
 */
export interface PushConfigVM {
  enabled: boolean;
  publicKey: string | null;
}

export const toPushConfig = (data: unknown): PushConfigVM => {
  const d = data as { enabled?: unknown; publicKey?: unknown } | null;
  const publicKey = typeof d?.publicKey === "string" && d.publicKey.length > 0 ? d.publicKey : null;
  return { enabled: d?.enabled === true && publicKey !== null, publicKey: d?.enabled === true ? publicKey : null };
};

/**
 * 이 기기 구독 — 브라우저 `PushSubscription.toJSON()` 에서 서버가 쓰는 세 칸만 넘긴다(`expirationTime` 등은 버린다).
 * 형식 · 허용 주소 판정은 서버 한 곳(400) — BFF 는 모양만 고른다.
 */
export const toPushSubscriptionBody = (body: unknown) => {
  const b = body as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } } | null;
  return { endpoint: b?.endpoint, keys: { p256dh: b?.keys?.p256dh, auth: b?.keys?.auth } };
};

const readUnread = (data: unknown): number => {
  const n = (data as { data?: { unreadCount?: unknown } } | null)?.data?.unreadCount;
  return typeof n === "number" ? n : 0;
};

class AppAlertsService {
  /** 목록 한 쪽 + 안 읽은 수(`BFF-REQ-027` FR-90). 쪽은 1부터 — 첫 쪽은 화면 서버 컴포넌트, 다음 쪽은 브라우저(`FE-REQ-032` FR-64) */
  async getAlerts(token: string, page = 1): Promise<AlertsVM> {
    const [notifications, unread] = await Promise.all([
      backendApi.proxyAuthRequest("GET", `/notifications?page=${page}&size=${ALERT_LIMIT}`, token),
      backendApi.proxyAuthRequest("GET", "/notifications/unread-count", token),
    ]);

    const body = notifications.data?.data;
    const items = body?.items;
    return {
      alerts: toAlertViewModels(Array.isArray(items) ? items : []),
      unreadCount: readUnread(unread.data),
      nextPage: toNextPage(body?.page, body?.size, body?.total),
    };
  }

  /** 벨 배지(`BFF-REQ-027` FR-91) — 목록에 보이는 것과 같은 범위(켠 도메인만)는 서버가 맞춘다 */
  async getUnreadCount(token: string): Promise<AlertUnreadVM> {
    const { data } = await backendApi.proxyAuthRequest("GET", "/notifications/unread-count", token);
    return { unreadCount: readUnread(data) };
  }

  /** 읽음 — 남의 알림 · 꺼진 도메인은 서버가 무시한다. 응답 본문 없음(204) */
  async markRead(token: string, id: string): Promise<void> {
    await backendApi.proxyAuthRequest("PATCH", `/notifications/${encodeURIComponent(id)}/read`, token);
  }

  async markAllRead(token: string): Promise<void> {
    await backendApi.proxyAuthRequest("PATCH", "/notifications/read-all", token);
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

  async getPushConfig(token: string): Promise<PushConfigVM> {
    const { data } = await backendApi.proxyAuthRequest("GET", "/notifications/push/config", token);
    return toPushConfig(data?.data);
  }

  /** 넣기 · 대조(앱이 열릴 때마다) — 서버가 꺼져 있으면 503 이 그대로 간다 */
  async savePushSubscription(token: string, body: unknown): Promise<void> {
    await backendApi.proxyAuthRequest("PUT", "/notifications/push/subscription", token, toPushSubscriptionBody(body));
  }

  async removePushSubscription(token: string, endpoint: unknown): Promise<void> {
    await backendApi.proxyAuthRequest("DELETE", "/notifications/push/subscription", token, { endpoint });
  }
}

export const appAlertsService = new AppAlertsService();
