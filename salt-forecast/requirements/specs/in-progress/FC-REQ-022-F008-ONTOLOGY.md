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
| FR-4 | 계약 뷰 `v_entity_asof(as_of)` — `available_at <= as_of` 만(**2026-10-30 정정** — 처음엔 `ingested_at`, 이력 참고). `v_neighbors(entity_id, depth≤3, as_of)` — 재귀 CTE | FR-25 |
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

## FR — v4 재설계: 사실 → 근거 → 원인 후보 → 결과 (2026-11-13 · 전 영역 계획 `requirements/specs/in-progress/F017-v4-one-panel-global-plan.md`)

> 사용자 2026-11-13: *"우리 온톨로지가 아직 설계가 안 되어 있어서 뉴스 그리고 공시 환율 이런 것들 RSI"* · *"사실 근거 원인"* · *"다 설명할 수 있잖아 우린 다 데이터가 있는데"*.
> 위 O1(entity · relation · fact)은 그대로 바닥이다. 목적을 "에이전트가 조회하는 그래프"에서 **"원인 · 근거 · 결과를 잇는 틀"**로 바꾼다. `FEATURE-017` 범위 밖(11-10) → **범위 안**.

| FR | 내용 | 상태 |
|---|---|---|
| FR-13 | **네 층** ① 사실(`fact` — 출처 · 관측 시각 · `available_at`: 공시 · 기사 추출 사실 · 지표값 · 수급 · 환율 · 금리) ② 근거(`evidence` — 사실 + 비교: 평소 대비 배수 · 업종 대비 · 반응 창) ③ 원인 후보(`cause_candidate` — 사건 + 근거 묶음 + `strength`) ④ 결과(`outcome` — 실제 등락 · 그 뒤 채점). ③ · ④ 는 서버 조립 결과의 사본(주인 `SRV-REQ-053` FR-11) | to-do |
| FR-14 | **연결 셋** 사건 ↔ 종목 ↔ 업종(`affects` · `belongs_to` — 업종 소식을 종목에) · 사건 ↔ 반응 창(`FC-REQ-028` FR-8) · 원인 후보 ↔ 채점 | to-do |
| FR-15 | **원인 설명 채점** — "가장 유력"이라 한 원인 종류별로 뒤의 등락이 과거 같은 종류와 같은 방향이었나 · 기준(업종 몫만으로 설명) 대비 | to-do |
| FR-16 | 새 원천 — 공시(`FC-REQ-026`) · 기사 추출 사실 · 환율 · 금리 · 지수 값(`series_point` 확장). 원천마다 `available_at` 정의를 `security-sources.md` 표에 | to-do |

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-30 | 신규(to-do) |
| 2026-10-30 | **FR-4 정정** — as-of 거르기 기준 `ingested_at <= as_of` → **`available_at <= as_of`**. `time-and-leakage.md` §1 "수집 시각은 available_at 이 아니다 — 백필하면 ingested_at 이 전부 오늘" 과 반대였다(백필 사실이 과거 as-of 에서 사라져 백테스트가 틀린다). 테이블에 `available_at` 열 추가 · `ingested_at` 은 감사용. 규칙 `ontology.md` §3 |
| 2026-11-10 | `FEATURE-017` 개정 — F017 은 온톨로지 전체를 기다리지 않는다. 필요한 것(소식 → 종목 · 사건 종류)만 `FC-REQ-028` FR-3 이 이미 있는 연결로 한다. 이 REQ 는 to-do 그대로(우선순위 뒤) |
| 2026-11-13 | **v4 재설계**(`requirements/specs/in-progress/F017-v4-one-panel-global-plan.md`) — FR-13~16: 사실 → 근거 → 원인 후보 → 결과 네 층 · 연결 셋 · 원인 설명 채점 · 새 원천. `FEATURE-017` 범위 안으로 |
