# DB-REQ-021 checklists

## 2026-10-29 REQ 전수 조사

- 머리 정정 블록: Q2 는 닫혔다 — `kr_stock` 은 원화, 비원화는 미국 주식 착수 때. 환율 모델 결정 시점을 "미국 주식 착수 시"로

## 2026-11-18 F006 코치 대화 1단계(`feat/f006-coach-conversation`)

- FR-1 · 2 — 표 · `(conversation_id, created_at DESC)` — 로컬 적용 · 스키마 차이 0 — pass
- FR-6 · 8 · 10 — `explanation_source` · `error_code` · `title` nullable — pass
- 미충족: FR-5(insight 연결 — 카드 없음) · FR-20~24 패널 배치 · 홈 — F006 다음
- 근거: 루트 `requirements/specs/in-progress/F006-coach-conversation-slice.md` · 루트 체크리스트 `requirements/reports/checklists/F006-coach-conversation.md`

## 2026-11-18 F006 코치 대화 2단계(`feat/f006-coach-conversation-s2`)

- FR-4 · 5 — 마이그레이션 적용 · 스키마 ↔ DB 차이 0 · 실호출 뒤 `insight_id` 연결 · 질문 줄에 카드 넣기 → CHECK 위반 — pass
- 계정 삭제 — 임시 계정 메시지 44 · insight 7 지움(FK 충돌 0) — pass
- 근거: 루트 체크리스트 `requirements/reports/checklists/F006-coach-conversation.md` §2단계

## 2026-11-19 패널 배치(`feat/f006-pc-panel-grid`)

- FR-20 표 · FR-21 조건 0(조회는 `(user_id, surface)` 유니크만) · FR-22 유니크 · FR-23 화면 기본 배치(실화면) · FR-24 모양 안 봄 · 크기 CHECK
- 등급 주석 · `userRows` — `userRows.test.ts` 통과
- 미충족: 없음

## 2026-11-19 — 남은 FR 대조 (루트 `requirements/specs/done/WEB-perf-req-close-slice.md`)

- 미구현 FR 에 대체 근거(스펙 `## 정리 2026-11-19` 절) — 코드 무변경
- 남은 것: FR-7, FR-11 — LLM 경로 결정 · 앱 착수 때
