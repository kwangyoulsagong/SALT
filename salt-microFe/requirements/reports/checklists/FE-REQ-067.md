# FE-REQ-067 체크리스트 — 머리 내비(안 B) · 머리 검색칸

## 2026-11-09 — `334084aa`

| FR | 구현 위치 | 결과 |
|---|---|---|
| FR-1 링크 14/600 · 36 · 8×12 · 모서리 9 · 진하기로만 · `aria-current` | `@repo/ui` `AppNavigation.css.ts` `item` `placement: header` | ✅ 실측 36/14px/600 · 선택 `rgb(25,31,40)` · 미선택 `rgba(22,31,46,.64)` |
| FR-2 검색칸 200×32 · `/` | `AppNavigationSearch` · `isTypingTarget`(경계 표 10) · `HeaderSearchLink`(다른 zone = `/search` 링크) | ✅ 200×32 · 이름 "종목 검색 — / 를 눌러 검색해요" · 안 글자 회색 700(실측 #6B7684 는 axe 대비 미달) |
| FR-3 머리 하나 | `AppShell` `headerSearch` → `ZoneNavigation` → `AppNavigation` | ✅ zone 은 칸만 바꾼다 |
| FR-4 레일 삭제 · 하단 탭 유지 | `AppNavigation.tsx` · `.css.ts` | ✅ `[data-app-navigation="rail"]` 0 · 768~1023 하단 탭 그대로 |
| FR-5 prerender · 전환 | 같은 `AppTabLink` · 전환 이름 `rail` 삭제 | ✅ 링크 표지 그대로 · ~~⬜ 전환 시간 계측(아래)~~ ✅ 2026-11-10 퇴행 0(아래 표) |

| 검증 | 결과 |
|---|---|
| 실화면 3001 — 홈 · 투자 · 저축 · 가계부 × 1024 · 1280 · 1440 · 1600 | 머리 52 · 링크 넷 · 지금 탭 하나 · 넘침 0 (16/16) |
| axe(머리) 1440 × 네 zone | 0(처음 1 — 검색칸 안 글자 대비 → 회색 700) |
| 모노레포 check-types · lint · test(core · ui) · `test:layer-check` | 통과(차단 16 · 통과 10) |
| zone 운영 빌드 다섯(worktree) · `build-storybook` | 통과 · 셸 `/home` 첫 로드 160 kB 같음 |
| 레이어 훅 사후 실행(Bash 로 쓴 파일 전부) | 음성 대조 exit 2 · 차단 0 |

| 미검증 · 범위 밖 | 사유 | 언제 닫히나 |
|---|---|---|
| ~~zone 전환 시간 퇴행 0(`FE-REQ-054` FR-6 방식)~~ **닫힘 2026-11-10** | ~~운영 빌드 다섯 zone 동시 기동 + CDP prerender 절차가 필요 — 링크 · prerender 표지 코드는 그대로(같은 `AppTabLink`)~~ A/B 운영 빌드 · Chrome 157 — 적중 10/10 · 퇴행 0 | — |
| 768~1023 머리 검색칸 | 하단 탭 화면은 머리 칸이 좁아 숨겼다 — `/` 단축키는 투자 zone 에서 그대로 | 디자인 단계(`FE-REQ-047`) |

## 2026-11-10 — zone 전환 계측(남은 수용 기준)

같은 날 A/B — 머리 내비 전 `a1a2feea` · 지금 `0602fdad`. worktree 마다 zone 다섯 운영 빌드 + `static:merge`(충돌 0) · 셸 `next start`(3100 · 3200) · 투자 zone(3102 · 3202, `ZONE_INVEST_ORIGIN` 빌드 때). 순수 CDP(DevTools 프런트 없음) · 경로 `/home ↔ /investments` 머리 탭 · 5회씩 · 기록은 도착 문서의 `salt:zone-nav`.

| 경우 | BASE(전) | HEAD(지금) |
|---|---|---|
| Chrome 157 — 올린 뒤 누름 · prerender 적중 | 10/10 | 10/10 |
| 그때 누름 → 보임 중앙(셸→투자 · 투자→셸) | 1 · 1ms | 2 · 1ms |
| Chrome 157 — 바로 누름(미적중) 중앙 | 119 · 73ms | 80 · 73ms |
| 헤드리스 셸(prerender 안 함) 중앙 | 81 · 76ms | 89 · 67ms |

판정: **퇴행 0**(적중 · 미적중 모두 같은 범위 — `FE-REQ-054` 기준 적중 0~1ms · 미적중 101 · 145ms 와도 같다).

| 측정에서 알게 된 것 | |
|---|---|
| 끊는 때 | 포인터를 올리고 300ms 기다린 뒤 끊으면 적중 0 — moderate 는 약 200ms 에 시작해 그때 세션이 붙어 있으면 `PrerenderingDisabledByDevTools`(Preload 이벤트로 확인). **올린 직후 끊는다** |
| 브라우저 | Playwright 헤드리스 셸 141 은 prerender 를 하지 않는다(적중 0/20) · Playwright Chromium 133 은 prerender 활성화 때 두 번 죽었다 → 설치된 Chrome 157(버리는 프로필) |
| 정리 | 서버 넷 · 브라우저 · worktree 둘 지움 |

## 2026-11-10 — 투자 머리 메뉴 · 레일 복원 · 포트폴리오(주인 `FE-REQ-069`)

- 확인은 `FE-REQ-069` 체크리스트(실화면 24칸 · 넘침 0 · axe 0 · 운영 빌드 · zone 전환 9/10)

## 2026-11-13 — 서버 S3d(짝 — `MONEY-S3d-identity-classify-usage`)

- 이 REQ 몫: 공용 `ZoneNavigation` 마운트 효과에 도메인 방문 계측 한 번(도메인 zone · 공개 경로 아님 · 로그인일 때) · `ZoneLink` `onClick` 칸
- 확인: zone 다섯 운영 빌드 · 실스택 투자 zone 도착 → `visit` +1
- 미검증: 없음
