---
id: DB-REQ-036
area: db
kind: ARCH
title: "서비스별 스키마 · DB 계정 — 테이블 하나에 주인 하나, Prisma → Flyway 주인 이전"
priority: high
created: 2026-10-30
source: requirements/decisions/ADR-006-server-msa-kotlin.md
---

## Summary

지금은 `public` 하나에 Prisma 모델 42개, `forecast` 스키마(테이블 24 · 뷰 13)가 같은 DB 계정으로 섞여 있다.
MSA(`ADR-006`)의 전제는 **테이블 하나에 주인 하나**다. 물리 DB 는 하나로 두고 **스키마 + 계정**으로 먼저 가른다.

## FR

| FR | 내용 |
|---|---|
| FR-1 | 스키마 9개 — `identity` · `savings` · `household` · `content` · `market` · `portfolio` · `coach` · `notification` · `forecast`. 서비스마다 DB 계정 하나, 자기 스키마만 쓰기 · 다른 스키마 권한 없음 |
| FR-2 | 테이블 → 주인 표를 이 REQ 부록으로 만든다(Prisma 모델 42개 전부). 주인 없는 테이블 0, 주인 둘 0. 동면 모듈(mission · dashboard · feed) 테이블은 "옮기지 않음"으로 표시 |
| FR-3 | 다른 스키마를 조인하는 쿼리 목록(grep 근거)을 만든다 — 각각 이벤트 · 프로젝션(`SRV-REQ-044`) 또는 export 뷰로 바꾼다. 이전 단계 S 번호를 붙인다 |
| FR-4 | 주인 이전 순서 — 경로가 Kotlin 으로 넘어가는 단계(S1~S6)에 그 테이블의 DDL 주인도 Prisma → Flyway. 한 테이블이 두 도구의 마이그레이션에 동시에 있지 않다 |
| FR-5 | Flyway baseline = 이전 시점 Prisma 마이그레이션 마지막 상태(`prisma migrate diff` 로 SQL 추출). 서비스별 `V1__baseline.sql` |
| FR-6 | `public` → 서비스 스키마 이동은 `ALTER TABLE ... SET SCHEMA` + 옛 이름 호환 뷰(1단계 동안)로. 되돌리기 = 역방향 `SET SCHEMA` |
| FR-7 | export 뷰 — `market.v_daily_close_export` · `market.v_holidays_export` · `market.v_kr_stock_master_export` · `coach.v_judgment_ledger_export`. forecast 는 이 뷰만 읽는다(`FC-REQ-025`) |
| FR-8 | 판정 원장 불변 트리거(UPDATE 차단)는 스키마 이동 뒤에도 남는다 — 이동 마이그레이션 테스트가 UPDATE 실패를 확인한다 |
| FR-9 | 금액 열은 NUMERIC 정밀도 그대로(Kotlin `BigDecimal`). 이동 중 타입 변경 0 |

## Acceptance Criteria

- [ ] 서비스 계정으로 다른 스키마 SELECT 가 권한 오류
- [ ] 주인 표에 42개 모델 전부 · 이중 주인 0
- [ ] 판정 원장 UPDATE 가 이동 뒤에도 실패
- [ ] 스키마 이동 마이그레이션 왕복(이동 → 되돌림) 테스트 통과

## 계약 영향

- 서버 `SRV-REQ-043`(플랫폼) · `SRV-REQ-049`(투자 이전) · 예측 `FC-REQ-025` · `ADR-007`

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-30 | 신규(to-do) |
