---
id: SRV-REQ-059
feature: F008
area: backend
kind: FUNC
title: "해설 에이전트(O3) — 도구 고르기 · 서버가 예측 계약을 부름 · 기존 작성기 · 검증기 · 블라인드 A/B"
priority: medium
created: 2026-11-18
status: done
source: salt-forecast/requirements/specs/in-progress/FC-REQ-023-F008-AGENT-TOOLS.md (FR-7 — "착수 시점에 서버 REQ 추가") · ADR-007 §1-2
---

## Summary

`FC-REQ-023` 의 서버 몫. 서버 Kotlin 이전(S6) 전이라 **지금 TS coach** 에 쓴다(FR-7). 에이전트는 **고르기만** 한다 —
어느 도구를 어느 대상에 부를지 JSON 으로 답하고, 도구는 서버가 예측 계약(`DB-REQ-045`)으로 부른다. 결과 줄은 해설 입력 `tools` 로 들어가
**기존 작성기**(로컬 CLI → Gemini)가 문장을 쓰고 **기존 검증기**(숫자 대조 · 금지어 · 명령형 · 인용)가 거른다. 도구 결과에 없는 숫자는 문장에 못 남는다.

로컬 CLI 는 도구 0 · 빈 폴더 격리 그대로다(`ddd-infrastructure.md` §6) — 모델에게 도구를 쥐여 주지 않고 "고른 목록"만 받는다.
Spring AI 도구 호출은 S6 에 Kotlin 으로 옮길 때 다시 본다.

## 서비스 · 단계 · 테이블 · BFF (`msa-services.md` §1)

| 질문 | 답 |
|---|---|
| ① 서비스 | `coach` |
| ② 단계 | S6 전 — Express(`salt-server/src/coach`) |
| ③ 테이블 | `forecast` 함수 · 뷰 읽기만(`DB-REQ-045`) · 사용량 원장(`llm_usage`, coach 주인)에 `purpose: agent_plan` |
| ④ BFF | 무변경 — 화면 경로 0(측정 유스케이스 · 스크립트만) |

## FR

| FR | 내용 | 상태 |
|---|---|---|
| FR-1 | 도구 계약 읽기 `AgentToolReader` — 전망 카드(`v_forecast_card` renderable) · 이웃(`f_agent_neighbors` 2홉) · 최근 사건(`f_agent_recent_events`) · 반응(`v_agent_event_reactions`) · 문서(`f_agent_documents`). 행 상한 SQL 에 | done 2026-11-18 |
| FR-2 | 결과 → 사실 줄(도메인 `agentTools`) — 숫자 · 출처 이름 · 원문 주소(있으면) · 시각. 전망 카드는 3종(채점 이력 · 기준 대비 · 빗나간 수)이 다 있을 때만. 사건 반응은 **최근 이 종목에 일어난 사건만**(단타 3일 · 장기 20일) · 사건 날짜를 줄 앞에. 이웃은 같이 언급 3건 이상만. 문서 날짜는 일어난 날 | done |
| FR-3 | 고르기 — 왕복 ≤ 2 · 호출 ≤ 4 · 대상은 이 종목 + 앞 결과의 이웃 종목 · 사건 종류는 메뉴에서만(지어낸 것 버림). 모델 실패 · 못 읽는 답 · 전부 버림 → 정해 둔 한 바퀴. 빈 목록 = 부를 것 없음 | done |
| FR-4 | 검증기 재사용 — 도구 줄 숫자가 허용 숫자(제목 줄은 뉴스 칸만) · 인용 사실표(`tool-n`). 글로 옮긴 사실이 숫자만 맞은 사실보다 인용 상한 3 안에서 먼저 | done |
| FR-5 | 개인 금액 0 — 해설 입력 · 고르기 요청 · 도구 사실 타입에 보유 수량 · 평단 · 손익 필드 없음(컴파일 시험) · 에이전트 코드 grep 시험 | done |
| FR-6 | 실패 · 검증 탈락 · 비용 상한 → 기존 재료 해설 · 템플릿(빈칸 0). 고르기는 같은 24시간 원장 · 같은 로컬 CLI 게이트 | done |
| FR-7 | 측정 — `CompareAgentExplanation`(저장 0) · `npm run explain:agent-ab` 평가지 둘(① 템플릿 vs 에이전트 · ② 지금 운영 해설 vs 에이전트) · 독립 평가자 셋 다수결 | done — 결과는 체크리스트 |
| FR-8 | 켜기 — FR-7 에서 이긴 경우만 소유자 전용으로(전망 카드 줄이 소유자 전용 숫자) | **판정 2026-11-18: 켜지 않음** — 원인 분리 3회차 대조군 10 : 에이전트 6 |

## 판정 (FR-8)

**켜지 않는다.** 템플릿 대비 20:0 · 운영 해설 대비 14:5 를 넘었지만, 작성 프롬프트의 도구 줄만 같고 도구 사실이 0인 대조군이 에이전트를 10:6 으로 이겼다(원인 분리, 사용자 "원인 분리 실험 먼저" — 그래도 이기면 켬). 도구는 해설을 낫게 하지 않는다. 측정 경로는 남긴다. 표는 체크리스트 "A/B" 절.

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-11-18 | 신규(in-progress) — `FC-REQ-023` FR-7 의 서버 REQ. FR-1~7 구현(`feat/fc-req-023-agent-tools`) |
| 2026-11-18 | A/B 두 회차 — ① 템플릿 대비 20:0 · 20:0 / ② 운영 해설 대비 3:17(도구를 늘 메뉴에) → 14:5(최근 실제 사건만 · 같이 언급 3건 이상만 · agent-plan@2). FR-8 켜기는 판정 대기(도구 인용 20건 중 2건 — 원인 분리 전). 루트 `requirements/specs/done/F008-O3-agent-tools-slice.md` |
| 2026-11-18 | **done** — 원인 분리 3회차(`-r3-rule`) 대조군 10 : 에이전트 6 · 같음 4 → FR-8 켜지 않음. 대조군을 만들려고 도구 줄 조건을 "칸이 있으면"으로(운영 프롬프트 그대로 — `agentPrompt.test.ts`). 루트 `requirements/specs/done/F008-O3-agent-tools-slice.md` |
