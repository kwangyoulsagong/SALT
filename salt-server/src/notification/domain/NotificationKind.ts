/**
 * 알림 종류 — **`signal_update` 하나**다 (`SRV-REQ-008` FR-20).
 *
 * 지표 · 추천이 바뀌었으니 확인하라는 알림이다. 원인은 F004 추천 행동 변경과 F003 주간 밴드
 * 변경 둘이고(`SRV-REQ-028` FR-90), 어느 쪽인지는 `messageCode` 가 가른다 — 종류를 늘리지 않는다.
 * 세금 D-Day(`tax_deadline`)는 ADR-002 로 사라졌고 뉴스 북마크는 알림이 아니다(FR-93).
 */
export const NOTIFICATION_KINDS = ["signal_update"] as const;

export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export const isNotificationKind = (value: string): value is NotificationKind =>
  (NOTIFICATION_KINDS as readonly string[]).includes(value);
