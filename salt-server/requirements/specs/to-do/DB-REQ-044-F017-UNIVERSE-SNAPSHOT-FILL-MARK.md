---
id: DB-REQ-044
feature: F017
area: db
kind: MIGRATION
title: "market — 추적 목록 일별 스냅샷(생존 편향 차단) · 5분봉 채운 위치"
priority: high
created: 2026-11-10
source: pm/requirements/specs/in-progress/FEATURE-017-ai-coach-best-case.md (v2 FR-8)
---

## Summary

`SRV-REQ-057` 의 저장 몫. 과거 검산 채점(`FC-REQ-028` FR-5)이 "그때 있던 종목"으로 표본을 고르려면 추적 목록의 과거가 있어야 한다 —
지금은 "지금 추적 중인 종목"만 있어서 폐지 · 밀려난 종목이 빠진다(코인 생존 편향 연 62% 추정, 리서치 `2026-11-10-v2-signal-validation.md` §2-1).
수집 따라잡기는 종목마다 어디까지 채웠는지 알아야 한다(`SRV-REQ-057` FR-2).

## FR

| FR | 내용 |
|---|---|
| FR-1 | **`market_universe_snapshot`** — `(as_of_date, asset_type, symbol)` PK · `source`(코인: 활성 원화 마켓 · 국내: `top_market_cap` · `holding` · `watch`) · `rank` nullable · `captured_at`. 불변(UPDATE 0 — 트리거) · 하루 한 번 · 재실행 `ON CONFLICT DO NOTHING`. 인덱스 `(asset_type, as_of_date)` |
| FR-2 | **`price_fill_mark`** — `(asset_type, symbol, timeframe)` PK · `filled_through timestamptz` · `updated_at`. 따라잡기가 한 문장 `UPDATE … FROM (VALUES …)` 로 앞으로만 옮긴다(`WHERE filled_through < excluded`) |
| FR-3 | 권한 — market 쓰기 · forecast 는 FR-1 을 export 뷰 `market.v_universe_snapshot_export` 로만 읽기(`DB-REQ-036` 주인 표에 행) |

## Acceptance Criteria

- [ ] 마이그레이션 목적 1개씩 · 롤백 SQL · `EXPLAIN` 첨부(따라잡기 읽기 · 스냅샷 as-of 읽기)
- [ ] 스냅샷 UPDATE 차단 트리거 테스트 · 채운 위치 뒤로 가기 0(테스트)
- [ ] `DB-REQ-036` 부록 주인 표 갱신

## 계약 영향

- `SRV-REQ-057` FR-2 · 4 · 7 · `FC-REQ-028` FR-5 · `DB-REQ-036`

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-11-10 | 신규(to-do) — `FEATURE-017` v2 FR-8 |
