# SRV-REQ-028 — 체크리스트

## F000 이 먼저 닫은 것 — FR-90(첫 원인) · FR-94 (2026-10-28)

루트 `F000-notification-kind-gate` · 커밋 `3320883`. 확인은 `SRV-REQ-008.md` 같은 날 절(단위 9 · 상시 서버 실경로 · 실 DB 발행). 이 REQ 는 `to-do` 그대로다 — F006 본편 범위가 대부분 남았다(Changelog 2026-10-28 행).

| 미검증 · 범위 밖 | 사유 | 언제 닫히나 |
|---|---|---|
| 이 REQ 의 나머지 FR | F006 본편 | F006 슬라이스 |

## 2026-10-29 REQ 전수 조사

- 머리 정정 블록: FR-76 의 Q2 의존 — Q2 닫힘(환율은 미국 주식 착수 때)

## 2026-11-18 F006 코치 대화 1단계(`feat/f006-coach-conversation`)

- FR-1~3 · 9 · 10 — `coach/application/CoachConversation.ts` `AskCoach` · `AnswerCoachMessage` · 시험 `application/__tests__/coachConversation.test.ts`(재연결 · 메시지 수) — pass
- FR-4 — 조건부 UPDATE(`PrismaCoachConversationStore.completeAnswer`) · 겹친 두 스트림 시험 — pass(정정)
- FR-7 · 8 — 60초 넘은 답 실패 · 목록 읽기 전 `FailStaleCoachAnswers` — pass(FR-8 정정)
- FR-20~25 — `domain/policy/coachConversation.ts` `routeCoachQuestion` · `ANSWER_MATERIALS` · 재료 실패 = gap — pass
- FR-40~43 · 45~47 — 모든 문장 `languageViolations` · `dropped` 측정 · 문장 단위 전송 — pass
- FR-60 — 주문 Port 0 · 주문 요청 갈래 — pass
- 미충족: FR-5 · 6 · 26 · 30~34 · 44(LLM 경로 없음) · FR-50~54(카드) · 홈 · 포지션 · 알림 · 설정 — F006 2단계
- 근거: 루트 `requirements/specs/in-progress/F006-coach-conversation-slice.md` · 루트 체크리스트 `requirements/reports/checklists/F006-coach-conversation.md`

## 2026-11-18 F006 코치 대화 2단계(`feat/f006-coach-conversation-s2`)

- FR-50~54 — `ReadConversationCard`(`application/lib/recommendationCard.ts`) · `AnswerCoachMessage` 카드 복사 · 시험 `recommendationCard.test.ts`(통과 · 막힘 셋 · 근거 없음 · 추천 없음) · `coachConversation.test.ts`(복사본 · 재연결이 카드를 다시 읽지 않음 · 카드 실패 = gap) — pass
- 브리핑 — `GetCoachBriefing` · `composeCoachBriefing` 재료 조합 140갈래 검사기 통과 · 0 안 씀 — pass
- 변이: 막힌 카드에 내용을 펼침 → 3 실패 · 팔기에서 카드 재료 뺌 → 2 · 위험 답에 카드 → 1 · 브리핑 실패를 0 으로 → 2
- 미충족: LLM 경로(FR-5 · 6 · 26 · 30~34 · 44 — A/B 먼저) · 홈 · 포지션 · 알림 · 설정
- 근거: 루트 체크리스트 `requirements/reports/checklists/F006-coach-conversation.md` §2단계
