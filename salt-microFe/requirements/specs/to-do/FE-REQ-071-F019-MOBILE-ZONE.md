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

## 검증

- 휴대폰 UA(Playwright 기기 · 실제 휴대폰) — 설치 가능(Chrome 매니페스트 진단) · standalone · 탭 넷 이동 문서 이동 0 · 로그인
- 이동 미들웨어 경계 표 시험(휴대폰 · 태블릿 · 데스크톱 · 쿠키 · RSC · prefetch · API · POST)
- 데스크톱 경로에서 SW 등록 0 · 매니페스트 링크 0 · 운영 빌드 정적 합치기 충돌 0

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-11-20 | 신규(to-do) — `ADR-012` 순서 1 |
