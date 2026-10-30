---
id: FC-REQ-022
feature: F008
area: forecast
kind: DATA
title: "온톨로지 O1 · O2 — entity · relation · fact(시점 고정) + 기존 데이터 적재 + 엔티티 연결 품질"
priority: high
created: 2026-10-30
source: requirements/decisions/ADR-007-forecast-ontology-schema-owner.md
---

## Summary

FEATURE-008 FR-25(Draft). `ontology/__init__.py` 0줄. 뉴스 · 일정 · 신호 · 종목 마스터가 흩어져 있어 "이 뉴스는 어느 종목에 관한 것인가"를 매번 새로 짠다.
**새 수집 없이** 이미 있는 데이터로 첫 그래프를 만든다. 누수 규칙(`time-and-leakage.md`)이 그대로 적용된다.

## FR — O1 테이블 · 적재

| FR | 내용 | FEATURE-008 |
|---|---|---|
| FR-1 | `forecast.entity`(id · kind · canonical_name · external_ids jsonb · created_at). kind: asset · company · person · institution · wallet · event · document · sector · policy | FR-25 |
| FR-2 | `forecast.relation`(subject · predicate · object · valid_from · valid_to · observed_at · ingested_at · source_url · source_kind · confidence). predicate: issued · listed_as · holds · traded · mentions · affects · belongs_to · regulates | FR-25 |
| FR-3 | `forecast.fact`(entity · attribute · value_num · value_text · unit · valid_from · valid_to · observed_at · ingested_at · source_url) | FR-25 |
| FR-4 | 계약 뷰 `v_entity_asof(as_of)` — `ingested_at <= as_of` 만. `v_neighbors(entity_id, depth≤3, as_of)` — 재귀 CTE | FR-25 |
| FR-5 | 적재 잡 `ontology_build` — 종목 마스터 · 업비트 마켓 → asset · company · listed_as · belongs_to sector / `news_item` · `news_score` → document · mentions · 감성 fact / `scheduled_event` · `signal_event` → event · affects / `event_reaction` → 반응 fact | FR-25 |
| FR-6 | 멱등 — 같은 원천 행 재적재 시 중복 0(원천 키를 external_ids 에) | — |
| FR-7 | DDL — 지금은 `salt-server/prisma/migrations`(ADR-004 §5), O5 이후 `salt-forecast` 안(`FC-REQ-025`) | — |

## FR — O2 엔티티 연결 품질

| FR | 내용 |
|---|---|
| FR-10 | 뉴스 → 종목 매칭(종목명 · 티커 · 별칭) 표본 200건 수기 라벨, 정밀도 · 재현율 기록 |
| FR-11 | 기준(정밀도 0.9 · 재현율 0.7 — 표본 분포를 본 뒤 확정) 미달이면 `mentions` 를 에이전트 도구에 쓰지 않는다(`FC-REQ-023` 게이트) |
| FR-12 | 동명 회사 · 영문/한글 이름 충돌 목록을 리포트로 |

## Acceptance Criteria

- [ ] 누수 테스트 — as-of 질의가 미래 `ingested_at` 행을 돌려주지 않는다(무작위 시점 1,000회)
- [ ] 3홉 질의 p95 200ms 이하(로컬 데이터)
- [ ] 재적재 2회 후 행 수 동일
- [ ] O2 표본 라벨 · 정밀도 · 재현율 리포트

## 계약 영향

- DB DDL(현재 `salt-server/prisma`) — 뷰 계약 신규라 서버 소비자 없음

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-30 | 신규(to-do) |
