# SSR 규칙

## 기본 원칙

- 페이지는 기본적으로 SSR 가능해야 한다고 가정한다.
- SSR을 막기 위해 페이지 전체를 `dynamic({ ssr:false })`로 감싸지 않는다.
- browser-only 부분만 작은 client island로 격리한다.
- 서버 렌더와 클라이언트 첫 렌더의 마크업은 같아야 한다.

## browser API 금지 구간

렌더 중 또는 module top-level에서 아래를 읽지 않는다.

- `window`, `document`, `navigator`
- `localStorage`, `sessionStorage`
- `ResizeObserver`, `IntersectionObserver`
- WebSocket, Canvas context, chart instance
- viewport 크기, 현재 시간, random 값에 따른 분기

## 허용 패턴

- browser API는 `useEffect` 안에서 접근한다.
- 렌더에 필요하면 `isMounted`/`isClient` guard를 둔다.
- chart, canvas, editor, map처럼 SSR 불가한 컴포넌트만 `next/dynamic({ ssr:false })`로 분리한다.
- dynamic import에는 loading fallback을 둔다.

## App Router에서 달라지는 것 (FE-REQ-008)

라우팅이 `app/**`로 옮겨진 뒤 "SSR 안전"의 판정 자리가 바뀐다.

- **모듈 최상단의 `typeof window` 분기를 신뢰하지 않는다.** 클라이언트 컴포넌트도 SSR을 위해
  **서버로 한 번 컴파일**된다. 분기는 코드를 지우지 못한다 — 브라우저 전용 모듈은 `useEffect`
  **안에서** 동적 import하고, 그래도 서버 그래프에 남으면 번들러 쪽에서 끊는다.
- `next/dynamic`의 `ssr:false`는 **서버 그래프에서 모듈을 빼주지 않는다.** dev 서버는 그래도
  넣는다. `exports`에 `"node": null`이 있는 패키지(예: `msw/browser`)는 그때 빌드가 깨진다.
  해법은 `next.config.js`의 `resolve.alias`를 **서버 컴파일에서만** `false`로 두는 것이다
  (실례: `apps/web/next.config.js`).
- 서버 컴포넌트에서 `ssr:false`를 부를 수 없다. 클라이언트 잎 안쪽으로 옮긴다.
- `_document.tsx`·`_app.tsx`가 하던 일은 루트 `app/layout.tsx`(서버)와 `src/app/providers`
  (`"use client"`)로 나뉜다.

## 데이터

- React Query provider는 `src/app/providers`에서 한 번만 mount한다.
- SSR prefetch를 추가할 때는 dehydrate/hydrate 전략을 같이 정의한다.
- 비공개 browser token이 필요한 요청은 SSR에서 직접 호출하지 않는다.
- server props와 client store 초기값이 다르면 hydration mismatch로 본다.

## Multi-Zones SSR

zone은 평범한 Next 앱이다. **각 zone이 자기 SSR을 온전히 갖는다** — 런타임에 번들을 합치지 않으므로
share scope·async boundary 문제가 없다 (`ADR-001`).

- zone은 **단독 build가 성공해야 한다.** 다른 zone의 빌드에 의존하지 않는다.
- browser 전용 섹션은 `next/dynamic({ ssr: false })`로 격리하고 loading fallback을 둔다.
- zone 간 이동은 hard navigation이다. hydration 상태를 넘겨받지 않는다 — 넘길 값은 URL 파라미터나 서버 상태로 보낸다.

## 디버깅 순서

1. top-level browser API 검색.
2. render-time browser API 검색.
3. 시간/random/locale/viewport 기반 분기 확인.
4. zone 경계를 넘는 상태 전달이 URL/서버 상태가 아닌 클라이언트 메모리에 기대고 있지 않은지 확인.
5. 초기 store 값과 query cache hydration 확인.
