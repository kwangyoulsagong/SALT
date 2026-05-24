# 상태 관리 규칙

## 구분

- 서버 상태: TanStack Query.
- 컴포넌트 로컬 상태: `useState`, `useReducer`.
- 앱 클라이언트 공유 상태: Zustand 또는 기존 Redux.
- MFE 간 상태 공유: store singleton이 아니라 URL, props, event bus.

## Zustand

- store hook 이름은 `use{Domain}Store`.
- 파일명은 `{domain}Store.ts`.
- state/action interface를 명시한다.
- selector로 필요한 값만 구독한다.

```ts
const selectedId = usePortfolioStore((state) => state.selectedId);
```

- 여러 값을 묶으면 shallow 비교를 검토한다.
- store 전체 구독은 리렌더 비용 때문에 피한다.

## Redux

- 기존 Redux가 있는 영역은 일관성을 위해 기존 패턴을 따른다.
- 새 전역 상태는 먼저 React Query/Zustand/URL로 해결 가능한지 검토한다.

## 배치

- 앱 공통 store: `src/store`.
- 도메인 store: `src/domains/{domain}/store`.
- store 파일에는 React 컴포넌트를 작성하지 않는다.
- API service에서 store import 금지.

## 초기화와 SSR

- SSR 중 browser storage를 직접 읽지 않는다.
- persist store는 client mount 이후 hydrate되도록 처리한다.
- 서버 첫 렌더와 클라이언트 첫 렌더가 달라지는 기본값을 피한다.

## 금지

- remote 간 mutable singleton store 공유 금지.
- store에 API response 원본을 무한 누적 금지.
- streaming 데이터는 최대 보관 개수와 정리 정책을 둔다.
