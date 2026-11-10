---
id: DB-REQ-043
feature: F017
area: db
kind: MIGRATION
title: "AI 코치 — 해설 스냅샷 · 단타 확률 · 기저율 · 사건 종류 표와 계약 뷰"
priority: high
created: 2026-11-10
status: in-progress (2026-11-10 FR-6 출처 라벨 — 나머지 to-do)
source: pm/requirements/specs/in-progress/FEATURE-017-ai-coach-best-case.md
---

## Summary

`FEATURE-017` 의 저장 몫. 해설 스냅샷은 coach(Express Prisma — S6 이전 때 Flyway 로), 나머지는 forecast 스키마(서버 S5 전까지 DDL 은 `salt-server/prisma` 에서만 — 루트 `CLAUDE.md` · `ADR-007`).
요청 경로가 **저장값만 읽게** 하는 표들이다(`SRV-REQ-053` 불변식 1).

## FR

| FR | 내용 |
|---|---|
| FR-1 | **coach `explanation_snapshot`** — `(symbol, mode, fingerprint)` 유일 · `tier` · `sentences jsonb`(문장 · 인용 id — 쿼리 조건 아님) · `provider` · `verifier jsonb`(문장 수 · 탈락 · 대체 · 원문 0) · `generated_at`. 읽기 인덱스 `(symbol, mode, generated_at desc)`. 불변(UPDATE 0 — 새 지문 = 새 행) · 보존 종목 · 모드당 최근 N |
| FR-2 | **forecast `short_horizon_prediction`** — `(symbol, horizon, as_of, model_version)` PK · `p_up` · `q10` · `q50` · `q90` · `invalidation` · `available_at` · CHECK(분위 순서 · 0≤p≤1). 뷰 `v_short_horizon_card`(최신 · 시험 통과 표지 · 성적 · 빗나간 사례 · 지난 예측은 `renderable=false`) |
| FR-3 | **forecast `base_rate_stat`** — `(condition_id, symbol, horizon, as_of)` · 표본 · 오른 비율 · 평균 · 분위 · 보유 연장 분위. 조건 정의는 `preregistration`. 뷰 `v_base_rate` |
| FR-4 | **forecast 사건 종류** — 소식 행 → `event_kind` 매핑 표(`news_event_kind` — 원천 키 · 종류 · 규칙 버전) · 반응 통계는 `event_reaction_stats` 를 종류 축으로 넓힘(새 표 대신 열/키 추가 — 마이그레이션 때 정함) · 뷰 `v_news_reaction`(종류 · 수평선 · 표본 · 오른 비율 · 평균 · 선반영) |
| FR-6 | **v2 등급 · 출처 라벨** — `forecast.judgment_tier`(시장 · 모드 · 행동 · 규칙 버전 · as_of · tier · live_effective_n · spread_ci_low · spread_ci_high · regimes) + 뷰 `v_judgment_tier`. `coach.judgment_ledger` 출처 열에 `backtest_full` · `backtest_price_only` · `backtest_seen` 값 허용(CHECK 넓힘 — 기존 `live` · `backtest` · `synthetic` 유지). `base_rate_stat` 에 `status`(`ok` · `below_min`) · `sample_days` · `up_low` · `up_high` · 비율 nullable(FR-3 개정) — **상태(2026-11-10): 출처 라벨 done** `f38ca6ae`(마이그레이션 `20261110200000_judgment_backtest_labels` — 원장은 지금 주인 `public.symbol_judgment_snapshots` 에 · CHECK 넓힘 · 국내 장기 `backtest` → `backtest_full` 51,305행 · 롤백 SQL 은 파일 머리). `judgment_tier` · 뷰 · 기저율 칸은 to-do |
| FR-5 | 권한 — coach 는 forecast 뷰 SELECT 만 · forecast 는 coach 표 권한 0(`DB-REQ-036` 주인 표에 행 추가) |

## Acceptance Criteria

- [ ] 마이그레이션 목적 1개씩 · 롤백 SQL · `EXPLAIN` 첨부(읽기 쿼리 셋)
- [ ] 분위 CHECK · 스냅샷 UPDATE 차단 · 뷰 계약 테스트(`salt-forecast` 쪽 + 서버 읽기)
- [ ] `DB-REQ-036` 부록 주인 표 갱신

## 계약 영향

- `SRV-REQ-053` · `FC-REQ-028` · 기존 `DB-REQ-036`(서비스별 스키마) · `DB-REQ-033`(forecast 뷰) · `ADR-007`

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-11-10 밤 | **v2** — FR-6 등급 표 · 뷰 · 원장 출처 라벨 · 기저율 `below_min` 칸(`FEATURE-017` v2) |
| 2026-11-10 | 신규(to-do) — `FEATURE-017` 개정(범위 "잘 사고 잘 팔기") |
| 2026-11-10 밤(1b) | to-do → in-progress — FR-6 출처 라벨 done(`f38ca6ae`, 마이그레이션 `20261110200000_judgment_backtest_labels`). 라벨을 단 원장은 계획의 `coach.judgment_ledger` 가 아니라 지금 3종이 읽는 `public.symbol_judgment_snapshots` — 계획 문장 정정 |
