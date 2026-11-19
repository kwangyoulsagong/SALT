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

## 2026-11-18 F006 포지션 1단계(`feat/f006-position-overview`)

- 읽기 Port `findTimeline` — EXPLAIN 0.07ms · 계정 삭제 뒤 사람 행 0 — pass
- 미충족: FR-70~74 거래 미리보기 · 음수 거부(2단계)
- 근거: 루트 체크리스트 `requirements/reports/checklists/F006-position-overview.md`

## 2026-11-18 F006 포지션 2단계(`feat/f006-position-trades`)

- FR-70 — 미리보기 · 저장 같은 함수(`LedgerChange.ts` · `recalculateHolding`) — pass
- FR-71 — 생성 · 수정 · 삭제 · 미리보기 거래일 순서 음수 거부(실API 셋 + 시험) — pass
- FR-72 — 한 트랜잭션(`runInTransaction`) + `pg_advisory_xact_lock` — 시험 롤백 가짜(과매도면 원장 · 보유 그대로) · 실측 동시 매도 하나만 — pass
- FR-73 — 정정(FIFO) · 과거 날짜 끼워 넣기 뒤 전체 재계산(실DB 평단 72,000 손 계산 일치) — pass
- FR-74 — 남의 거래 수정 · 삭제 · 미리보기 404 · 그 행 수량 그대로(둘째 임시 계정) — pass
- 마이그레이션 0
- 미충족: 없음
- 근거: 루트 체크리스트 `requirements/reports/checklists/F006-position-trades.md`

## 2026-11-19 PC 격자 짝(`feat/f006-pc-panel-grid`, 파일만 걸침)

- 마이그레이션 주석이 이 REQ 의 "값 목록은 제약으로" 태도를 가리킨다
- 미충족: 없음(이 REQ 몫 변경 0) · 근거 루트 체크리스트 `requirements/reports/checklists/F006-pc-panel-grid.md`

## 2026-11-19 — 남은 FR 대조 (루트 `requirements/specs/done/WEB-perf-req-close-slice.md`)

- 미구현 FR 에 대체 근거(스펙 `## 정리 2026-11-19` 절) — 코드 무변경
- 남은 것: FR-5 · 22 — LLM 경로 결정 · 앱 착수 때
