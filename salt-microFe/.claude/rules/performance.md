# 성능 최적화 규칙

## 렌더링

- route 파일은 가볍게 유지하고 무거운 화면은 컴포넌트로 분리한다.
- 큰 위젯, 차트, 드물게 쓰는 플로우는 `next/dynamic`을 검토한다.
- render 중 대량 정렬/필터/집계를 하지 않는다. API, memoized selector, worker, effect로 이동한다.
- 리스트는 pagination, virtualization, aggregation 중 하나를 우선 적용한다.
- 실시간 가격/차트 업데이트는 batch, throttle, debounce로 UI commit 빈도를 제어한다.

## 상태

- Zustand는 selector로 필요한 값만 구독한다.
- store 전체 구독 금지.
- React Query key는 안정적으로 만든다. 렌더마다 새 객체를 key에 직접 넣지 않는다.
- shell과 remote가 같은 데이터를 중복 요청하지 않도록 owner를 정한다.

## 번들

- icon/chart/date/util 라이브러리는 가능한 좁게 import한다.
- browser-only heavy dependency를 `packages/ui` 기본 primitive에 넣지 않는다.
- 공통 패키지 export는 tree-shaking 가능하게 작게 유지한다.
- remote별 중복 dependency가 커지면 federation shared 설정을 검토한다.

## 네트워크

- API 서비스 함수는 취소 가능한 `AbortSignal`을 받는다.
- dashboard성 화면은 클라이언트 대량 집계보다 서버 aggregate 응답을 우선한다.
- polling/streaming은 화면 visibility와 구독 수에 따라 멈출 수 있어야 한다.
- 캐시 무효화는 query key factory 기준으로 명시한다.

## 인터랙션

- search, resize, scroll, drag, streaming update는 debounce/throttle을 적용한다.
- layout thrashing을 피한다. DOM read/write를 섞지 않는다.
- `prefers-reduced-motion`을 존중한다.

## 애니메이션

- 애니메이션은 기본적으로 `transform`과 `opacity`만 사용한다.
- `top`, `left`, `right`, `bottom`, `width`, `height`, `margin`, `padding` 애니메이션은 layout을 유발하므로 피한다.
- `box-shadow`, `filter`, `backdrop-filter`, 큰 `border-radius`, gradient background 애니메이션은 paint 비용이 크므로 피한다.
- 이동은 `translate/translate3d`, 확대는 `scale`, 회전은 `rotate`를 사용한다.
- show/hide는 `display` 토글 애니메이션 대신 `opacity + transform + pointer-events` 조합을 우선한다.
- height accordion은 매 프레임 layout이 발생한다. 가능하면 transform 기반 reveal, fixed max 영역, 또는 JS로 시작/끝 값만 계산하는 패턴을 쓴다.
- scroll-linked animation은 main thread 부하가 크다. 꼭 필요하면 CSS `position: sticky`, IntersectionObserver, throttled rAF를 우선한다.

## Paint 줄이기

- 자주 바뀌는 요소와 큰 배경을 분리한다. 움직이는 작은 레이어만 갱신되게 한다.
- 큰 영역의 `box-shadow`, blur, backdrop blur, fixed background는 모바일에서 특히 비용이 크다.
- hover/active 상태에서 layout이나 paint가 큰 속성을 바꾸지 않는다. 색/그림자보다 transform/opacity를 우선한다.
- skeleton/shimmer는 전체 화면 gradient 이동을 피하고 작은 범위로 제한한다.
- 고빈도 업데이트 영역에는 복잡한 CSS selector와 descendant selector를 피한다.
- 이미지/차트/카드는 실제 표시 크기에 맞는 asset과 lazy loading을 사용한다.
- offscreen 영역은 pagination, virtualization, lazy render, `content-visibility` 적용을 검토한다.

## Composite Layer와 will-change

- `will-change`는 곧 애니메이션될 소수 요소에만 일시적으로 사용한다.
- 항상 켜진 `will-change`는 메모리와 GPU layer 비용을 늘리므로 금지한다.
- hover 직전/진입 시 추가하고 animation 종료 후 제거할 수 있으면 그 패턴을 우선한다.
- `transform: translateZ(0)` 같은 강제 layer 승격은 측정 후에만 사용한다.
- layer가 많아지면 합성 비용과 메모리가 늘어난다. Chrome DevTools Layers/Performance로 확인한다.
- fixed/sticky/header, modal, drag preview, 고빈도 transform 대상은 layer 승격 후보가 될 수 있다.

## Layout 줄이기

- DOM measurement(`getBoundingClientRect`, `offsetWidth`, `scrollHeight`)와 style write를 같은 tick에서 반복하지 않는다.
- read를 먼저 모으고 write는 `requestAnimationFrame`에서 처리한다.
- resize/scroll listener는 passive 옵션과 throttle/rAF를 검토한다.
- 레이아웃 영향 범위를 줄이기 위해 독립 영역에는 `contain: layout paint` 또는 `content-visibility`를 검토한다.
- 리스트 item 높이가 일정하면 고정 높이 virtualization이 가장 예측 가능하다.

## 측정

- 최적화 전 병목을 기록한다: FPS, scripting time, rendering, painting, composite, heap, render count, bundle size.
- 최적화 후 같은 지표로 비교한다.
- 추측만으로 `memo`, `useMemo`, `useCallback`을 추가하지 않는다.
- Chrome DevTools Performance에서 Layout/Paint/Composite 중 어디가 병목인지 먼저 확인한다.
