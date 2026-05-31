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

## 데이터

- React Query provider는 `_app.tsx`에서 일관되게 mount한다.
- SSR prefetch를 추가할 때는 dehydrate/hydrate 전략을 같이 정의한다.
- 비공개 browser token이 필요한 요청은 SSR에서 직접 호출하지 않는다.
- server props와 client store 초기값이 다르면 hydration mismatch로 본다.

## Module Federation SSR

- shell의 server remote는 `/_next/static/ssr/remoteEntry.js`를 참조한다.
- remote exposed module은 top-level browser side effect가 없어야 한다.
- remote는 단독 build가 먼저 성공해야 shell SSR 검증 대상이 된다.
- 의도적으로 client-only remote라면 shell에서 dynamic import로 격리하고 fallback을 둔다.

## 디버깅 순서

1. top-level browser API 검색.
2. render-time browser API 검색.
3. 시간/random/locale/viewport 기반 분기 확인.
4. server/client remoteEntry 경로 차이 확인.
5. 초기 store 값과 query cache hydration 확인.
