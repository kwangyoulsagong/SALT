# FE-REQ-056 — 체크리스트


## 2026-11-02 — MONEY-F1(`FE-REQ-053`) 투자 zone 분리 · 홈 카드

- MONEY-F1(`FE-REQ-053`) 에서 이 REQ 가 걸렸다 — 셸 홈 → 도메인 요약 카드(투자 블록 · 매입가 숨김 잎 삭제)(`417076d8`). 파일 1개(경로 이동 내용 무변경 0 · 수정 1 · 추가 0 · 삭제 0). 화면 · 동작이 바뀐 몫은 위 커밋 설명대로
- 확인: 모노레포 check-types · lint · test · zone 5 빌드 · layer-check · 훅 사후 실행(바뀐 TS 전부) · 실화면 — `salt-microFe/requirements/reports/checklists/FE-REQ-053.md` §2

## 2026-11-03 — MONEY-F2(`FE-REQ-054`) 앱 내비게이션

- 이 REQ 에 걸린 몫(`FE-REQ-054`) — 저축 탭은 `@repo/core/navigation` `APP_TABS` 에서 `readyBy: "FE-REQ-056"`(비활성 "준비 중"). 저축 첫 화면(`/goals`)이 생기면 `readyBy: null` 로 · zone 레이아웃에 `AppShell` + `VIEW_TRANSITION_CSS`(투자 zone 레이아웃과 같은 꼴) · `next.config.js` 를 vanilla-extract 로 감싼다
- 확인: 모노레포 check-types · lint · test · zone 5 빌드 · layer-check · 훅 사후 실행 · Storybook · 실화면(5화면 × 5폭 · 앱 웹뷰 · WebKit) — `salt-microFe/requirements/reports/checklists/FE-REQ-054.md` §2
