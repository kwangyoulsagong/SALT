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

> **2026-11-03 done** — ~~구현 · in-progress~~ (`feat/fe-req-054-app-navigation`, 루트 `requirements/specs/done/MONEY-F2-app-navigation-slice.md`).
> **이름 정정 2026-11-03** — ~~`AppChrome`~~ → **`AppNavigation`**(사용자 결정 — "chrome" 은 브라우저 이름과 겹친다). 파일 이름도 `-APP-NAVIGATION`.
> ~~남은 것: 수용 기준 1(Chromium prerender **적중**)은 사람이 Chrome 에서 본다~~ **정정 2026-11-03 — 확인했다**: DevTools 세션이 붙어 있는 동안 시작된 prerender 만 꺼진다. 포인터를 올린 뒤 세션을 끊고 재면 운영 빌드 적중 10/10.
> ~~남은 것: 공용 청크 캐시 공유(아래 FR-5) · 계측 수집처.~~ **2026-11-03 캐시 공유도 닫음**(운영 빌드 공용 `/_next` · `ADR-005` 규칙 7 개정). 남은 것: 계측 수집처 · 배포 정적 저장소(`OPS-001` FR-12).
> 공용 청크는 해시는 같지만 URL prefix 가 달라 캐시를 공유하지 못한다(FR-5 행). 검증 `checklists/FE-REQ-054.md`.
> **정정 2026-11-09 — 데스크톱(1024+) 도메인 내비는 왼쪽 레일이 아니라 머리 안 글자 링크**(사용자 D1 안 B, `FE-REQ-067` `334084aa`). 하단 탭(768~1023) · 탭 한 벌 · prerender · 전환은 그대로. 아래 FR-1 행 그 자리 정정

## Summary

zone 이 5개면 하단 탭이 가장 잦은 zone 간 이동이다. ~~크롬을~~ **탭 · 머리를(정정 2026-11-03 — 이름 `AppNavigation`)** 한 컴포넌트로 만들고, 이동을 미리 렌더 · 문서 간 전환으로 가린다(`ADR-005` §3).

## FR

| FR | 내용 | FEATURE-015 | 상태(2026-11-03) |
|---|---|---|---|
| FR-1 | `@repo/ui` ~~`AppChrome`~~ **`AppNavigation`**(`@repo/ui/app-navigation`) — 탭 4개(홈 · 저축 · 가계부 · 투자), 금융 팁은 탭 아님. 데스크톱(1024+)은 왼쪽 내비 4항목 — `FE-REQ-047` 헤더 · 패널 위계와 맞춤 | FR-8 | ✅ ~~레일 72(1024+)~~ **머리 글자 링크(1024+ — 정정 2026-11-09 `FE-REQ-067`)** · 하단 탭 56(768~1023) · 머리 52(오른쪽 계정 메뉴 · 검색칸). **아이콘 = 면 채운 단색 글리프 `AppNavigationIcon`**(사용자 "저축 아이콘 별로야" — 선 아이콘 교체), **칸 = 기준 증권 웹 아이콘 레일 실측**(칸 58 · 판 32 · 모서리 8 · 아이콘 16 · 라벨 12/500 3단 · 선택 = 옅은 판 + 진한 아이콘). 기준 화면은 헤더 글자 탭 + 오른쪽 레일이지만 위치는 사용자 결정으로 왼쪽(~~2026-11-03~~ **2026-11-09 사용자 결정으로 기준 화면처럼 머리 글자 탭** — 레일 칸 값은 하단 탭이 이어 쓴다). 탭 한 벌은 `@repo/core/navigation` `APP_TABS`(앱과 같은 순서 · 이름 · 아이콘 이름). 첫 화면이 없는 저축 · 가계부는 `readyBy`(056 · 057)까지 비활성 "준비 중". 공개 화면(로그인 · 온보딩) · 앱 웹뷰에는 없다 |
| FR-2 | 탭 링크는 `CrossZoneLink`. 현재 zone 판정은 레지스트리 | FR-8 | ✅ 판정은 레지스트리(`activeAppTab` · `isCrossZonePath(href, ZONE_APP)`). 다른 zone 이면 `<a>`(대기 문구 없는 `CrossZoneLink` 꼴 — 탭 안에 "이동 중" 글자가 끼면 칸이 흔들린다), 같은 앱이면 `next/link` |
| FR-3 | Speculation Rules — `<script type="speculationrules">` prerender, `eagerness: moderate`, 대상은 탭 4개 첫 화면만. 로그아웃 상태에서는 끔 | FR-8 | ✅ 문서 규칙(`[data-prerender-tab]:not([aria-current])` — 다른 zone 탭만). 로그인 표지 쿠키가 있을 때 마운트 뒤 붙인다. ~~Chrome 이 규칙을 읽고 시도까지 함(CDP). **적중은 미검증**(자동화 브라우저에서는 꺼진다)~~ **2026-11-03 운영 빌드 적중 10/10**(셸 ↔ 투자) · 누름 → 보임 중앙 0~1ms(미적중 101 · 145ms) |
| FR-4 | 모든 zone CSS 에 `@view-transition { navigation: auto; }` · 탭 · 헤더에 같은 `view-transition-name`. `prefers-reduced-motion` 이면 전환 없음 | FR-8 | ✅ 화면이 있는 zone 2(셸 · 투자) `<head>` `<style>`(vanilla-extract 가 이 규칙을 못 만든다). Chromium `pagereveal.viewTransition` 있음 3/3 · 줄인 모션 0/3. 빈 zone 3 은 화면 REQ(056~058) 때 같은 레이아웃 |
| FR-5 | 공용 청크 같은 해시 — zone 별 Next 설정을 공용 프리셋 하나에서(`packages/config-next`) | — | ✅ 프리셋 `@repo/config-next` `zoneNextConfig` — zone 5 전부. **2026-11-03 운영 빌드 공용 `/_next` + 합치기(`pnpm static:merge`) → 셸 → 투자 같은 청크 5개 캐시 · 네트워크 0**(`5c7218e9`). 이전 상태: 셸 · 투자가 같은 해시 청크 9개(gzip 196KB). **그러나 URL 이 `/_next/…` · `/investment-static/_next/…` 로 달라 브라우저 캐시를 공유하지 못한다** — 공유하려면 한 origin 라우팅이 공용 청크를 한 경로로 서비스해야 한다(`OPS-001` · `ADR-008`). 실측: 셸 → 투자에서 같은 이름 청크 5개 · 117 KB 를 다시 받는다 — ~~`ADR-005` 규칙 7 개정이 필요해 사용자 결정 대기~~ 사용자 "그것도 ㄱㄱ" 뒤 개정 |
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
| 2026-11-03 | 구현 · in-progress — 이름 `AppNavigation`(사용자 결정). FR-1~4 · 6 · 7 ✅ · FR-5 🟡(해시 같음 · URL 달라 캐시 공유 없음). 공용 레이아웃이 머리 프로필을 놓고 화면별 `ProfileMenu`(홈 · 투자) 삭제. zone 설정 5개를 프리셋으로. 실화면 5화면 × 800 · 1024 · 1280 · 1440 · 1600 넘침 0 · 앱 웹뷰 390 내비 0. 번들 실측(HTML 이 싣는 JS gzip) +2.7~+9.3 KB(최종 HEAD) |
| 2026-11-03 | 커밋: `1c4c3ee9`(탭 한 벌 · 계측 계산 · 도메인 색) · `5a86dafa`(`AppNavigation`) · `e0bce695`(zone 레이아웃 연결) · `7b8b1110`(설정 프리셋) · `4c234835`(면 글리프 · 레일 실측값) · `f6587a53`(기존 결함: 로그인 화면 비침). 사용자 결정 둘 — 이름 `AppNavigation` · 탭은 왼쪽 레일 + 면 글리프 |
| 2026-11-03 | 저축 탭 아이콘 돼지 저금통 → **동전(W)**(`coin`, 사용자 "돈 아이콘으로 바꿔 돼지 에바야"). `@repo/core/navigation` 아이콘 이름 · 스토리 · 디자인 시스템 인덱스 같이 |
| 2026-11-03 | 미검증 닫기 — prerender 적중 10/10 · 녹화 깜빡임 0 · 운영 빌드 이동 시간 · 공용 청크 재다운로드 실측(5개 · 117 KB). 결함 1(prerender 도착 계측 누락) 수정 `168b0c65`. 수용 기준 5/5 |
| 2026-11-03 | FR-5 닫음 — 운영 빌드는 모든 zone 공용 `/_next`(dev 는 zone 별), 합치기 `scripts/merge-zone-static.mjs`(5 zone · 324 파일 · 같은 내용 159 · 충돌 0). 실측: 같은 청크 5개 캐시 · 네트워크 0(전 117 KB) · Chromium · WebKit 오류 0 · 404 0 · 수화 정상 · prerender 6/6. `ADR-005` 규칙 7 · `OPS-001` FR-12 · `microfrontend.md` §0 · §2-7 · §3 · §5 |
| 2026-11-03 | MONEY-F2(`FE-REQ-054`) — 커밋 대조 — 저축 아이콘 동전(W)은 `423e3e9e` |
| 2026-11-03 | **done** — FR-1~7 · 수용 기준 5/5. 남은 둘(계측 수집처 · 배포 정적 저장소)은 배포 환경 몫 — `OPS-001` FR-9 · FR-12 로 넘겼다(이 REQ 의 수용 기준이 아니다). 루트 `requirements/specs/done/MONEY-F2-app-navigation-slice.md` |
| 2026-11-03 | MONEY-F2(`FE-REQ-054`) — **퇴행 수정** `6ddcb284` — 내비 틀이 768 미만에서도 화면 높이를 잡아 일반 브라우저 390 에서 좁은 화면 안내가 844px 아래(빈 한 화면 뒤)에서 시작했다 → 0. 앱 웹뷰 태블릿(820)의 숨은 하단 탭 여백 56px → 0(일반 820 은 56 유지) |
| 2026-11-03 | 독립 코드 리뷰(high) 10건 — 9건 수정 `378d8a1c`: ① 로그인 직후(같은 탭 soft 이동) 규칙 미삽입 → 경로마다 다시 확인 ② 탭이 `CrossZoneLink` 를 다시 씀(대기 문구만 끔) ③ 수정키 · 가운데 클릭은 계측 안 함 ④ 계측 단위 = 서비스하는 앱(`fromApp` · `toApp`) ⑤ 공개 화면 `bare` — 틀 유지 · 본문 트리 다시 만들지 않음 ⑥ `@repo/ui` 한글 기본값 제거(`label` 필수) ⑦ 합치기 `--out` 상대 경로 · 빈 값 · dev 산출물 감지 ⑧ 토큰 주석 위치 ⑨ 운영 기동 순서(빌드 → 합치기 → 기동) · `ZONE_STATIC` 빌드 · 기동 같은 값 문서화. **해당 없음 1건**: 숨은 prerender 페이지의 토큰 갱신 경쟁 → 로그아웃 — 리프레시 토큰이 회전하지 않아(`refreshSession.ts`) 동시 갱신이 둘 다 성공한다. 숨은 페이지가 데이터 연결을 미리 여는 것은 prerender 의 목적. 확인: 배치 25 넘침 0 · 일반/웹뷰 390 · 820 · 로그인 직후 규칙 0 → 1 · Cmd 클릭 표지 0 · 탭 안 대기 문구 0 · 운영 빌드 오류 0 · 404 0 · 수화 · 같은 청크 5 캐시 · prerender 4/4(`fromApp` · `toApp`). 번들(HTML 이 싣는 JS gzip, 최종 HEAD `378d8a1c`) +2.7~+9.3 KB |
| 2026-11-03 | 브라우저 · 접근성 마감 `d80a7ac8` — 운영 빌드 Chromium · WebKit · Firefox: 로그인 → 탭 왕복 · 지금 탭 · 넘침 0 · 오류 0. 키보드: 홈 → 투자 → 계정 메뉴 → 본문, 포커스 테두리 2px, '준비 중' 탭 포커스 안 됨. **axe**: 레일 미선택 라벨 2.92:1(실측값 그대로 옮긴 것 — AA 미달) → 회색 700 6.45:1 로 고침. 남은 1건은 기존 `ProfileSection` 이메일 글자 2.18:1(main 에서도 같은 색 — 기존 색 일괄 변경 금지 규칙으로 이번엔 두고 `FE-REQ-047` 머리 재설계 몫). Firefox 는 macOS 기본 설정에서 Tab 이 링크로 가지 않는다(`accessibility.tabfocus=7` 로 확인) · dev 에서는 Next 개발 도구가 포커스를 잡아 운영 빌드로 쟀다 |
| 2026-11-03 | MONEY-S1a — 이 REQ 에 걸린 몫(`c60f5bfb`): 넘겨받은 몫 셋 닫음 — `APP_TABS` 저축 `readyBy: null` · 저축 zone 레이아웃 `AppShell` + `VIEW_TRANSITION_CSS` · `next.config.js` vanilla-extract. 탭 테스트 갱신 |
| 2026-11-03 | MONEY-S1a — `11224e9a` — `APP_TABS` 저축 줄 주석을 "화면이 아직 없다" → "저축 zone 첫 화면 `/goals`"로(동작 무변경) |
| 2026-11-04 | 가계부 S1a(`MONEY-S1-household-entry`) — 가계부 탭 `readyBy: null`(눌린다) · 탭 테스트("첫 화면 없는 탭" 목록 빈 배열) · zone 레이아웃 `AppShell` + `VIEW_TRANSITION_CSS`(`df45ae7d`) |
| 2026-11-04 | 로고(`FE-REQ-051`) — 파일만 걸침(`25f182f6`): `ZoneNavigation` 이 `AppNavigation` `brand` 칸에 `HeaderBrand`(로고 → `/home`)를 넣는다 · `NAVIGATION_FRAME_MESSAGES.brandHomeLabel` 추가. 내비 동작 diff 0 |
| 2026-11-05 | **기존 결함 수정** `99efcd15` — 앱 머리(`viewTransitionName` → 쌓임 맥락)에 z-index 가 없어 계정 메뉴가 홈 카드에 깔렸다(로그아웃 불가, `5a86dafa` 부터). 머리에 `zIndex: sticky`(레일 · 하단 탭과 같은 규칙) · `@repo/ui` `viewTransitionStacking.test.ts` 가 모든 `.css.ts` 를 센다. 같은 브랜치에 셸 rewrites `/api/*` → BFF(`config-next` `shellRewrites`) · 로그아웃이 쿠키 지움을 기다린다(`ProfileMenu`)(`721063fc`). 루트 `requirements/specs/done/F000-cookie-session-slice.md` |
| 2026-11-05 | 금융 팁 S2a(`MONEY-S2a-tips-content`, 루트 `requirements/specs/done/MONEY-S2a-tips-content-slice.md`) — 이 REQ 에 걸린 몫: 팁 zone `next.config.js` 를 가계부와 같은 프리셋 꼴로(vanilla-extract). 금융 팁은 탭이 아니라 `AppShell` 을 쓰지 않는다(이 REQ 의 2026-11-03 메모 — 공개 화면 내비 · prerender 판단: 둘 다 없음) |
| 2026-11-05 | 금융 팁 S2b 확인 2회차(루트 `requirements/specs/done/MONEY-S2b-tips-quiz-diff-slice.md`) — 이 REQ 에 걸린 몫: `ZoneNavigation` 의 공개 경로 판정을 `@repo/core/auth` `isPublicPath` 로(같은 규칙 — 동작 무변경, `/home` · `/goals` 탭 4 · `/login` 0 실화면) (`cf93acb1`) |
| 2026-11-09 | FR-1 정정 — 1024+ 도메인 내비 왼쪽 레일 → 머리 글자 링크(`FE-REQ-067` D1 안 B · `334084aa`). 전환 이름 `app-navigation-rail` 삭제. 판단은 `FE-REQ-067` |
| 2026-11-09 | FE-066 · 067(검색 모달 · 머리 내비 — 커밋 `334084aa`, 루트 `requirements/specs/in-progress/FE-066-067-search-header-slice.md`) — FR-1 정정 — 1024+ 왼쪽 레일 → 머리 글자 링크(`FE-REQ-067` D1 안 B) · 전환 이름 `rail` 삭제 · `appTabs.ts` 주석 |
