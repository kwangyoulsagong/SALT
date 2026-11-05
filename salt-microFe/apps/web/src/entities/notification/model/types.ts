/** 알림 도메인 — 서버(notification, `SRV-REQ-048` FR-5)가 정한 목록 · 순서. 화면은 받은 순서로 그린다(`FE-REQ-055` FR-6) */
export enum NotificationDomain {
  Invest = "invest",
  Savings = "savings",
  Household = "household",
}

export interface NotificationDomainPref {
  domain: NotificationDomain;
  enabled: boolean;
}

/** `GET /api/app/me/notifications` — BFF 뷰모델(`BFF-REQ-046` FR-8). 기본 꺼짐 */
export interface NotificationPrefs {
  domains: NotificationDomainPref[];
}
