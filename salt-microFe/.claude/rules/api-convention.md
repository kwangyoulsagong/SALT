# API 개발 규칙

이 레포는 app-local API + TanStack Query v5 패턴을 기본으로 한다.

## 배치

- 앱 공통 client: `src/api` 또는 `src/api/client.ts`.
- 도메인 API: `src/domains/{domain}/api`.
- 기존 단순 구조는 `src/api`를 유지해도 된다.
- query key는 `src/constants/queryKeys.ts` 또는 도메인 `api/queryKeys.ts`에 둔다.

## 서비스 함수

- axios/fetch 응답 객체를 UI로 노출하지 말고 `data`만 반환한다.
- 반환 타입을 명시한다.
- 조회 함수는 가능하면 `AbortSignal`을 받는다.
- 서비스 함수에서 Zustand/Redux store를 직접 import하지 않는다.

```ts
export const getPortfolio = async (signal?: AbortSignal): Promise<Portfolio> => {
  const { data } = await client.get<Portfolio>('/portfolio', { signal });
  return data;
};
```

## 에러

- API error shape은 한 곳에서 정규화한다.
- UI는 axios error 내부 구조에 의존하지 않는다.
- catch 후 조용히 삼키지 않는다. 복구 가능하면 fallback 값을 명시하고, 아니면 throw한다.

## Query Key

- magic string을 흩뿌리지 않는다.
- 계층형 key factory를 사용한다.

```ts
export const portfolioKeys = {
  all: ['portfolio'] as const,
  detail: (id: string) => [...portfolioKeys.all, 'detail', id] as const,
};
```

## useQuery

- `queryOptions`로 옵션을 재사용 가능하게 만든다.
- `queryFn`에서 React Query의 `signal`을 서비스에 전달한다.
- guard 이후에만 `data`를 사용한다. `data!` 금지.

## useMutation

- mutation generic은 `<TData, TError, TVariables>`를 명시한다.
- 성공 시 관련 query key만 invalidate한다.
- invalidate Promise를 반환하면 pending UX가 더 정확해진다.

## MFE 데이터 소유권

- shell과 remote가 같은 데이터를 동시에 fetch하지 않게 owner를 정한다.
- remote 내부 화면 데이터는 remote가 소유한다.
- shell layout/global navigation 데이터는 shell이 소유한다.
