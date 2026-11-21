---
id: FE-REQ-071
feature: F019
area: frontend
kind: ARCH
title: "휴대폰 PWA zone 골격 — apps/web-mobile(/m/*) · 매니페스트 · 서비스 워커 · 하단 탭 · /m/login · 데스크톱 → /m 이동"
priority: high
created: 2026-11-20
source: 사용자 "pwa에도 전용 마이크로프론트엔드로 하고 서로 url이 다를듯" · ADR-012
---

## Summary

`ADR-012` 순서 1. 화면 없이 **틀만** — 설치 · 실행 · 탭 이동 · 로그인 · 데스크톱 주소에서 넘어오기가 휴대폰에서 끝까지 돈다. 화면 내용은 `FE-REQ-072`.

## FR

| FR | 내용 |
|---|---|
| FR-1 | `apps/web-mobile` — 라우트는 `app/m/**`(basePath 없음) · 레지스트리(`@repo/core/zones` `registry.json`)에 표면 항목(`surface: "mobile"` · 경로 `/m` · 포트 3006 · dev assetPrefix `/mobile-static`) · 셸 rewrites 생성 · 운영 공용 `/_next` · `pnpm static:merge` 포함 |
| FR-2 | 레이어 규칙(`layer-rules.cjs` 한 곳 · 훅 시험 케이스 추가) — 모바일 zone 은 `@repo/domain-*/mobile/*` 진입점 · `@repo/web-shared` · `@repo/ui` · `@repo/core` 만. `domain-*/pages/*` import 금지 |
| FR-3 | 매니페스트 `/m/manifest.webmanifest` — `id` · `scope` `"/m/"` · `start_url` `/m/home` · `display: standalone` · `theme_color` · 아이콘 192 · 512(any) + 512(maskable, 안전 영역 80%) — 원본은 `@repo/tokens` `BRAND_MARK`(`pnpm brand:icons` 확장). `<link rel="manifest">` · `apple-touch-icon` · `viewport-fit=cover` 는 `/m` 레이아웃에만 |
| FR-4 | 서비스 워커 `/m/sw.js` · `scope: '/m/'` · `updateViaCache: 'none'` · 응답 `Cache-Control: no-cache` — 정적 파일 · `/m/offline` 한 장 precache, 문서 · RSC · API 는 네트워크만(문서 실패면 오프라인 한 장). 배포 판이 바뀌면 옛 캐시 지움. 루트 범위 등록 0 |
| FR-5 | 틀 — 하단 탭 넷(`APP_TABS` · 아이콘 같은 이름) · `env(safe-area-inset-*)` · `100dvh` · `overscroll-behavior-y: none` · 입력 16px 이상 · 탭 이동은 같은 zone soft navigation |
| FR-6 | `/m/login` — 셸 로그인 폼과 같은 기능 쓰기(feature 를 패키지로 내리거나 같은 BFF 계약) · 로그인 뒤 `/m/home` · 쿠키는 그대로 path `/` |
| FR-7 | 이동 — 데스크톱 zone 공용 미들웨어(판정 함수는 `@repo/core` 한 곳 · 표 시험): 휴대폰(`Sec-CH-UA-Mobile: ?1` 또는 UA `Mobile`/`iPhone`, 태블릿 제외) · `Sec-Fetch-Mode: navigate` GET · `RSC`/prefetch/API/정적/봇 제외 · 쿠키 `view=desktop` 없음 · 대응표에 있는 경로 → 302 `/m/…` + `Vary: User-Agent, Sec-CH-UA-Mobile` + `Cache-Control: private`. `/m` 은 되돌려 보내지 않는다 · "데스크톱 화면으로 보기"가 쿠키를 단다 |
| FR-8 | 768 미만 안내 문구 "데스크톱으로 이동해 주세요"(대응 화면이 없는 데스크톱 경로의 대비) — `FE-REQ-043` 안내 그대로 |

## 구현 (2026-11-20 `feat/fe-req-071-pwa-zone-skeleton`)

| FR | 어디 |
|---|---|
| FR-1 | `apps/web-mobile`(`app/m/**` · basePath 없음) · `registry.json` `mobile`(`surface` · 3006 · `/mobile-static`) · 셸 rewrites 자동 · `ops/salt.sh` 이름 표 |
| FR-2 | `layer-rules.cjs` `mobile-domain`(`@repo/domain-<x>/mobile` 밖이면 막음) · 휴대폰 zone 도 `thin-zone` · 훅 시험 +4 |
| FR-3 | `@repo/web-shared/layout/mobile` `routes.ts`(매니페스트 · 메타 · viewport) · 아이콘 넷 `pnpm brand:icons` → `public/m/icons/` |
| FR-4 | 같은 파일 `serviceWorkerSource` · `RegisterServiceWorker`(운영 빌드만) · 오프라인 한 장은 스스로 완결된 HTML |
| FR-5 | `MobileShell` · `MobileTabBar`(`APP_TABS` + `/m`) · 글자는 `appType` 만(`fontSizeBudget.test.ts` 휴대폰 표면 칸) |
| FR-6 | 셸 로그인 폼 · 계약을 `@repo/web-shared/layout/sign-in` 으로 내림 — 셸 `features/sign-in` 은 Redux 몫만 · `/m/login` 같은 폼 |
| FR-7 | `@repo/core/mobile` `mobileRedirectOf` · 데스크톱 zone 다섯 `middleware.ts` 302 · 대응표 `mobileRedirects`(이번엔 `/` · `/login` → `/m/login` 만 — 탭 화면은 `FE-REQ-072` 가 행을 더함) · `/m/desktop` 쿠키 · `/m` 문서에서 쿠키 지움 |
| FR-8 | 문구는 순서 0 에서 이미("데스크톱으로 이동해 주세요") — 변화 없음 |

## 검증

- 휴대폰 UA(Playwright 기기 · 실제 휴대폰) — 설치 가능(Chrome 매니페스트 진단) · standalone · 탭 넷 이동 문서 이동 0 · 로그인
- 이동 미들웨어 경계 표 시험(휴대폰 · 태블릿 · 데스크톱 · 쿠키 · RSC · prefetch · API · POST)
- 데스크톱 경로에서 SW 등록 0 · 매니페스트 링크 0 · 운영 빌드 정적 합치기 충돌 0

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-11-20 | 신규(to-do) — `ADR-012` 순서 1 |
| 2026-11-20 | **done** — 구현 표 위. 판단: 배럴 밖 입구 둘(`layout/sign-in` · `layout/mobile` — 레이아웃 배럴에 두면 데스크톱 zone 다섯 번들에 딸려 감) · 대응표는 실제 화면이 있는 로그인만 · 탭 넷은 자리 한 장. 실기기(iOS · Android 설치)는 사용자 휴대폰 — `QA-001` Q-7 |
| 2026-11-20 | `FE-REQ-072` 가 걸침(`feat/fe-req-072-mobile-screens`) — `/m` 탭 넷 자리 화면(`MobilePendingPage`)을 실제 화면으로 바꿨다 · 레이아웃에 표면 표지 `data-surface` · 휴대폰 틀에 조각(`MobileScreen` · `MobileHead` · `MobileSection` · `MobileSummary` · `MobileSheetAction` — 하단 탭 위) · 홈 입구 `layout/mobile/home` · 디자인 시스템 크기 표지 규칙. 루트 `requirements/specs/done/F019-s2-mobile-screens-slice.md` |
| 2026-11-20 | `FE-REQ-074` 가 걸침(`feat/fe-req-074-mobile-tab-interiors`) — `layout/mobile` 입구에 `DesktopViewFoot`(바닥 안내 + 회색 알약) · `MobileShortcuts`(바로가기 목록 카드 — 홈에서 꺼냄)를 더했다 |
| 2026-11-20 | 걸침 — `FE-REQ-076` 1단계(데스크톱 카드 판): 휴대폰 홈 알약 문구를 `@repo/core/labels` `HOME_CARD_PILL_LABEL` 로 옮김(데스크톱 홈과 한 벌) — 값 그대로 |
| 2026-11-21 | 걸침 — `FE-REQ-073`(`feat/fe-req-073-mobile-offline-install`): 서비스 워커 오프라인 한 장이 그 경로의 한 벌을 그린다(인라인 스크립트 · `offlinePage.ts` 로 옮김) · 루트 레이아웃 잎이 설치 사건을 붙잡는다 · `@repo/core/mobile` 에 `offline` 계약 |
| 2026-11-21 | 걸침 — `FE-REQ-078`(`feat/f019-s4-web-push`): 서비스 워커에 `push` · `notificationclick` · 등록 뒤 푸시 구독 대조 · `@repo/core/mobile` 에 `push` 판정. 범위 · 캐시 규칙 변화 0 |
