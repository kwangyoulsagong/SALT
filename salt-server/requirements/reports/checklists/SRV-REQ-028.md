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

## 2026-11-18 F006 포지션 1단계(`feat/f006-position-overview`)

- FR-80 · 82~84 · 89 — `ReadPosition.ts` · `PositionFlow.ts` · `policy/riskRadar.ts` · 시험 `positionFlow.test.ts`(15 — KST 날짜 · 판 날 지수 · 산 날 돈 · 휴장 이어 쓰기 · 종가 없음 · 상한 경계 · null · 0~100 자르기 · 뉴스 커버리지) · `readPosition.test.ts`(7 — 빈 보유 · Hero 합계 · 30일 미만 · 원천 실패 격리 · 시세 미반영 · 흐름 빈 거래 · 1주 8점) — pass
- FR-81(정정) — 새 흐름 경로 · 일봉만(`dailyClosesSince`, EXPLAIN 2.1ms) — pass
- 변이: 뉴스 실패를 올림 → 1 실패 · 30일 조건 뺌 → 1 실패
- 실데이터: 손 계산 대조(총 평가금 · 원금 · 비중 60.43% · 30일 = 1개월 구간 · 90일 낙폭 = 3개월 MDD) — pass
- 미충족: FR-85 미리보기 · FR-86 수정 · 삭제 과매도 거부 · FR-87(2단계) · FR-88 소멸
- 근거: 루트 체크리스트 `requirements/reports/checklists/F006-position-overview.md`

## 2026-11-18 F006 포지션 2단계(`feat/f006-position-trades`)

- FR-85 — `PreviewTransaction`(`RecordTransaction.ts`) · `previewLedgerChange` · `POST /api/portfolio/transactions/preview` · 시험 `ledgerChange.test.ts`(경계 표 12 + 옛 원장 3 + 값 4) · `ledgerWrites.test.ts`(미리보기 = 저장 수량 · 쓰기 0) — pass
- FR-86 — `writeLedger` 셋 공통(쓰기 → 다시 읽기 → `assertNotOversold` → 롤백) · 실API: 과거 날짜 매도(지금 보유 16 안 · 그날 뒤 음수) 400 · 매수 수량 줄이기 400 · 매수 삭제 400 · 동시 매도 10+10(보유 16) → 하나만 201 — pass
- FR-87 — PATCH `strict`(종목 키 400) · 거래일 수정 200(실API 11-10 → 11-12) — pass
- 손 계산 대조: 원장 10@70,000 · −4 · +10@72,000 · −10 → 보유 6 · 평단 72,000 · 원금 432,000(DB 행과 같음) — pass
- 서버 `npm test` 1928 · `build` · `lint` · `test:layer-check` — pass
- 미충족: 없음(FR-88 은 온보딩 은퇴로 소멸)
- 근거: 루트 체크리스트 `requirements/reports/checklists/F006-position-trades.md`
- 확인 2회차: main(4000) · 브랜치(4020) 나란히 — 같은 쓰기 순서 결과 같음 · 읽기 14경로 같음(거래 목록 같은 시각 순서만 의도한 차이) — pass

## 2026-11-19 — 남은 FR 대조 (루트 `requirements/specs/done/WEB-perf-req-close-slice.md`)

- 미구현 FR 에 대체 근거(스펙 `## 정리 2026-11-19` 절) — 코드 무변경
- 남은 것: FR-5 · 6 · 26 · 30~34 · 44 · 46 · 62 · 63 — LLM 경로 결정 · 앱 착수 때

## 2026-11-19 코치 대화 재설계가 걸침

- **"이번 주 얼마 넣을까" 답을 밴드 적립 주간 계획으로**(`feat/f006-coach-chat-redesign`) — 전에는 `/plan` 이 생긴 뒤에도 "적립 계산은 아직 SALT에 없어요"라고 답했다. 재료 `weekly_plan`(plan 컨텍스트 주간 계획 — 코치는 import 하지 않고 조립이 끼운다) · 계획 있음 / 굳지 않음 / 안 정함 / 못 읽음 경계 시험 · 링크 `plan` · 빈 재료 `weekly_plan`
- 확인은 `FE-REQ-030` 체크리스트 2026-11-19 코치 대화 재설계 절
