---
id: FC-REQ-023
feature: F008
area: forecast
kind: FUNC
title: "에이전트 O3 — 도구 4종 · 검증기 연결 · 템플릿 대비 블라인드 A/B, 숫자는 만들지 않는다"
priority: medium
status: in-progress
created: 2026-10-30
source: requirements/decisions/ADR-007-forecast-ontology-schema-owner.md
---

## Summary

FEATURE-008 FR-41(Draft). 숫자는 채점되는 통계 모델이 내고 LLM 은 문장만 쓴다(ADR-004). 문장 생성은 서버 coach 의 `CoachExplainer` 포트 안에서 —
Python 상시 서버를 띄우지 않는다. 이 REQ 의 forecast 몫은 **도구가 읽는 계약 뷰**와 평가다.

## FR

| FR | 내용 | FEATURE-008 | 상태 |
|---|---|---|---|
| FR-1 | 도구 계약 — `get_forecast_card` = `v_forecast_card`(renderable) · `get_neighbors` = `f_agent_neighbors`(2홉 — 서버 상한) · `get_event_reactions` = `v_agent_event_reactions` + 메뉴 `f_agent_recent_events` · `get_documents` = `f_agent_documents`(`DB-REQ-045`). **정정 2026-11-18**: 뷰는 인자를 못 받아 함수(`FC-REQ-022` FR-4 와 같은 이유) · 반응 인자는 `(event_kind, sector)` → `(event_kind, 종목 · 시장)` — 채점된 업종 범위 반응 통계가 없다(지어내지 않는다) | FR-41 | done 2026-11-18 |
| FR-2 | 모든 도구 결과에 출처 · 시각. **정정 2026-11-18**: 원문 주소가 있는 원천은 주소(DART 는 접수번호로 만든다), 원문 주소가 없는 원천(시황 제목 · 마스터 · 내부 통계)은 출처 이름 + 시각 — 온톨로지 관계 행에 주소가 0건이었다. 출처 종류 · 시각 없는 행 0 | FR-44 | done |
| FR-3 | 검증기 재사용 — 숫자 대조(도구 결과에 없는 숫자 0) · 금지어 · 명령형 · 인용(`SRV-REQ-059` FR-4) | FR-41 | done |
| FR-4 | 개인 금액(보유 수량 · 평단 · 원화 손익) 프롬프트 0 | 공통 수용 기준 | done |
| FR-5 | 실패 · 검증 탈락 · 비용 상한 → 기존 재료 해설 · 템플릿 | FR-45 | done |
| FR-6 | 평가 — 블라인드 A/B 20건(템플릿 vs 에이전트). 이긴 경우만 소유자 전용으로 켬. O2 관문 미달이면 mentions 간선 제외(관문은 `ontology_quality_gate` — `FC-REQ-022` FR-11). **더함 2026-11-18**: 지금 운영 해설(LLM, 2026-11-02 템플릿을 17:3 으로 이김) vs 에이전트도 잰다 — 템플릿만 이기면 약한 문턱 | FR-49 | 체크리스트 |
| FR-7 | 서버 쪽 구현 — S6 전이라 TS coach · 서버 REQ `SRV-REQ-059` | — | done |

## Acceptance Criteria

- [x] 숫자 대조 변이 — 도구 결과에 없는 숫자 삽입 시 탈락(서버 `agentTools.test.ts` — 47% 통과 · 62% 탈락 · 도구 없으면 47% 도 탈락)
- [ ] A/B 20건 결과 기록 · 판정
- [x] 개인 금액 필드가 프롬프트 빌더 입력 타입에 없다(컴파일 시험 + 에이전트 코드 grep 시험)

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-30 | 신규(to-do) |
| 2026-11-18 | **구현**(`feat/fc-req-023-agent-tools` · 루트 `requirements/specs/in-progress/F008-O3-agent-tools-slice.md`) — to-do → in-progress. FR-1 · 2 정정(함수 · 반응 인자 · 출처) · FR-6 기준 더함(운영 해설 대비). 예측 몫: O2 관문 표 쓰기 · 도구 계약 시험(누수 1,000회 · 관문 · 백필 공시 · 허브 성능). 서버 몫 `SRV-REQ-059` · DDL `DB-REQ-045` |
