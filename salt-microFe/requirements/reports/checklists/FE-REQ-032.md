# FE-REQ-032 checklists

## 2026-10-29 REQ 전수 조사

- 머리 정정 블록: FR-62 거래 기록 추가는 FE-REQ-039 가 구현(위와 같음) / FR-11 · 15 `EventSource` · 인증 방식은 레포 선례(POST fetch 스트림 + Bearer)를 보고 재검토

## 2026-11-18 F006 코치 대화 1단계(`feat/f006-coach-conversation`)

- FR-10 · 12~15 — 클라이언트에서만 · 재시도 0 · 닫기 — pass
- FR-16 · 41 — 재연결 3회 · 429 문구(입력 보존) — Playwright pass
- FR-17 — 완료 뒤 목록 · 메시지 키 `refetchType: none`(말풍선 두 번 방지) — pass
- FR-50 — 뷰모델 타입 core — pass · FR-51 이벤트 union 은 기능 안 타입(카드 없음) — 부분
- 근거: 루트 `requirements/specs/in-progress/F006-coach-conversation-slice.md` · 루트 체크리스트 `requirements/reports/checklists/F006-coach-conversation.md`

## 2026-11-18 F006 코치 대화 2단계(`feat/f006-coach-conversation-s2`)

- FR-21 · 51 · 52 — `entities/coach/api/useCoachConversationHistory.ts` · `useCoachBriefing.ts` · core 타입 — check-types 13 · lint 13 — pass
- 근거: 루트 체크리스트 `requirements/reports/checklists/F006-coach-conversation.md` §2단계

## 2026-11-18 F006 알림 화면(`feat/f006-alerts-screen`)

- FR-64 — 서버 HTML 에 첫 목록(실측 "판단이 바뀌었어요" 포함) · [더 보기] → 24줄 · 다음 쪽 실패 `route` 500 → 재시도 뒤 "다음 알림을 불러오지 못했어요"
- FR-65 — 안 읽은 수 실패 `route` 500 → 벨만(배지 없음 · `aria-label` "알림")
- FR-68 — `entities/notification/model/alerts.ts` 재수출만
- 미충족: 없음
- 근거: 루트 체크리스트 `requirements/reports/checklists/F006-alerts-screen.md`
