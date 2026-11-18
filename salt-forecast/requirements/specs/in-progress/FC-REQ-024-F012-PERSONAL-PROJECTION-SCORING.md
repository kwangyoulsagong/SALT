---
id: FC-REQ-024
feature: F012
area: forecast
kind: FUNC
title: "개인 재무 전망 채점 O4 — 저축 도달 구간 · 월말 지출 착지의 커버리지(사용자 해시) + 물가지수 수집"
priority: high
created: 2026-10-30
source: requirements/decisions/ADR-007-forecast-ontology-schema-owner.md
---

## Summary

저축 · 가계부의 "언제 / 얼마"도 구간 + 채점 이력이다(ADR-003 정신). **계산은 도메인 서비스가 요청 시**, forecast 는 발행된 구간을 받아 채점만 한다 —
사용자 재무 데이터가 배치로 흘러오지 않게.

## FR

| FR | 내용 | FEATURE |
|---|---|---|
| FR-1 | 구독 — `savings.ProjectionIssued` · `household.LandingIssued`(가계부 착지 발행, `SRV-REQ-044` 목록에 추가) → `forecast.personal_projection`(사용자 해시 · 종류 · 발행일 · 구간 · 목표일/월) | F012 FR-5 · F013 FR-7 |
| FR-2 | 결과 — 실현 값은 도메인 서비스 export 뷰에서(목표 진척 월말 · 월 지출 확정 합) — 금액이 아니라 "구간 안/밖" 판정에 필요한 최소 값 | — |
| FR-3 | 채점 — 3 · 6개월 전 도달 구간 · 지난달 같은 날짜 착지 구간의 적중. `personal_projection_score` | F012 FR-5 |
| FR-4 | 집계 뷰 `v_personal_coverage`(종류 · 기간 · 구간 수 · 적중 수) — 서비스가 읽어 화면 문장 "이 계산기의 90% 구간은 지난 6개월간 실제로 87% 맞았다" | F012 FR-5 |
| FR-5 | 사용자 식별자는 해시(솔트는 서버 비밀). 사용자별 결과는 서비스로만, forecast 리포트에는 집계만 | 개인정보 |
| FR-6 | 물가지수 — 공식 CPI 월간 수집(`ingest/` 의 FRED · ECB 와 같은 방식, `available_at` 은 공표일) → savings "오늘 돈" | F012 FR-9 |
| FR-7 | 커버리지가 명목보다 10%p 이상 낮으면 운영 점검(`ops_check`)에 남김 — 구간 방법 개선 신호 | — |

## Acceptance Criteria

- [x] forecast 스키마에 원 사용자 ID · 금액 원본 0 — `test_no_raw_user_or_amount_columns`
- [x] 채점 경계 테스트(구간 끝 값 포함 · 기록 없음) — `test_personal_projection.py` · Kotlin 뷰 경계
- [x] CPI 누수 테스트 — 공표일 전 값 사용 0 — `tests/leakage/test_personal_projection_asof.py`(무작위 as_of 1,000)
- [ ] 첫 실판정 — 발행이 쌓인 뒤(실 DB 발행 0, 2026-11-18)

## 계약 영향

- 서버 `SRV-REQ-045` · `046` · 이벤트 `SRV-REQ-044`

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-30 | 신규(to-do) |
| 2026-11-03 | MONEY-S1a — `e83f7f80` — 이벤트 계약 `savings.ProjectionIssued` 가 이 REQ(채점)를 구독 예정으로 적는다. 예측 쪽 변경 0 — 채점은 S1b 이후(발행 3개월 뒤부터 의미) |
| 2026-11-03 | MONEY-S1b — `531fdf35` 이벤트 계약 `savings.ProjectionIssued` reason 에 `not_reachable`(100년 안에 못 닿음) 추가. 예측 쪽 변경 0(아직 구독 전) — 구현할 때 이 값은 "구간 없음"으로 채점에서 뺀다 |
| 2026-11-04 | 가계부 S1a(`MONEY-S1-household-entry`) — 변경 없음 기록 — 채점 원천 `household.LandingIssued` 계약 · `landing_issued` 불변 표가 생겼다(구독 · 채점은 발행 3개월 뒤) |
| 2026-11-18 | 구현(in-progress) — FR-1~7 전부. **FR-1 정정**: 이벤트 구독 대신 서비스 export 뷰(`savings.v_projection_outcome_export` · `household.v_landing_outcome_export`) — 예측은 상시 소비자가 없는 배치이고 이벤트 본문에 금액 · 원 사용자 id 가 있어 받는 순간 FR-5 를 어긴다(`msa-services.md` §5). **FR-5 정정**: 해시는 뷰 SQL 의 `sha256(user_id)`(identity 계측과 같은 식 — 같은 DB 에 사용자 표가 있어 비밀 값이 막는 것이 없다). FR-2: 가계부는 뷰가 below · inside · above 만(금액 0), 저축은 도달 달. FR-3 판정 · 목표 · 달마다 마지막 발행만 셈 · 원천에서 사라진 사본 지움. FR-4 `v_personal_coverage`(3 · 6개월). FR-6 ECOS 901Y009(FRED 한국 CPI 는 2023-11 에서 멈춤) · available_at = 국가데이터처 보도 시각 · 기준 개편은 통째로 교체. FR-7 운영 점검 `personal_coverage:*`(6개월 20건 이상 · 70% 미만). 매일 `personal_scoring`. 루트 `requirements/specs/in-progress/MONEY-O4-personal-projection-scoring-slice.md` |
