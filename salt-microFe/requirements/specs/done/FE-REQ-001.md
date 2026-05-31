---
id: FE-REQ-001
title: 마이크로프론트엔드 SSR/계약 리팩토링
priority: high
labels: [refactoring, microfrontend, module-federation, ssr, event-bus]
created: 2026-05-25
updated: 2026-05-25
---

## Summary

현재 shell은 Module Federation remote인 `goals/*`, `investments/*`를 `React.lazy`로 소비한다. 이 방식은 Next.js Pages Router의 preload/SSR 의도를 코드상에서 명확히 드러내지 못하고, remote 장애 처리도 `Suspense` fallback에만 의존한다.

이번 리팩토링은 마이크로프론트엔드 독립성을 유지하면서 SSR 가능한 shell composition을 복구한다. 각 remote는 독립 실행과 shell 내 실행을 모두 지원해야 하며, 공유 런타임 의존성, React Query cache 경계, event bus 계약, remote type declaration을 명시적으로 정리한다.

## Research Notes

- Module Federation `shared`는 consumer/producer 사이의 공통 의존성을 재사용하기 위한 설정이며, `singleton: true`는 shared scope 안에서 단일 버전만 로드하도록 강제한다. 반대로 singleton이 아니면 버전 차이가 있는 경우 각 앱이 자기 의존성을 로드할 수 있다. 출처: [Module Federation shared docs](https://module-federation.io/configure/shared)
- Next.js `next/dynamic`은 `React.lazy`와 `Suspense`를 결합한 API이며, `import()` 경로는 `dynamic()` top-level 호출 안에 명시되어야 Next가 bundle/module id를 매칭하고 preload할 수 있다. `ssr:false`는 `window` 같은 browser API에 의존하는 컴포넌트에만 제한적으로 사용한다. 출처: [Next.js Lazy Loading docs](https://nextjs.org/docs/pages/guides/lazy-loading)
- `@module-federation/nextjs-mf`의 Next SSR remote entry는 server에서 `/_next/static/ssr/remoteEntry.js`, client에서 `/_next/static/chunks/remoteEntry.js`를 사용한다. 출처: [Module Federation Next.js docs](https://module-federation.io/guide/framework/nextjs.html)
- TanStack Query SSR에서는 request/user 간 cache 누수를 막기 위해 `QueryClient`를 module top-level에 만들지 않고 요청 단위 cache 경계를 지켜야 한다. 실제 SSR 데이터 HTML을 만들려면 prefetch, dehydrate, hydrate 전략이 별도로 필요하다. 출처: [TanStack Query SSR guide](https://tanstack.com/query/v5/docs/framework/react/guides/ssr)
- `@module-federation/nextjs-mf`는 Next.js 지원이 maintenance/deprecation 단계이며, Next SSR에서는 `_document.getInitialProps` 같은 server lifecycle과 page-level SSR 의도를 명시해야 한다. 출처: [Module Federation Next.js practice docs](https://module-federation.io/practice/frameworks/next/index.html)
- browser event 기반 통신을 사용할 경우 custom payload는 `CustomEvent.detail`에 실을 수 있고, `dispatchEvent()`는 등록된 listener를 동기적으로 호출한다. 따라서 MFE event bus는 payload 타입, listener 해제, replay 정책을 명시해야 한다. 출처: [MDN CustomEvent](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent), [MDN dispatchEvent](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/dispatchEvent)

## Current Findings

- `apps/shell/src/pages/home/index.tsx`, `goals/addgoals/index.tsx`, `investments/index.tsx`가 remote를 `React.lazy`로 소비한다.
- shell/goals/investments 모두 `QueryClientProvider`를 가지고 있으며, 현재 provider는 `next/dynamic(..., { ssr:false })`로 감싸져 SSR 렌더를 불필요하게 차단한다.
- `@tanstack/react-query` Module Federation shared 설정이 shell은 `singleton:false`, remotes는 `singleton:true`로 불일치한다.
- `transpilePackages`에 존재하지 않는 `@repo/store`가 포함되어 있다.
- shell type declaration에 실제 configured remote가 아닌 `game`, `social`, `missions`, `ranking`, `notification` 선언이 남아 있다.
- `@repo/message-event-bus`는 `window` singleton guard는 있으나 event name registry와 payload 타입 계약이 없다. 실제 사용처는 `ACCOUNT_SELECTED` 문자열을 직접 구독한다.

## Requirements

### 1. Shell Remote Composition

- shell은 remote를 직접 `React.lazy(() => import("remote/Module"))`로 소비하지 않는다.
- shell의 remote 소비는 `next/dynamic` top-level 선언으로 통일한다.
- SSR 가능한 remote는 `ssr:false`를 사용하지 않는다.
- browser-only 의존성이 확인된 경우에만 해당 하위 컴포넌트를 작은 client-only island로 분리하고, page/remote 전체를 client-only로 만들지 않는다.
- remote loading fallback과 load failure fallback을 분리한다. `Suspense` fallback만으로 장애 처리를 끝내지 않는다.

### 2. Remote Independence

- `apps/goals`, `apps/investments`는 shell 없이 `pnpm --filter goals dev`, `pnpm --filter investments dev`로 주요 화면을 확인할 수 있어야 한다.
- remote exposed module은 shell 내부 파일, shell store, shell provider를 직접 import하지 않는다.
- shell은 remote 내부 파일 경로를 직접 import하지 않고 configured federation expose만 소비한다.
- expose 이름은 기존 public contract를 유지한다.
  - `goals/GoalsApp`
  - `goals/AddGoals`
  - `investments/InvestmentsApp`
  - `investments/Investment`

### 3. React Query Ownership

- 이번 요구사항의 기본 전략은 remote별 cache 격리다.
- SALT MFE는 독립 실행/독립 배포를 우선하므로 React Query cache를 공유하지 않는다.
- 공유는 계약과 신호까지만 허용한다. 서버 상태 cache와 mutable runtime state는 앱별로 독립 소유한다.
- shell, goals, investments는 각자 자기 `QueryClientProvider`를 소유한다.
- `@tanstack/react-query`는 federation shared singleton으로 강제하지 않는다. shell/goals/investments 설정을 모두 `singleton:false`로 맞춘다.
- MFE 간 데이터 동기화가 필요하면 shared QueryClient가 아니라 API owner, URL state, props, typed event bus로 처리한다.
- 중복 fetch는 독립성 비용으로 허용한다. cache 공유가 필요한 기능은 별도 요구사항에서 query owner, SSR prefetch, dehydrate/hydrate 정책을 먼저 정의해야 한다.
- `QueryClient`는 서버에서 요청/렌더별로 새로 만들고, 브라우저에서는 앱 생명주기 동안 재사용한다.
- 서버 cache가 module top-level singleton으로 공유되어 user/request 간 데이터가 섞이면 안 된다.

### 4. SSR Rules

- `_app.tsx` provider는 SSR 가능한 static import를 우선한다.
- `QueryClientProvider`, Redux `Provider` 자체를 `ssr:false` dynamic import로 감싸지 않는다.
- NextFederationPlugin SSR runtime을 위해 각 앱은 `_document.getInitialProps`를 둔다.
- module top-level과 render path에서 `window`, `document`, `navigator`, storage, observer, chart/canvas instance를 직접 읽지 않는다.
- browser API가 필요한 코드는 `useEffect` 또는 explicit client-only component 안으로 이동한다.
- React Query 데이터 prefetch/dehydrate/hydrate는 이번 범위에 포함하지 않는다. 따라서 "SSR 복구"의 의미는 remote composition/provider가 서버 렌더를 막지 않는 구조까지다.

### 5. Module Federation Config

- server remote entry는 `/_next/static/ssr/remoteEntry.js`, client remote entry는 `/_next/static/chunks/remoteEntry.js`를 사용한다.
- `react`, `react-dom`은 `@module-federation/nextjs-mf` 기본 Next/React 공유에 맡기고 수동 shared 설정으로 중복 선언하지 않는다.
- `@repo/message-event-bus`는 singleton으로 유지한다.
- mutable application state library인 `@tanstack/react-query`, `@reduxjs/toolkit`, `react-redux`, `zustand`는 앱별 격리를 기본값으로 둔다.
- 존재하지 않는 workspace package는 `transpilePackages`에 넣지 않는다.
- shell `src/types/*.d.ts`는 실제 configured remote/expose만 선언한다.

### 6. Event Bus Contract

- MFE 간 이벤트는 `@repo/message-event-bus`만 사용한다.
- event name은 registry 파일에서만 정의한다. 컴포넌트에서 문자열 literal을 직접 사용하지 않는다.
- payload 타입은 `EventPayloadMap`으로 관리하고, `publish`, `subscribe`, hook API는 registry 기반 generic으로 추론되어야 한다.
- payload는 JSON-serializable object만 허용한다.
- auth token, 개인정보, React element, DOM node, function, class instance는 event payload로 보내지 않는다.
- event bus는 browser communication channel이다. server render 결과가 event bus state에 의존하면 안 된다.
- `lastEvent` replay는 편의 기능으로만 사용한다. 일회성 이벤트는 소비 후 clear 정책을 둔다.

## Acceptance Criteria

- shell route에서 `React.lazy` remote import가 남아 있지 않다.
- shell remote 소비가 `next/dynamic` top-level 선언으로 통일되어 있다.
- shell/goals/investments의 React Query shared singleton 설정이 모두 `false`로 일치한다.
- REQ와 구현이 React Query cache를 공유하지 않는 독립 MFE 원칙을 유지한다.
- `QueryClientProvider`가 `ssr:false` dynamic import에 의존하지 않는다.
- 서버 QueryClient는 요청/렌더 경계를 넘겨 공유되지 않고, 브라우저 QueryClient는 앱 생명주기 동안 재사용된다.
- `@repo/store`가 `transpilePackages`에서 제거되어 있다.
- shell type declaration에는 실제 remote/expose 선언만 남아 있다.
- event bus package가 event registry와 typed payload map을 export한다.
- 기존 `ACCOUNT_SELECTED` 사용처가 registry 기반 event name으로 교체되어 있다.
- `pnpm --filter @repo/message-event-bus check-types`, `pnpm --filter shell lint`, `pnpm --filter goals lint`, `pnpm --filter investments lint`가 통과한다.
- 가능하면 `goals`, `investments`, `shell` 순서로 build를 실행하고 결과를 checklist에 기록한다.

## Out Of Scope

- App Router 전환.
- React Query SSR prefetch/dehydrate/hydrate 구현.
- BFF 또는 backend API 계약 변경.
- remote expose 이름 변경.
- shared global mutable store 도입.
- runtime remote registration 또는 manifest 기반 remote discovery 도입.

## Changelog

- 2026-05-25: 웹 리서치 기반으로 Module Federation shared 전략, Next dynamic SSR 원칙, React Query cache 경계, event bus typed registry 요구사항을 구체화했다.
- 2026-05-25: 구현 결과에 맞춰 nextjs-mf 기본 React 공유, `_document` server lifecycle, 서버/브라우저 QueryClient 생성 정책을 반영했다.
