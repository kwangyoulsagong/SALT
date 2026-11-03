-- 옛 목표 표 삭제 — 목표는 Kotlin savings 서비스(savings.goal · deposit)가 주인이다(SRV-REQ-045 · DB-REQ-037 FR-11 · msa-services §7 ⑦).
-- 데이터는 savings-import.sql 로 옮겼고 대조했다(목표 1 · 적립 0). 삭제 전 덤프: ~/salt-backups/2026-11-03-public-goals-before-drop.dump(복원 시험 통과).
-- 되돌리기: 덤프 복원(pg_restore -t goals -t saving_transactions) + 이 마이그레이션 이전 schema.prisma.

DROP TABLE "saving_transactions";
DROP TABLE "goals";
DROP TYPE "GoalCategory";
DROP TYPE "GoalStatus";
