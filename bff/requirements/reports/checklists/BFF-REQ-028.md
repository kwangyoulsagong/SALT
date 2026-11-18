# BFF-REQ-028 — 체크리스트

## 2026-11-18 F006 코치 대화 1단계(`feat/f006-coach-conversation`)

- FR-8 — 완료된 답에 붙으면 전문 + done — pass
- FR-29 — 역순 커서 — pass
- FR-31 — 뷰모델 타입 core 공유 — pass
- FR-3 · 4 — 카드 없음 — 해당 없음(2단계)
- 근거: 루트 `requirements/specs/in-progress/F006-coach-conversation-slice.md` · 루트 체크리스트 `requirements/reports/checklists/F006-coach-conversation.md`

## 2026-11-18 F006 코치 대화 2단계(`feat/f006-coach-conversation-s2`)

- FR-3 · 4 — 시험 · 실호출(4011 → 4020) — pass
- 브리핑 경로 — 시험 · 실호출 — pass
- 근거: 루트 체크리스트 `requirements/reports/checklists/F006-coach-conversation.md` §2단계

## 2026-11-18 F006 포지션 1단계(`feat/f006-position-overview`)

- FR-40 — 계약 글자 대조 시험 통과 · 레이더 축 4개(실호출) · 실패 섹션 금액 null(서버 원천 실패 시 축 null — `readPosition.test.ts`) — pass
- 미충족: 거래 기록 · 알림 · 설정 계약(다음 단계)
- 근거: 루트 체크리스트 `requirements/reports/checklists/F006-position-overview.md`

## 2026-11-18 F006 포지션 2단계(`feat/f006-position-trades`)

- 거래 계약 8종을 CONTRACT 블록에 — `position-contract.test.ts` 글자 대조 통과 · FE `check-types` 13/13 — pass
- 미충족: 없음
- 근거: 루트 체크리스트 `requirements/reports/checklists/F006-position-trades.md`
