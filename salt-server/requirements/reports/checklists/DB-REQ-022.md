# DB-REQ-022 — 체크리스트

## F000 이 먼저 닫은 것 — FR-81 · 82 · 83 (2026-10-28)

루트 `F000-notification-kind-gate` · 커밋 `3320883`. 확인은 `SRV-REQ-008.md` 같은 날 절(단위 9 · 상시 서버 실경로 · 실 DB 발행). 이 REQ 는 `to-do` 그대로다 — F006 본편 범위가 대부분 남았다(Changelog 2026-10-28 행).

| 미검증 · 범위 밖 | 사유 | 언제 닫히나 |
|---|---|---|
| 이 REQ 의 나머지 FR | F006 본편 | F006 슬라이스 |

## 2026-11-18 F006 코치 대화 1단계(`feat/f006-coach-conversation`)

- FR-20 · 21 · 23 · 24 — 60초 넘은 답 failed · 실패도 대화에 · `LLM_TIMEOUT` — pass
- FR-30 · 31 — 질문 + 답 자리 + 메시지 수 + 마지막 시각을 Prisma 중첩 쓰기 한 문장 — pass
- FR-60 — 주문 Port 0 — pass
- 미충족: FR-11 · 14(카드) · FR-22(LLM 취소 — LLM 없음) · FR-32(정합성 검증 쿼리) — F006 2단계
- 근거: 루트 `requirements/specs/in-progress/F006-coach-conversation-slice.md` · 루트 체크리스트 `requirements/reports/checklists/F006-coach-conversation.md`

## 2026-11-18 F006 코치 대화 2단계(`feat/f006-coach-conversation-s2`)

- FR-10 — 문장과 같은 조건부 UPDATE 한 번에 카드 — pass
- FR-11 — 게이트 칸 넷 — pass · FR-12 정정(막힌 카드에 행동 · 종목 · 근거 0 — 시험 · 실 DB 키 5개)
- FR-13 — SSE 단일 이벤트 — pass · FR-14 — 복사본(추천이 바뀌어도 저장본 그대로 — 시험) — pass
- 근거: 루트 체크리스트 `requirements/reports/checklists/F006-coach-conversation.md` §2단계
