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
| FR-3 | 권한 — market 쓰기 · forecast 는 FR-1 을 export 뷰 `market.v_universe_snapshot_export` 로만 읽기(`DB-REQ-036` 주인 표에 행). **뷰는 S5** — `market` 스키마가 S5 에 생긴다. 그때까지 표는 `public`(다른 market 표와 같은 자리), 예측의 읽기는 `DB-REQ-036` 부록 B 에 한 줄(B9 와 같은 처리) |

## 구현 (2026-11-11, `feat/f017-s1c-collection` `dfaaf395`)

| FR | 상태 | 무엇 |
|---|---|---|
| FR-1 | done | `market_universe_snapshot` — 출처 CHECK 4값 · 순위는 국내 시총 행만 · 불변 트리거(`judgment_ledger_immutable` 재사용 — UPDATE 시도 → 오류 확인) · 인덱스 `(asset_type, as_of_date)`. 첫 행 11-11: 코인 301 · 국내 50 |
| FR-2 | done | `price_fill_mark` — 쓰기는 `PrismaPriceFillMarkStore.advance` 한 문장 `ON CONFLICT … WHERE filled_through < EXCLUDED` (앞으로만 — 테스트) |
| FR-3 | S5 | 위 표 |

## Acceptance Criteria

- [x] 마이그레이션 목적 1개씩(`20261111090000` 스냅샷 · `20261111090100` 채운 위치) · 롤백 SQL 머리 · `EXPLAIN`(11-11): 위치 읽기 1.0ms · 스냅샷 직전 날 0.7ms(인덱스 역방향 1행). 행 수 ≤ 351 이라 바깥은 순차 — 하루 351행씩 늘면 PK 앞 열 `as_of_date` 가 받는다
- [x] 스냅샷 UPDATE 차단(실 DB 트랜잭션에서 UPDATE → `불변이다` 오류 · 되돌림) · 채운 위치 뒤로 가기 0(`catchUpPriceHistory.test.ts` 가짜 저장소 + 실 문장의 `WHERE`)
- [x] `DB-REQ-036` 부록 주인 표 갱신 — market 행에 둘

## 계약 영향

- `SRV-REQ-057` FR-2 · 4 · 7 · `FC-REQ-028` FR-5 · `DB-REQ-036`

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-11-10 | 신규(to-do) — `FEATURE-017` v2 FR-8 |
| 2026-11-11 | to-do → in-progress — FR-1 · 2 done(`dfaaf395`, 로컬 DB 적용). FR-3 export 뷰는 S5(`market` 스키마가 없다 — 부록 B9 와 같은 처리). 체크리스트 · 회고 신설 |
