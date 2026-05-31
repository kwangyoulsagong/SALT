---
id: FE-REQ-001
spec: ../../specs/done/FE-REQ-001.md
checklist: ../checklists/FE-REQ-001.md
title: 마이크로프론트엔드 SSR/계약 리팩토링 회고
completed: 2026-05-25
---

# FE-REQ-001 회고

## 요약

shell의 remote 소비 방식을 `next/dynamic`으로 정리하고, goals/investments remote가 독립 QueryClient를 유지하도록 Module Federation 계약을 맞췄다. event bus는 문자열 기반 사용에서 typed registry 기반으로 바꿨고, nextjs-mf SSR 동작을 위해 각 앱에 `_document.getInitialProps`를 추가했다.

## 변경 내용

- shell의 `goals/*`, `investments/*` remote import를 `React.lazy`에서 `next/dynamic`으로 전환했다.
- remote 로딩 실패가 shell 전체 장애로 번지지 않도록 `RemoteBoundary` fallback을 추가했다.
- React Query cache 공유를 하지 않는 독립 MFE 원칙을 코드와 문서에 반영했다.
- `@tanstack/react-query` shared singleton 강제를 제거하고, `react`/`react-dom`은 nextjs-mf 기본 공유에 맡겼다.
- `QueryClientProvider`와 Redux `Provider`의 `ssr:false` dynamic wrapper를 제거했다.
- browser API/API 호출이 SSR에서 실패하던 투자 실시간 영역만 client island로 격리했다.
- event bus에 `EVENT_NAMES`, `EventPayloadMap`을 추가하고 `ACCOUNT_SELECTED` 직접 문자열 사용을 제거했다.
- `@repo/ui` import 확장자와 tsconfig를 Next 앱 build/typecheck가 통과하는 형태로 정리했다.

## 잘된 점

- shell, goals, investments의 cache 소유권이 명확해져 독립 실행/독립 배포 방향과 맞아졌다.
- remote 장애 fallback이 생겨 remote dev server가 꺼져 있어도 shell build가 실패하지 않는다.
- event bus payload 타입이 registry 기준으로 추론되어 event name drift를 줄일 수 있다.
- build 검증 과정에서 `pages/**` 하위 상수 파일, 잘못된 type import, browser-only SSR 호출 같은 잠재 오류를 함께 제거했다.

## 아쉬운 점

- nextjs-mf의 Next.js 지원이 maintenance/deprecation 단계라 SSR 동작이 플러그인 제약에 민감하다.
- `@repo/ui`에는 기존 Storybook lint warning이 남아 있어 `pnpm --filter @repo/ui lint`는 아직 `--max-warnings 0` 기준을 통과하지 못한다.
- React Query SSR prefetch/dehydrate/hydrate는 이번 범위에서 제외했기 때문에 서버 HTML에 실제 query data를 싣는 단계까지는 가지 않았다.

## 후속 조치

- shell SSR로 remote를 실제 렌더링할 때 goals `3001`, investments `3002` dev server가 필요하다는 내용을 README나 dev script에 명시한다.
- `@repo/ui` Storybook warning을 별도 작업으로 정리해 `pnpm --filter @repo/ui lint`도 통과시키는 상태로 만든다.
- 서버에서 prefetch된 데이터가 필요한 화면이 생기면 별도 REQ로 query owner, dehydrate/hydrate, XSS-safe serialization 정책을 먼저 정의한다.

## 품질 점수

| 항목 | 점수 (1-5) | 근거 |
|---|---:|---|
| MFE 독립성 | 5/5 | QueryClient/cache를 앱별로 유지하고 shared mutable state를 만들지 않았다. |
| SSR 계약 정리 | 4/5 | provider SSR 차단과 shell remote composition은 정리했지만 query data hydration은 범위 밖이다. |
| 타입 안전성 | 4/5 | event bus registry와 remote declaration을 정리했고 필수 typecheck를 통과했다. |
| 장애 격리 | 4/5 | shell remote fallback을 추가했지만 운영 모니터링/재시도 정책은 별도 작업이 필요하다. |
| 검증 완성도 | 5/5 | 필수 lint/typecheck와 shell/goals/investments build가 모두 통과했다. |
