# `apps/web` — 셸 zone

SALT 웹의 **셸**(default zone)이다 — 인증 · 온보딩 · 홈 · 설정(`ADR-005`). 투자 화면은 투자 zone(`apps/web-investment`)이 서비스한다(2026-11-02 `FE-REQ-053`). 저축 화면은 옮기기 전까지 여기 있다(레지스트리 `hostedIn`, `FE-REQ-056`). 홈은 BFF 도메인 요약 카드만 그린다.

- `assetPrefix`가 **없다.** default zone이기 때문이다.
- 도메인 zone 4개로 프록시한다 (`next.config.js`의 `rewrites` = `@repo/core/zones/node` 의 `zoneRewrites`). 경로는 `fallback` — 셸에 화면이 있으면 셸이 받는다. 로컬에서 투자 화면을 보려면 3002(`web-investment`)도 떠 있어야 한다(`ops/salt.sh up`).
- `middleware.ts` — 로그인 표지 쿠키가 있으면 `/` 에서 서버가 바로 `/home`(토큰은 그대로 `localStorage`, `FE-REQ-013` 전).
- zone 내부 이동은 soft navigation이다. **zone을 넘는 링크는 `CrossZoneLink`(=`<a>`)를 쓴다.**
  `next/link`의 `<Link>`로 zone을 넘으면 `@repo/zone/no-cross-zone-link`가 lint에서 막는다.

## 라우팅 구조 (FE-REQ-008)

```
app/                Next 라우팅. @/pages/* 를 re-export 만 한다
├── layout.tsx      <html>·<body> 껍데기 + AppProviders  (서버 컴포넌트)
├── page.tsx        → @/pages/login
├── home/           → @/pages/home
├── settings/       → @/pages/settings   (도메인별 설정 링크 — 투자 코치 설정은 투자 zone /coach/settings)
├── goals/addgoals/ → @/pages/goals/addgoals
├── not-found.tsx   → @repo/web-shared/layout 의 NotFoundPage(@/app 이 다시 연다)
└── streaming-probe/  측정 전용. 기본 404, STREAMING_PROBE=1 일 때만 열린다
pages/              **빈 폴더.** Next 가 src/pages 를 Pages Router 로 집지 않게 하는 장치
src/
├── app/providers/  셸 프로바이더 ("use client") — React Query · 모션은 @repo/web-shared/layout ZoneProviders, 셸은 Redux · 세션 복원을 얹는다
├── pages/          화면 슬라이스 (FSD pages 레이어)
└── …               shared 레이어는 packages/web-shared(@repo/web-shared/<세그먼트>), BlockBoundary 도 거기
```

**기본은 서버 컴포넌트다.** `"use client"`는 상호작용·브라우저 API가 필요한 잎에만 붙인다.
주의할 함정 셋은 `.claude/rules/ssr.md` "App Router에서 달라지는 것"에 있다.

## 스트리밍 측정

```bash
pnpm --filter web build
STREAMING_PROBE=1 npx next start -p 3000
node scripts/measure-streaming.mjs "http://localhost:3000/streaming-probe"
node scripts/measure-streaming.mjs "http://localhost:3000/streaming-probe?mode=blocking"
```

판정 기준과 측정값은 `requirements/reports/checklists/FE-REQ-008.md` §3.

## 이 앱의 유래

`apps/shell` + `apps/goals` + `apps/investments` 세 앱을 하나로 합친 것이다 (FE-REQ-007 FR-1).
Module Federation으로 런타임에 합치던 것을 그만두었다 — 근거는 `requirements/decisions/ADR-001-microfrontend-replacement.md`.

| 이전 | 지금 |
|---|---|
| `goals` remote 의 `GoalsApp` | `src/component/GoalsApp/GoalsApp.tsx` |
| `goals` remote 의 `AddGoals` | `src/component/AddGoals/AddGoalsContent.tsx` |
| `investments` remote 의 `InvestmentsApp` | `src/component/InvestmentsApp/InvestmentsApp.tsx` |
| `investments` remote 의 `Investment` | `src/component/Investment/Investment.tsx` |
| `RemoteBoundary` | `src/components/Section/SectionBoundary.tsx` (블록 경계는 그 위의 `BlockBoundary`) |
| `@repo/message-event-bus` | 제거. zone 간 통신은 URL 파라미터와 서버 상태로 한다 |

## 환경변수

| 변수 | 기본값 | 용도 |
|---|---|---|
| `ZONE_<ID>_ORIGIN` | `http://localhost:<devPort>` | 도메인 zone origin(`INVEST` · `SAVINGS` · `HOUSEHOLD` · `TIPS`). scheme+도메인을 포함한 절대 URL |
| `APP_ALLOWED_ORIGINS` | `localhost:3000` | Server Actions `allowedOrigins` (쉼표 구분) |
| `NEXT_PUBLIC_BASE_URL` | `http://localhost:8000` | 인증·목표 API |
| `NEXT_PUBLIC_INVESTMENTS_BASE_URL` | `http://localhost:4001` | 투자 API |
| `NEXT_PUBLIC_WEBSOCKET_URL` | `ws://localhost:4002` | 실시간 시세 |

## 명령

```bash
pnpm --filter web dev          # 3000
pnpm --filter web build
pnpm --filter web lint
pnpm --filter web check-types
```
