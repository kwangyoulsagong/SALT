# `apps/web` — default zone

SALT 웹의 **default zone**이다. 세금(`/tax/*`)을 제외한 모든 경로를 담당한다.

- `assetPrefix`가 **없다.** default zone이기 때문이다.
- `/tax`, `/tax/:path+`, `/tax-static/:path+`를 `TAX_ZONE_ORIGIN`으로 프록시한다 (`next.config.js`의 `rewrites`).
- zone 내부 이동은 soft navigation이다. **zone을 넘는 링크는 `CrossZoneLink`(=`<a>`)를 쓴다.**
  `next/link`의 `<Link>`로 zone을 넘으면 `@repo/zone/no-cross-zone-link`가 lint에서 막는다.

## 이 앱의 유래

`apps/shell` + `apps/goals` + `apps/investments` 세 앱을 하나로 합친 것이다 (FE-REQ-007 FR-1).
Module Federation으로 런타임에 합치던 것을 그만두었다 — 근거는 `requirements/decisions/ADR-001-microfrontend-replacement.md`.

| 이전 | 지금 |
|---|---|
| `goals` remote 의 `GoalsApp` | `src/component/GoalsApp/GoalsApp.tsx` |
| `goals` remote 의 `AddGoals` | `src/component/AddGoals/AddGoalsContent.tsx` |
| `investments` remote 의 `InvestmentsApp` | `src/component/InvestmentsApp/InvestmentsApp.tsx` |
| `investments` remote 의 `Investment` | `src/component/Investment/Investment.tsx` |
| `RemoteBoundary` | `src/components/Section/SectionBoundary.tsx` |
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
