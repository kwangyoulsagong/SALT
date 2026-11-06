/** 알림 설정 경로(`BFF-REQ-046` FR-8). 조회와 바꾸기(`features/toggle-alerts`)가 같이 쓴다 */
export const NOTIFICATION_ENDPOINTS = {
  prefs: "/api/app/me/notifications",
  pref: (domain: string) =>
    `/api/app/me/notifications/${encodeURIComponent(domain)}`,
} as const;
