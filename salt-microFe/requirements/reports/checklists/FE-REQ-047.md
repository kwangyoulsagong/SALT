# FE-REQ-047 체크리스트

(to-do — 구현 전. 다른 REQ 가 이 REQ 의 파일만 걸친 기록)

## 2026-11-10 — 투자 머리 메뉴 · 레일 복원 · 포트폴리오(주인 `FE-REQ-069`)

- 확인은 `FE-REQ-069` 체크리스트(실화면 24칸 · 넘침 0 · axe 0 · 운영 빌드 · zone 전환 9/10)

## 2026-11-18 F006 알림 화면 확인 3회차(`feat/f006-alerts-screen`)

- `panelDescription` · `EmptyState` 설명 — axe(wcag2aa) 11화면(설정 · 알림 · 저축 · 가계부 다섯 · 코치 리포트 · 코치 설정 · 팁)에서 이 두 칸 위반 0
- 남은 대비 위반(이번 범위 밖, axe 실측): 뒤로 링크 `surface.backLink` 4.18 · 가계부 첫 화면 27곳(달 이동 3.01 · 금액 칸 라벨 3.86 …) · 리볼빙 10 · 사람 장부 11 · 코치 리포트 10(`CoachReport_meta` 3.03 …) · 코치 설정 2 · 필터 탭 미선택 4.18
- 미충족: FR-13 나머지(위 목록)
- 근거: 루트 체크리스트 `requirements/reports/checklists/F006-alerts-screen.md` §7
