---
id: DB-REQ-035
feature: F011
area: db
kind: DATA
title: "국내 지수 장중 분 기록 — 요약 띠 스파크라인"
priority: high
created: 2026-10-30
source: salt-server/requirements/specs/to-do/SRV-REQ-042-F011-KR-MARKET-SUMMARY.md
---

## Summary

`kr_index_quotes` 는 지수 코드당 **최신 한 행**이라(덮어쓰기) 장중 선을 그릴 수 없다. 매분 수집 회차가 이미 돌므로 그 값을 쌓는다.

## FR

| FR | 내용 |
|---|---|
| FR-1 | `kr_index_ticks(code, at, value Decimal(18,4), PRIMARY KEY (code, at))` — `at` 은 분 단위로 내린 UTC. 같은 분 두 번 = 1행(upsert) |
| FR-2 | 보존 3거래일 — 정리는 기존 정리 워커에 나눠 지우기(`performance-database.md` §8) |
| FR-3 | 읽기 — `(code, at)` PK 로 오늘 개장 이후 범위 조회. 지수 2종 × 390분 ≈ 780행/일 |
| FR-4 | 마이그레이션 1개 = 테이블 추가만(되돌리기 = 테이블 삭제, 원장 무관) |

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-30 | 신규(to-do) |
