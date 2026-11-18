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
