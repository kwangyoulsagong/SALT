---
id: FE-REQ-001
spec: ../../specs/done/FE-REQ-001.md
title: 마이크로프론트엔드 SSR/계약 리팩토링 체크리스트
validated: 2026-05-25
---

# FE-REQ-001 체크리스트

## 요구사항 검증

| # | 요구사항 | 구현 위치 | 상태 |
|---|---|---|---|
| 1 | shell remote 소비를 `React.lazy`에서 `next/dynamic`으로 전환 | `apps/shell/src/pages/home/index.tsx`, `goals/addgoals/index.tsx`, `investments/index.tsx` | ✅ |
| 2 | remote 로딩/실패 fallback을 shell remote 단위로 격리 | `apps/shell/src/components/Remote/RemoteBoundary.tsx` | ✅ |
| 3 | React Query cache를 shell/goals/investments 앱별로 독립 소유 | `apps/*/src/providers/QueryClientProvider.tsx` | ✅ |
| 4 | `QueryClientProvider`, Redux `Provider`의 `ssr:false` dynamic wrapper 제거 | `apps/*/src/pages/_app.tsx`, `apps/*/src/providers/QueryClientProvider.tsx` | ✅ |
| 5 | browser-only 투자 실시간 UI만 client island로 격리 | `apps/investments/src/pages/investment/index.tsx` | ✅ |
| 6 | 존재하지 않는 `@repo/store`를 `transpilePackages`에서 제거 | `apps/shell/next.config.js`, `apps/goals/next.config.js`, `apps/investments/next.config.js` | ✅ |
| 7 | shell remote type declaration을 실제 expose만 남기도록 정리 | `apps/shell/src/types/types.d.ts` | ✅ |
| 8 | event bus event name registry와 payload map 추가 | `packages/message-event-bus/src/events/registry.ts`, `MessageEventBus.ts`, `useMessageEventBus.ts` | ✅ |
| 9 | 기존 `ACCOUNT_SELECTED` 문자열 직접 구독을 registry 기반으로 교체 | `apps/goals/src/component/AddGoals/AddGoalsContent.tsx` | ✅ |
| 10 | nextjs-mf SSR runtime lifecycle 추가 | `apps/*/src/pages/_document.tsx` | ✅ |
| 11 | `@repo/ui`의 Next build 호환 import/tsconfig 정리 | `packages/ui/src/**`, `packages/ui/tsconfig.json` | ✅ |

## 검증 산출

```text
pnpm --filter @repo/message-event-bus check-types
# OK

pnpm --filter @repo/ui check-types
# OK

pnpm --filter shell lint
# OK

pnpm --filter goals lint
# OK

pnpm --filter investments lint
# OK

pnpm --filter goals build
# OK

pnpm --filter investments build
# OK

pnpm --filter shell build
# OK
```

## 참고

- `pnpm --filter shell build`는 remote dev server가 켜져 있지 않으면 remote offline 로그를 남긴다. fallback 경로가 동작해 build는 성공한다.
- `pnpm --filter investments build`는 Browserslist 최신화 경고를 출력하지만 build 실패 요인은 아니다.
