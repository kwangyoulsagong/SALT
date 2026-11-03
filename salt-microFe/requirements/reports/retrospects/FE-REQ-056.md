# FE-REQ-056 — 회고


## 2026-11-02 — MONEY-F1(`FE-REQ-053`)

- 이 REQ 화면 · 동작에 걸린 수정이 있다 — 근거와 확인은 커밋 설명 · 루트 회고 `requirements/reports/retrospects/MONEY-F1-invest-zone-home-cards.md`

## 2026-11-03 — MONEY-F2(`FE-REQ-054`)

- 넘겨받은 몫: 저축 첫 화면이 생기면 `APP_TABS` `readyBy: null` · zone 레이아웃에 `AppShell` + `VIEW_TRANSITION_CSS` · 설정을 vanilla-extract 로(스펙 Changelog). Action 없음

## 2026-11-03 — MONEY-S1a 저축 서비스 첫 판 · 저축 zone 첫 화면

- **문제(실측이 찾음)**: `AppShell` 이 이미 `<main>` 인데 페이지도 `<main>` — 한 문서에 main 3개. 투자 페이지는 div 였다. zone 레이아웃이 랜드마크를 갖는다는 걸 `fsd-pages.md` 에 한 줄
- **문제(빌드가 찾음)**: 서버 페이지에서 클라이언트 폼에 함수 prop(`detailHref`) — dev 는 통과, 운영 빌드 prerender 에서 실패. 경로는 폼이 `ROUTES` 로 직접
- **문제(대조가 찾음)**: "FE 계산 0" 을 grep 하니 막대 ÷100 이 두 곳 — 서버가 비율을 주게(`b1c8ad67`). 수용 기준은 커밋 전에 grep 한다
- **판단**: 레지스트리 이름 그대로(`entities/goal` · `features/add-goal`) — 새 이름(`savings-goal` · `create-goal`)을 지었다가 훅이 막았다. 레지스트리를 먼저 본다
- **Action**: S1b 에서 셸(3000)이 비면 셸 경유 · 앱 웹뷰 390 실측(이번 미검증 줄)
