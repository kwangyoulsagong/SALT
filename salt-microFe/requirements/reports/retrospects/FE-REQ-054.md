# FE-REQ-054 — F2 앱 내비게이션 — 회고

2026-11-03 · `feat/fe-req-054-app-navigation` · 루트 `requirements/reports/retrospects/MONEY-F2-app-navigation.md`

## 요약

- 표시(`@repo/ui` `AppNavigation`)와 판정(`@repo/web-shared/layout` `ZoneNavigation` — 레지스트리 · prerender · 계측)을 나눴다. 디자인 시스템이 라우팅을 모르는 규칙을 지키면서 zone 이 늘어도 한 곳만 고친다
- **아이콘을 처음에 선 아이콘(lucide)으로 넣었다가 사용자가 바꾸게 했다** — 직접 만든 아이콘(2025-01) · 기준 증권 웹을 먼저 보지 않았다. 기준 레일을 열어 재고 면 글리프로 다시 그렸다. 기준 화면의 탭은 헤더 글자 탭 + 오른쪽 아이콘 레일이었고, 위치는 사용자 결정으로 왼쪽
- 검증에서 도구 한계를 셋 만났다: ① 토큰 없이 쿠키만 심은 컨텍스트는 마운트 때 표지 동기화가 쿠키를 지웠다(정상 동작) ② 실 BFF 를 끊으면(`route`) 데이터가 없어 임시 사용자 실세션으로 다시 쟀다 ③ **DevTools 프로토콜이 붙은 Chrome 은 prerender 를 끈다**. ③은 우회하지 않고 사람 확인으로 남겼다
- 번들은 Next 표가 줄어드는 것으로 나왔다(레이아웃 몫을 화면 표에서 뺌) — HTML 스크립트 gzip 합으로 다시 재서 +2.6~+9.2 KB 를 적었다
- 사용자가 다시 보고한 로그인 화면 비침을 같은 브랜치에서 재현 · 수정했다 — 로그인 여부를 두 곳(Redux 사용자 · 표지 쿠키)이 따로 판단했다

## Action

- 탭 · 내비 · 진입점 아이콘은 그리기 전에 사용자가 만든 아이콘과 기준 화면을 먼저 연다(메모리 `app-nav-tab-style`)
- 브라우저 자동화로 prerender 를 재지 않는다 — 규칙이 붙었는지 · 시도했는지(CDP `Preload`)까지만 보고 적중은 사람 확인 항목으로
- 번들 PERF 기록은 Next 표와 HTML 스크립트 gzip 합 두 수치를 같이 적는다
- 로그인 여부를 새로 읽는 코드는 `useHasAccessToken` 하나만 쓴다
