-- 옛 알림 표 삭제 — 알림은 Kotlin notification 서비스(notification.notification)가 주인이다(SRV-REQ-048 FR-5 · DB-REQ-036 부록 notification · msa-services §7 ⑦, 서버 S2c).
-- 데이터는 salt-platform/db/notification-import.sql 로 옮겼고 대조했다(signal_update 행 수 같음). 삭제 전 덤프: ~/salt-backups/2026-11-06-public-notification-before-drop.dump.
-- 되돌리기: 덤프 복원(pg_restore -t '"InvestmentNotification"') + 이 마이그레이션 이전 schema.prisma.

DROP TABLE "InvestmentNotification";
