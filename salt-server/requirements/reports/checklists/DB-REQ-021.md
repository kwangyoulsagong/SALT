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
