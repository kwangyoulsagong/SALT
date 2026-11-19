# SRV-REQ-029 — 체크리스트

## F000 이 먼저 닫은 것 — FR-24 · 45(부분) (2026-10-28)

루트 `F000-notification-kind-gate` · 커밋 `3320883`. 확인은 `SRV-REQ-008.md` 같은 날 절(단위 9 · 상시 서버 실경로 · 실 DB 발행). 이 REQ 는 `to-do` 그대로다 — F006 본편 범위가 대부분 남았다(Changelog 2026-10-28 행).

| 미검증 · 범위 밖 | 사유 | 언제 닫히나 |
|---|---|---|
| 이 REQ 의 나머지 FR | F006 본편 | F006 슬라이스 |

## 2026-11-18 F006 코치 대화 1단계(`feat/f006-coach-conversation`)

- FR-1 · 2 — POST 즉시 201(답 자리 선발급) — pass
- FR-3 · 4 — `Last-Event-ID` = 문장 번호, 다음 문장부터 · 저장본은 전문 + done(`replayed`) — 실 curl pass
- FR-5 — 카드 이벤트 없음(이번 답에 카드 없음) — 해당 없음
- FR-6 — `message.error` + `fallbackText` — pass
- FR-8 — SSE 헤더 — pass
- FR-10 — 사람마다 4 넘으면 429 — pass
- FR-28 · 29 · 32 — 역순 커서 · 사용자 지울 때만 · Swagger(Coach Conversation) — pass
- 미충족: 홈 · 패널 배치 · 포지션 · 알림 계약 — F006 다음 슬라이스
- 근거: 루트 `requirements/specs/in-progress/F006-coach-conversation-slice.md` · 루트 체크리스트 `requirements/reports/checklists/F006-coach-conversation.md`

## 2026-11-18 F006 코치 대화 2단계(`feat/f006-coach-conversation-s2`)

- FR-5 — `coachConversation.controller.ts` stream · 실호출: 문장 6 → `id: 6 message.card` → done, `Last-Event-ID: 5` 재연결 = card · done 만 — pass
- `GET /api/coach/briefing` — Swagger · `authMiddleware` · 실호출(임시 계정) — pass
- 목록 `card` — 실호출 assistant 행에만 — pass
- 근거: 루트 체크리스트 `requirements/reports/checklists/F006-coach-conversation.md` §2단계

## 2026-11-19 패널 배치(`feat/f006-pc-panel-grid`)

- FR-30 경계(16KB 정확히 204 · +1 413 · 한글 바이트) · 객체 아님 400 · 모르는 서피스 400 · 없음 → `tree: null` — `panelLayout.test.ts` 9 · 변이 1
- 실 DB: 동시 첫 저장 2 → 1행 · 덮어쓰기 · 40KB → DB CHECK 거절 · 조회 `EXPLAIN` 유니크 인덱스(버퍼 1)
- body-parser 4xx — `errorMiddleware.test.ts` 3 · 변이 1 · 실측 200KB 413(전 500)
- 미충족: 없음 · 근거 루트 체크리스트 `requirements/reports/checklists/F006-pc-panel-grid.md`

## 2026-11-19 — 남은 FR 대조 (루트 `requirements/specs/done/WEB-perf-req-close-slice.md`)

- 미구현 FR 에 대체 근거(스펙 `## 정리 2026-11-19` 절) — 코드 무변경
- 남은 것: FR-9 — LLM 경로 결정 · 앱 착수 때

## 2026-11-19 코치 대화 재설계가 걸침

- 답 링크 종류에 `plan`(밴드 적립 화면) · 빈 재료에 `weekly_plan` 더함(`feat/f006-coach-chat-redesign`) — Swagger 설명 갱신. 경로 · 모양 그대로
- 확인은 `FE-REQ-030` 체크리스트 2026-11-19 코치 대화 재설계 절
