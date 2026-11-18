/** 알림 경로(`BFF-REQ-046` FR-8 설정 · `BFF-REQ-027` FR-90 · 91 알림). 조회(엔티티)와 바꾸기(`features/toggle-alerts` · `mark-alert-read`)가 같이 쓴다 */
export const NOTIFICATION_ENDPOINTS = {
  prefs: "/api/app/me/notifications",
  pref: (domain: string) =>
    `/api/app/me/notifications/${encodeURIComponent(domain)}`,
  alerts: (page: number) => `/api/app/alerts?page=${page}`,
  read: (id: string) => `/api/app/alerts/${encodeURIComponent(id)}/read`,
  readAll: "/api/app/alerts/read-all",
} as const;
