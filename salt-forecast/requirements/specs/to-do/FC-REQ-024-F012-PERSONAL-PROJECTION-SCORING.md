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

- [ ] forecast 스키마에 원 사용자 ID · 금액 원본 0
- [ ] 채점 경계 테스트(구간 끝 값 포함 · 기록 없음)
- [ ] CPI 누수 테스트 — 공표일 전 값 사용 0

## 계약 영향

- 서버 `SRV-REQ-045` · `046` · 이벤트 `SRV-REQ-044`

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-30 | 신규(to-do) |
