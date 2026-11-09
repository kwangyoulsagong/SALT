---
id: SRV-REQ-053
feature: F017
area: server
kind: FUNC
title: "coach — 관망도 판단(관측 근거) · 보류 사실 · 해설 늘 열림(사실표 · 스냅샷 · 로컬 우선) · 물어보기 · 해설 채점 지표"
priority: high
created: 2026-11-09
source: pm/requirements/specs/in-progress/FEATURE-017-ai-coach-best-case.md
---

## Summary

`FEATURE-017` 서버 몫. 서비스 = **coach**(Express — S6 전, `msa-services.md` §3). 결정(제안) `ADR-010`. 판정은 지금 규칙 엔진 그대로 — LLM 은 문장만.

## 착수 전 네 질문(`msa-services.md` §1)

| 질문 | 답 |
|---|---|
| 서비스 | coach |
| 단계 | Express(S6 전). 새 표(해설 스냅샷)는 S6 이전 때 Flyway 로 |
| 표 주인 | coach(`judgment_ledger` 읽기 · 스냅샷 쓰기). 같은 날 사실은 market 공개 API(`FEATURE-016` `ListMoveFacts`) |
| BFF 계약 | `ai-coach/detail` 응답에 칸 추가 · 새 경로(해설 스냅샷 · 물어보기) — `BFF-REQ-052` |

## 지금 코드(2026-11-09)

- `domain/policy/modeDecision.ts` `scoreModeDecision` — 항목 기여(`components`: 항목 · 점수 · 값)를 내지만 응답에 싣지 않는다(원장만)
- `domain/policy/symbolJudgment.ts` `judgmentGate` — `judgmentEvidence`(관망이면 0) → `reasons_missing`
- `application/ExplainCoachDecision.ts` — 게이트를 못 넘으면 LLM 을 부르지 않는다 · `explainRouting.ts` 로컬 Claude/Codex → Gemini

## FR

| FR | 내용 | 단계 |
|---|---|---|
| FR-1 | **관측 근거** — 모드 판단 응답에 `observations[]`: `{ item, value, lower, upper, distance, points, missing }`(문턱은 규칙 버전의 상수 — 화면 상수 0). 같은 판정의 `components` 와 같은 값(원장 대조 테스트). `judgmentEvidence` = 문장 ∪ 관측(결측 아님) — 관측 ≥ 1 이면 근거 있음(`ADR-010`) | 1 |
| FR-2 | **보류 사실** — `reasons_missing` 삭제. 남은 사유마다 `blockedFacts`: 재료 멈춤 `{ item, lastAt }` · 이력 부족 `{ have, need }` · 표본 부족 `{ sample, min }` · 투자유의 `{ since }` · 열지 않은 모드 `{ assetClass, mode }` · 실패사례 0 `{ sample }`. 문장은 화면(코드 → i18n) | 1 |
| FR-3 | **504 조사** — 국내 `ai-coach/detail` 서버 구간별 시간(판정 · 성적 · 실패 사례 · 일봉 지표 · 해설 캐시)을 재고 직렬 대기 · N+1 · 요청 시 집계를 걷는다. 목표 서버 p95 ≤ 300ms(BFF 400ms 안) — 측정 전후 수치 | 1 |
| FR-4 | **해설 사실표** — 관측 · 성적(표본 · 기준 대비 · 빗나간 수) · 실패 사례 · (있으면) 같은 날 사실(`FEATURE-016` ②)을 id 붙여 조립(`assembleExplanationFacts` 확장). 프롬프트 = 사실표 + 규칙(문장마다 `[id]` · 숫자는 사실표 값만 · 금지어). 검증기는 `FEATURE-008` FR-49 · `ADR-009` 금지어 표를 **한 벌**로(F016 ③과 공유) — 탈락 문장은 템플릿 문장으로 바꿔 끼움 | 2 |
| FR-5 | **판단 지문 스냅샷** — 지문 = (종목 · 모드 · 규칙 버전 · 행동 · 관측 구간 · 사실표 해시). 지문마다 한 번 생성 · 저장(불변), 같으면 요청마다 LLM 0. 생성은 비동기(판단 먼저) · 로컬 우선 → Gemini → 템플릿. 24시간 상한은 기존 LLM 상한 공유 · 로컬 허용 사용자 범위는 사용자 결정 D2 | 2 |
| FR-6 | **짧게 먼저** — 응답에 `summaryLine`(관측 중 문턱에 가장 가까운 둘 · 사실 문장 — 서버 템플릿) · 해설 길이 등급(표본 < 설정 · 기준과 구별 안 됨이면 `short`). 등급 문턱은 서버 설정 | 2 |
| FR-7 | **물어보기** — `POST /api/coach/ask`(SSE) `{ symbol, mode, question }` → 같은 사실표 안에서 답. 사실표 밖이면 서버가 "그 사실은 아직 없어요" 코드(LLM 0). 질문 원문 로그 0 · 저장 범위는 사용자 결정 D3 · 동시 1/사용자 · 45초 | 3 |
| FR-8 | **해설 채점 지표** — 스냅샷마다 검증 결과(문장 수 · 탈락 · 템플릿 대체 · 인용 수 · 공급자)를 남긴다(원문 0). 주간 리포트는 `FC-REQ-028` | 4 |
| FR-9 | **판단 엔진 v3 후보** — `FEATURE-016` 재료(업종 분해 몫 · 장중 프로그램 · 시장 조치)를 항목 후보로 원장에 값만 기록(점수 0). 점수 편입은 `FC-REQ-028` FR-4 사전등록 · IC 통과 뒤 | 5 |

## Acceptance Criteria

- [ ] 관측 = 원장 `components` 값(같은 판정) — 경계 표 테스트(결측 · 문턱 위 · 아래 · 같음)
- [ ] `reasons_missing` 코드 0 · 보류 사유마다 사실 칸
- [ ] 검증기 거절 표(숫자 불일치 · 인용 없음 · 사실표 밖 id · 금지어 · 명령형) — F016 ③과 같은 테스트
- [ ] 국내 · 코인 `ai-coach/detail` 서버 p95 ≤ 300ms(전후 수치)
- [ ] 프롬프트 입력 타입에 보유 · 금액 · 이메일 칸 0

## 계약 영향

- BFF `BFF-REQ-052` · FE `FE-REQ-064` · 예측 `FC-REQ-028` · 기존 `SRV-REQ-024`(코치 판단) · `SRV-REQ-037`(해설) · `SRV-REQ-050`(라우팅) · `SRV-REQ-052`(F016 ③ — 검증기 공유)

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-11-09 | 신규(to-do) — `FEATURE-017` · `ADR-010`(제안) |
