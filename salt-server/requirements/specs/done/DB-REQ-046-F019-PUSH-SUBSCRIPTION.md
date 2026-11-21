---
id: DB-REQ-046
feature: F019
area: database
kind: SCHEMA
title: "notification.push_subscription · notification.pushed_at — 웹 푸시 기기 · 보낸 표시"
priority: high
created: 2026-11-21
status: done
source: "`SRV-REQ-062` 짝 — F019 순서 4"
---

## Summary

주인은 Kotlin `notification`(Flyway `V3__push_subscription.sql`). 다른 스키마 조인 0.

## FR

| FR | 내용 |
|---|---|
| FR-1 | `push_subscription(endpoint PK varchar(1024), user_id, p256dh, auth, created_at, last_seen_at)` · `user_id` 인덱스 · 표 주석 `record: 알림 받을 기기` |
| FR-2 | `notification.pushed_at timestamptz` · 이 판 전 행은 `pushed_at = created_at`(배포하자마자 지난 알림이 울리지 않게) · 부분 인덱스 `(created_at) WHERE pushed_at IS NULL` |
| FR-3 | 되돌리기: `DROP TABLE push_subscription; ALTER TABLE notification DROP COLUMN pushed_at;`(파일 머리) |

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-11-21 | 신규 · **done**(`feat/f019-s4-web-push`) — 로컬 운영 DB 적용(Flyway v3) · 테스트컨테이너 `./gradlew check` 통과. 루트 `F019-s4-web-push-slice.md` |
