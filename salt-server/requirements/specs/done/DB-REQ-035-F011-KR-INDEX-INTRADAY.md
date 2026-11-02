---
id: DB-REQ-035
feature: F011
area: db
kind: DATA
title: "국내 지수 장중 분 기록 — 요약 띠 스파크라인"
priority: high
created: 2026-10-30
status: done (2026-11-02)
source: salt-server/requirements/specs/in-progress/SRV-REQ-042-F011-KR-MARKET-SUMMARY.md
---

## Summary

`kr_index_quotes` 는 지수 코드당 **최신 한 행**이라(덮어쓰기) 장중 선을 그릴 수 없다. 매분 수집 회차가 이미 돌므로 그 값을 쌓는다.

> **구현 2026-11-02** (`feat/kr-market-summary`, 마이그레이션 `20261102160000_kr_index_ticks` · `20261102160100_kr_index_quote_range`, 로컬 DB 적용).
> 검증 `salt-server/requirements/reports/checklists/DB-REQ-035.md`. FR-2 보존은 "3거래일"을 **달력 10일**로 옮겼다(긴 연휴에도 3거래일 이상) · FR-5 추가.

## FR

| FR | 내용 | 상태 |
|---|---|---|
| FR-1 | `kr_index_ticks(code, at, value Decimal(18,4), PRIMARY KEY (code, at))` — `at` 은 분 단위로 내린 UTC. 같은 분 두 번 = 1행(upsert) | **완료** — `date_trunc('minute', …)` + `ON CONFLICT DO UPDATE`. 쓰는 곳은 지수 회차(`PollKrIndices`) **정규장 · 종가 단일가 회차만**(장전 · 장후엔 지수가 안 움직인다) |
| FR-2 | 보존 ~~3거래일 — 정리는 기존 정리 워커에 나눠 지우기~~ **정정 2026-11-02: 달력 10일 · 장 마감 뒤 15:50 KST 하루 한 번(`kr-index-ticks-prune`) 한 문장 DELETE** — 하루 약 780행이라 나눠 지울 크기가 아니다(`performance-database.md` §8 은 대량 정리 규칙) | **완료** |
| FR-3 | 읽기 — `(code, at)` PK 로 오늘 개장 이후 범위 조회. 지수 2종 × 390분 ≈ 780행/일 | **완료** — "오늘"이 아니라 **지수마다 마지막 기록의 KST 날짜**(장 전 · 휴장엔 직전 거래일 선). `EXPLAIN` PK 역순 1행 + 범위 스캔 0.18ms |
| FR-4 | 마이그레이션 1개 = 테이블 추가만(되돌리기 = 테이블 삭제, 원장 무관) | **완료** |
| FR-5 | (2026-11-02 추가) `kr_index_quotes` 에 `high` · `low`(포인트 `Decimal(18,4)`) · `trade_value`(원 `Decimal(38,10)`) nullable — 대표 칸 아래 줄(`SRV-REQ-042` FR-2). KIS 지수 응답이 이미 주던 값(`bstp_nmix_hgpr` · `lwpr` · `acml_tr_pbmn` 백만 원)을 버리고 있었다. 별도 마이그레이션(목적 하나씩), 되돌리기 = 열 삭제 | **완료** |

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-30 | 신규(to-do) |
| 2026-11-02 | 구현 · done. FR-2 보존을 달력 10일 · 하루 한 번 정리로 정정, FR-3 "오늘" → 마지막 기록 날짜, FR-5(지수 고가 · 저가 · 거래대금 열) 추가. 원장 3종 무관 |
