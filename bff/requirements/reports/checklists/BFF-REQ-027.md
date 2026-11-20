# BFF-REQ-027 checklists

## 2026-10-29 REQ 전수 조사

- 서버 `homebriefing` 부재 · `coach/trades` 쓰기 경로 기록

## 2026-11-18 F006 코치 대화 1단계(`feat/f006-coach-conversation`)

- FR-9 — `Last-Event-ID` 서버로(숫자만) · 시험 — pass
- FR-10 — 프로세스 상한 40 → 429 — pass
- FR-11 — `message.error` 코드 · 서버 문장 그대로 — pass
- FR-12 · 65 — 본문 로깅 0 · 저장 0 — pass
- FR-40 · 41 — 커서 · 역순 중계 — pass
- 미충족: 홈 블록(FR-20~) · 카드 — F006 다음
- 근거: 루트 `requirements/specs/in-progress/F006-coach-conversation-slice.md` · 루트 체크리스트 `requirements/reports/checklists/F006-coach-conversation.md`

## 2026-11-18 F006 코치 대화 2단계(`feat/f006-coach-conversation-s2`)

- FR-3 · 42 — `coach-conversation.service.ts` `toCoachCard` · 시험 다섯 · 변이(변환 우회 → 2 실패) — pass
- 근거: 루트 체크리스트 `requirements/reports/checklists/F006-coach-conversation.md` §2단계

## 2026-11-18 F006 포지션 1단계(`feat/f006-position-overview`)

- FR-70~72 — `app-portfolio.service.ts` `getPosition` · `getPositionFlow` · `position.viewmodel.ts`(null 보존 · degraded 전달 · 모르는 축 버림) · 시험 `position.viewmodel.test.ts`(5) · 실호출(개요 18ms · 흐름 4~10ms · 400) — pass
- 미충족: 거래 쓰기 중계 FR-80~83(2단계)
- 근거: 루트 체크리스트 `requirements/reports/checklists/F006-position-overview.md`

## 2026-11-18 F006 포지션 2단계(`feat/f006-position-trades`)

- FR-80~85 — `portfolio.controller.ts` `transactionController` · `app-portfolio.service.ts` · 시험 `portfolio-transactions.controller.test.ts`(모양 400 여덟 · 서버 한 번 · 코드 그대로 400 · 404 · 미리보기 모양 · 뷰모델 둘) — pass
- 실API(4011 → 4020, 브랜치 코드): 미리보기 · 생성 · 수정 · 삭제 · 목록(이름 붙음 `namesDegraded` false) — pass
- BFF `npm test` 547 · `build` — pass
- 미충족: 없음(FR-83 해당 없음 — BFF 캐시 0)
- 근거: 루트 체크리스트 `requirements/reports/checklists/F006-position-trades.md`

## 2026-11-18 F006 알림 화면(`feat/f006-alerts-screen`)

- FR-90 — `bff/src/services/app-alerts.service.ts` `getAlerts(token, page)` · `alerts.viewmodel.ts` `toNextPage` — 시험 `app-alerts.test.ts` · `alerts.viewmodel.test.ts`(쪽 판정 7경계)
- FR-91 — `rest/routes/alerts.routes.ts` 경로 셋 · `alerts.controller.ts`(쪽 1 이상 정수만 · `no-store` · 204) — 실BFF(4001 브랜치 코드)로 안 읽은 16 · 2쪽 5건 · 읽음 PATCH 확인
- FR-92 — `toAlertTarget`(종류 + 종목 → 코드 넷) · 시험이 `/` 0 확인
- FR-93 — POST 경로 0(라우터 넷 전부 GET · PATCH)
- FR-90 의 `{ items, nextCursor }` 모양은 `{ alerts, unreadCount, nextPage }` 로 정정(서버가 커서가 아니라 쪽을 준다 · 기존 소비처 0)
- 미충족: 없음
- 근거: 루트 체크리스트 `requirements/reports/checklists/F006-alerts-screen.md`

## 2026-11-19 패널 배치(`feat/f006-pc-panel-grid`)

- FR-50 모양 안 봄(객체면 통과) · FR-51 16KB 정확히 통과 / +1 413(서버 0회) · FR-52 5xx · 504 · 시간 초과 → `degraded` — `panel-layout.test.ts` 6 · 변이 둘
- 실측: 20KB 413 · 200KB 413(전 500) · 배열 400
- 미충족: 없음 · 근거 루트 체크리스트 `requirements/reports/checklists/F006-pc-panel-grid.md`

## 2026-11-19 — 남은 FR 대조 (루트 `requirements/specs/done/WEB-perf-req-close-slice.md`)

- 미구현 FR 에 대체 근거(스펙 `## 정리 2026-11-19` 절) — 코드 무변경
- 남은 것: FR-5 — LLM 경로 결정 · 앱 착수 때

## 2026-11-19 코치 대화 재설계가 걸침

- 코치 답 링크 목록 `COACH_LINK_KINDS` 에 `plan` 더함(`feat/f006-coach-chat-redesign`) — 모르는 종류는 여전히 거른다(시험)
- 확인은 `FE-REQ-030` 체크리스트 2026-11-19 코치 대화 재설계 절

## 2026-11-19 — 대화 보관 한도 · 지난 대화 무한 스크롤(`feat/f006-coach-chat-history`)

| FR | 결과 | 근거 |
|---|---|---|
| FR-113 | 충족 | 시험 3(틀린 커서 셋 400 · 서버 호출 0 / 빈 · 맞는 커서 / keep 모양 여섯) · `npm run build` · `test` 592 · 실응답 400 `INVALID_CURSOR` |

루트 `requirements/specs/done/F006-coach-chat-history-slice.md` · 미검증 표는 그 슬라이스 체크리스트

## 2026-11-20 `BFF-REQ-046` 홈 카드 미리보기가 걸침

- `appPortfolioService.getPositionFlow` 선택 `timeout` 인자(기본값 그대로) — BFF `npm test` 통과 · 실경로 `/api/app/home` 94ms. 미충족: 없음(이 REQ 몫)
