---
id: FE-REQ-054
feature: F015
area: frontend
kind: UI
title: "F2 — AppNavigation(하단 탭 · 머리 · 데스크톱 왼쪽 레일) + zone 이동 완화(prerender · 문서 간 전환)"
priority: high
created: 2026-10-30
source: pm/requirements/specs/in-progress/FEATURE-015-shell-home-onboarding.md
---

> **2026-11-03 구현 · in-progress** (`feat/fe-req-054-app-navigation`, 루트 `requirements/specs/in-progress/MONEY-F2-app-navigation-slice.md`).
> **이름 정정 2026-11-03** — ~~`AppChrome`~~ → **`AppNavigation`**(사용자 결정 — "chrome" 은 브라우저 이름과 겹친다). 파일 이름도 `-APP-NAVIGATION`.
> ~~남은 것: 수용 기준 1(Chromium prerender **적중**)은 사람이 Chrome 에서 본다~~ **정정 2026-11-03 — 확인했다**: DevTools 세션이 붙어 있는 동안 시작된 prerender 만 꺼진다. 포인터를 올린 뒤 세션을 끊고 재면 운영 빌드 적중 10/10.
> 남은 것: 공용 청크 캐시 공유(아래 FR-5) · 계측 수집처.
> 공용 청크는 해시는 같지만 URL prefix 가 달라 캐시를 공유하지 못한다(FR-5 행). 검증 `checklists/FE-REQ-054.md`.

## Summary

zone 이 5개면 하단 탭이 가장 잦은 zone 간 이동이다. ~~크롬을~~ **탭 · 머리를(정정 2026-11-03 — 이름 `AppNavigation`)** 한 컴포넌트로 만들고, 이동을 미리 렌더 · 문서 간 전환으로 가린다(`ADR-005` §3).

## FR

| FR | 내용 | FEATURE-015 | 상태(2026-11-03) |
|---|---|---|---|
| FR-1 | `@repo/ui` ~~`AppChrome`~~ **`AppNavigation`**(`@repo/ui/app-navigation`) — 탭 4개(홈 · 저축 · 가계부 · 투자), 금융 팁은 탭 아님. 데스크톱(1024+)은 왼쪽 내비 4항목 — `FE-REQ-047` 헤더 · 패널 위계와 맞춤 | FR-8 | ✅ 레일 72(1024+) · 하단 탭 56(768~1023) · 머리 52(오른쪽 계정 메뉴). **아이콘 = 면 채운 단색 글리프 `AppNavigationIcon`**(사용자 "저축 아이콘 별로야" — 선 아이콘 교체), **칸 = 기준 증권 웹 아이콘 레일 실측**(칸 58 · 판 32 · 모서리 8 · 아이콘 16 · 라벨 12/500 3단 · 선택 = 옅은 판 + 진한 아이콘). 기준 화면은 헤더 글자 탭 + 오른쪽 레일이지만 위치는 사용자 결정으로 왼쪽. 탭 한 벌은 `@repo/core/navigation` `APP_TABS`(앱과 같은 순서 · 이름 · 아이콘 이름). 첫 화면이 없는 저축 · 가계부는 `readyBy`(056 · 057)까지 비활성 "준비 중". 공개 화면(로그인 · 온보딩) · 앱 웹뷰에는 없다 |
| FR-2 | 탭 링크는 `CrossZoneLink`. 현재 zone 판정은 레지스트리 | FR-8 | ✅ 판정은 레지스트리(`activeAppTab` · `isCrossZonePath(href, ZONE_APP)`). 다른 zone 이면 `<a>`(대기 문구 없는 `CrossZoneLink` 꼴 — 탭 안에 "이동 중" 글자가 끼면 칸이 흔들린다), 같은 앱이면 `next/link` |
| FR-3 | Speculation Rules — `<script type="speculationrules">` prerender, `eagerness: moderate`, 대상은 탭 4개 첫 화면만. 로그아웃 상태에서는 끔 | FR-8 | ✅ 문서 규칙(`[data-prerender-tab]:not([aria-current])` — 다른 zone 탭만). 로그인 표지 쿠키가 있을 때 마운트 뒤 붙인다. ~~Chrome 이 규칙을 읽고 시도까지 함(CDP). **적중은 미검증**(자동화 브라우저에서는 꺼진다)~~ **2026-11-03 운영 빌드 적중 10/10**(셸 ↔ 투자) · 누름 → 보임 중앙 0~1ms(미적중 101 · 145ms) |
| FR-4 | 모든 zone CSS 에 `@view-transition { navigation: auto; }` · 탭 · 헤더에 같은 `view-transition-name`. `prefers-reduced-motion` 이면 전환 없음 | FR-8 | ✅ 화면이 있는 zone 2(셸 · 투자) `<head>` `<style>`(vanilla-extract 가 이 규칙을 못 만든다). Chromium `pagereveal.viewTransition` 있음 3/3 · 줄인 모션 0/3. 빈 zone 3 은 화면 REQ(056~058) 때 같은 레이아웃 |
| FR-5 | 공용 청크 같은 해시 — zone 별 Next 설정을 공용 프리셋 하나에서(`packages/config-next`) | — | 🟡 프리셋 `@repo/config-next` `zoneNextConfig` — zone 5 전부. 셸 · 투자가 같은 해시 청크 9개(gzip 196KB). **그러나 URL 이 `/_next/…` · `/investment-static/_next/…` 로 달라 브라우저 캐시를 공유하지 못한다** — 공유하려면 한 origin 라우팅이 공용 청크를 한 경로로 서비스해야 한다(`OPS-001` · `ADR-008`). 실측: 셸 → 투자에서 같은 이름 청크 5개 · 117 KB 를 다시 받는다 — `ADR-005` 규칙 7 개정이 필요해 사용자 결정 대기 |
| FR-6 | 계측 — zone 간 전환 시간 · prerender 적중률(브라우저별) | NFR 관측성 | ✅ 계산 `@repo/core/navigation`(테스트) · 기록 `performance.mark("salt:zone-nav")`. 실측 dev Chromium 185~945ms · WebKit 111~385ms. **결함 수정 `168b0c65`** — prerender 로 도착하면 마운트가 누르기 전이라 계측이 비었다(적중률이 늘 0) → 활성화(`prerenderingchange`) 뒤 읽는다. 수집처는 없다(관측성 배포 시) |
| FR-7 | 도메인 색 토큰 추가(기존 색 변경 0 — 기존 UI 결정 존중) | FR-7 | ✅ `tokens.colors.domain`(home · savings · household · invest · tips) — 추가 11줄 · 삭제 0. ~~지금 탭 아이콘에만~~ **정정 2026-11-03: 탭에는 쓰지 않는다**(기준 레일처럼 단색) — 홈 카드 등 도메인 표지 자리 몫 |

## Acceptance Criteria

- [x] Chromium 에서 탭 이동 시 prerender 적중 — 운영 빌드 10/10(`activationStart` > 0 · 계측 `prerendered: true`)
- [x] Safari 에서 일반 이동 · 깨짐 0 — WebKit 800 · 1280 왕복 4회, 페이지 오류 0 · 넘침 0 · 규칙 붙지 않음
- [x] ~~크롬이~~ **탭 · 머리가** 전환 중 깜빡이지 않음(녹화) — 3경로 354프레임, 레일 · 머리 빈 프레임 0 · 흰 번쩍임 0
- [x] reduced-motion 에서 전환 0 — 3/3 `viewTransition` 없음
- [x] 기존 토큰 값 diff 0 — `tokens/src/index.ts` 추가 11 · 삭제 0

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-30 | 신규(to-do) |
| 2026-11-03 | 구현 · in-progress — 이름 `AppNavigation`(사용자 결정). FR-1~4 · 6 · 7 ✅ · FR-5 🟡(해시 같음 · URL 달라 캐시 공유 없음). 공용 레이아웃이 머리 프로필을 놓고 화면별 `ProfileMenu`(홈 · 투자) 삭제. zone 설정 5개를 프리셋으로. 실화면 5화면 × 800 · 1024 · 1280 · 1440 · 1600 넘침 0 · 앱 웹뷰 390 내비 0. 번들 실측(HTML 이 싣는 JS gzip) +2.6~+9.2 KB(최종 HEAD) |
| 2026-11-03 | 커밋: `1c4c3ee9`(탭 한 벌 · 계측 계산 · 도메인 색) · `5a86dafa`(`AppNavigation`) · `e0bce695`(zone 레이아웃 연결) · `7b8b1110`(설정 프리셋) · `4c234835`(면 글리프 · 레일 실측값) · `f6587a53`(기존 결함: 로그인 화면 비침). 사용자 결정 둘 — 이름 `AppNavigation` · 탭은 왼쪽 레일 + 면 글리프 |
| 2026-11-03 | 저축 탭 아이콘 돼지 저금통 → **동전(W)**(`coin`, 사용자 "돈 아이콘으로 바꿔 돼지 에바야"). `@repo/core/navigation` 아이콘 이름 · 스토리 · 디자인 시스템 인덱스 같이 |
| 2026-11-03 | 미검증 닫기 — prerender 적중 10/10 · 녹화 깜빡임 0 · 운영 빌드 이동 시간 · 공용 청크 재다운로드 실측(5개 · 117 KB). 결함 1(prerender 도착 계측 누락) 수정 `168b0c65`. 수용 기준 5/5 |
