---
id: FC-REQ-023
feature: F008
area: forecast
kind: FUNC
title: "에이전트 O3 — 도구 4종 · 검증기 연결 · 템플릿 대비 블라인드 A/B, 숫자는 만들지 않는다"
priority: medium
created: 2026-10-30
source: requirements/decisions/ADR-007-forecast-ontology-schema-owner.md
---

## Summary

FEATURE-008 FR-41(Draft). 숫자는 채점되는 통계 모델이 내고 LLM 은 문장만 쓴다(ADR-004). 문장 생성은 서버 coach 의 `CoachExplainer` 포트 안에서 —
Python 상시 서버를 띄우지 않는다. 이 REQ 의 forecast 몫은 **도구가 읽는 계약 뷰**와 평가다.

## FR

| FR | 내용 | FEATURE-008 |
|---|---|---|
| FR-1 | 도구 계약 뷰 — `get_forecast_card(asset, as_of)` = `v_forecast_card` · `get_neighbors(entity, depth≤3, as_of)` = `v_neighbors` · `get_event_reactions(event_kind, sector)` = 반응 분포 뷰(신규) · `get_documents(entity, since)` = 문서 뷰(신규) | FR-41 |
| FR-2 | 모든 도구 결과에 출처 URL · 시각. 출처 없는 주장 금지(인용 검증기) | FR-44 |
| FR-3 | 검증기 재사용 — 숫자 대조(도구 결과에 없는 숫자 0) · 금지어 · 명령형 · 인용 | FR-41 |
| FR-4 | 개인 금액(보유 수량 · 평단 · 원화 손익) 프롬프트 0 | 공통 수용 기준 |
| FR-5 | 실패 · 검증 탈락 · 비용 상한 → 템플릿 해설 | FR-45 |
| FR-6 | 평가 — 블라인드 A/B 20건(템플릿 vs 에이전트). 이긴 경우만 소유자 전용으로 켬. `FC-REQ-022` O2 기준 미달이면 `get_neighbors` 의 mentions 간선 제외 | FR-49 |
| FR-7 | 서버 쪽 구현(도구 호출 · Spring AI)은 서버 Kotlin 이전(S6) 뒤면 Kotlin, 전이면 지금 TS coach — 착수 시점에 서버 REQ 추가 | — |

## Acceptance Criteria

- [ ] 숫자 대조 변이 — 도구 결과에 없는 숫자 삽입 시 탈락
- [ ] A/B 20건 결과 기록 · 판정
- [ ] 개인 금액 필드가 프롬프트 빌더 입력 타입에 없다

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-30 | 신규(to-do) |
