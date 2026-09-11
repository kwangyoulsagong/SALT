# `apps/web` — default zone

SALT 웹의 **default zone**이다. 세금(`/tax/*`)을 제외한 모든 경로를 담당한다.

- `assetPrefix`가 **없다.** default zone이기 때문이다.
- `/tax`, `/tax/:path+`, `/tax-static/:path+`를 `TAX_ZONE_ORIGIN`으로 프록시한다 (`next.config.js`의 `rewrites`).
- zone 내부 이동은 soft navigation이다. **zone을 넘는 링크는 `CrossZoneLink`(=`<a>`)를 쓴다.**
  `next/link`의 `<Link>`로 zone을 넘으면 `@repo/zone/no-cross-zone-link`가 lint에서 막는다.

## 라우팅 구조 (FE-REQ-008)

```
app/                Next 라우팅. @/pages/* 를 re-export 만 한다
├── layout.tsx      <html>·<body> 껍데기 + AppProviders  (서버 컴포넌트)
├── page.tsx        → @/pages/login
├── home/           → @/pages/home
├── investments/    → @/pages/investments
├── goals/addgoals/ → @/pages/goals/addgoals
└── streaming-probe/  측정 전용. 기본 404, STREAMING_PROBE=1 일 때만 열린다
pages/              **빈 폴더.** Next 가 src/pages 를 Pages Router 로 집지 않게 하는 장치
src/
├── app/providers/  전역 프로바이더 ("use client")
├── pages/          화면 슬라이스 (FSD pages 레이어 — 세그먼트 분할은 FE-REQ-009)
└── components/Block/BlockBoundary.tsx   Suspense + error boundary
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
| `TAX_ZONE_ORIGIN` | `http://localhost:3001` | 세금 zone origin. scheme+도메인을 포함한 절대 URL |
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
