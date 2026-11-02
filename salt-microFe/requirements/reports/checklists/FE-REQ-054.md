# FE-REQ-054 — F2 앱 내비게이션(AppNavigation) · zone 이동 완화 — 체크리스트

스펙: `salt-microFe/requirements/specs/in-progress/FE-REQ-054-F015-APP-NAVIGATION.md` · 2026-11-03
브랜치: `feat/fe-req-054-app-navigation` (base `main` `b822df43`) · 루트 슬라이스 `requirements/specs/in-progress/MONEY-F2-app-navigation-slice.md`
커밋: `1c4c3ee9` · `5a86dafa` · `e0bce695` · `7b8b1110` · `4c234835` · `f6587a53`(기존 결함)

## 1. FR ↔ 구현

| FR | 구현 | 상태 |
|---|---|---|
| FR-1 탭 4 · 레일 | `@repo/ui/app-navigation` `AppNavigation`(레일 72 · 1024+ / 하단 탭 56 · 768~1023 / 머리 52) · `AppNavigationIcon`(면 채운 단색 글리프 4) · 탭 한 벌 `@repo/core/navigation` `APP_TABS`(순서 · 이름 · 아이콘 이름 · zone · 첫 화면 · `readyBy`). 저축 · 가계부 비활성(`FE-REQ-056` · `057`) | ✅ |
| FR-2 링크 · 판정 | `ZoneNavigation` — `activeAppTab`(레지스트리 zone) · `isCrossZonePath(href, ZONE_APP)` → `<a>` / `next/link` | ✅ |
| FR-3 prerender | `prerenderRules.ts` 문서 규칙(`[data-prerender-tab]:not([aria-current])`, `moderate`) · `SpeculationRules` 마운트 뒤 · 표지 쿠키 있을 때만 · 미지원이면 아무것도 안 함 | ✅ 규칙 · 🟡 적중 미검증 |
| FR-4 문서 간 전환 | `VIEW_TRANSITION_CSS`(`@view-transition` + 줄인 모션 끔) — 셸 · 투자 zone `<head>`. 레일 · 하단 탭 · 머리 `view-transition-name` | ✅ |
| FR-5 공용 프리셋 | `packages/config-next` `zoneNextConfig` — zone 5 `next.config.js` | 🟡 해시 같음 · 캐시 공유 없음 |
| FR-6 계측 | `@repo/core/navigation` `buildZoneNavigationMetric`(테스트) · `zoneNavigationMetrics.ts` `performance.mark("salt:zone-nav")` | ✅ (수집처 없음) |
| FR-7 도메인 색 | `tokens.colors.domain` 5 — 추가 11 · 삭제 0. 탭에는 쓰지 않는다(정정) | ✅ |

## 2. 검증 (실행한 것만, 최종 HEAD `f6587a53`)

| 확인 | 결과 |
|---|---|
| `pnpm check-types` · `pnpm lint` | 10/10 · 10/10 |
| `pnpm test` | `@repo/core` 81(새 `navigation.test.ts` 19) · `@repo/ui` 43 |
| `pnpm test:layer-check` | 차단 16 · 통과 10 |
| 훅 사후 실행 | `git diff main` 코드 파일 37 전부 exit 0 |
| zone 5 빌드 | 5/5. 빈 zone 86 kB 그대로 |
| `build-storybook` | 성공(`AppNavigation` 5 스토리 — 경고는 기존 `"use client"` 지시어) |
| 번들 — Next 표(main 워크트리 대조) | 셸 공용 103 · 투자 공용 104 그대로 · `/home` 169 → 158 · `/investments` 159 → 139 · 나머지 같음 |
| 번들 — **HTML 이 싣는 JS gzip**(main 대조) | `/home` +9.2 · `/settings` +2.6 · `/onboarding` +2.6 · `/investments` +3.4 · `/coach/report` +2.6 · `/search` +3.5 KB — 예산 40 안. Next 표가 준 것은 레이아웃 몫을 화면 표에서 빼고 세서다 |
| 공용 청크 | 셸 · 투자가 같은 해시 청크 9개(gzip 196 KB). URL 은 `/_next/…` · `/investment-static/_next/…` 로 다르다 |
| 실화면 배치(Chromium, 5화면 × 800 · 1024 · 1280 · 1440 · 1600) | 넘침 0/25 · 레일 72 / 하단 탭 / 머리 52 전환 · 지금 탭(홈 · 투자 · 설정 = 없음) · 프로필 머리 한 자리 |
| 앱 웹뷰(390, UA `SALTApp/`) | 레일 · 하단 탭 · 머리 모두 숨김 · 넘침 0 |
| 문서 간 전환 | `pagereveal.viewTransition` 있음 3/3 · 줄인 모션 0/3 |
| prerender | 규칙 붙음(셸 · 투자) · Chrome 이 시도(CDP `Preload`) — **적중은 `PrerenderingDisabledByDevTools`** 로 자동화에서 막힘(헤드리스 셸 · 풀 Chromium · 직접 띄운 Chromium + CDP 셋 다) |
| WebKit(Safari 엔진, 800 · 1280 왕복 4) | 일반 이동 · 페이지 오류 0 · 넘침 0 · 규칙 안 붙음 · 계측 `browser: "safari"` |
| 이동 계측(dev, 임시 사용자) | Chromium 185~945 ms · WebKit 111~385 ms(dev 서버 · 한 번씩 — 판정용 아님) |
| 기준 레일 실측(1440, 계산 스타일) | 칸 42×58 · 판 32 · 모서리 8 · 아이콘 16 · 미선택 `#B0B8C1` · 선택 판 `rgba(7,25,76,.04)` + 0.75px 안쪽 선 · 라벨 12/500 `rgba(18,31,51,.47)` → 레일에 반영(`4c234835`) |
| 기존 결함(로그인 화면 비침) | 재현 · 수정 · 재확인 — `FE-REQ-011` 체크리스트 |
| 임시 사용자 | 2회 생성 · 삭제 — 계정 5 → 6 → 5, 초대 코드 · 시도 기록 남은 행 0 |

## 3. 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| Chromium prerender **적중**(수용 기준 1) | DevTools 프로토콜이 붙은 브라우저는 prerender 를 끈다 — 자동화로 볼 수 없다 | 사람이 평소 Chrome 에서 DevTools → Application → Speculative loads 로 확인(`QA-001`) |
| 전환 중 탭 · 머리 깜빡임 녹화(수용 기준 3) | 녹화는 사람 확인 | `QA-001` |
| 공용 청크 캐시 공유 | 해시는 같지만 assetPrefix 가 달라 URL 이 다르다 | 한 origin 라우팅이 공용 청크를 한 경로로(`OPS-001` · `ADR-008`) |
| 계측 수집처 | 관측성 배포가 없다 | 배포 환경 확정 시(`OPS-001`) |
| 빈 zone 3 의 내비 · 전환 | 화면이 없다(탭 비활성) | `FE-REQ-056` · `057` · `058` |
| 운영 빌드 이동 시간 | dev 수치만 | 배포 환경 확정 시 |
