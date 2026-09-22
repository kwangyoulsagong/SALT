# API 개발 규칙

이 레포는 app-local API + TanStack Query v5 패턴을 기본으로 한다.

## 배치

- HTTP 진입점은 `shared/api` 의 **`apiFetch` 하나**다(`fsd-shared.md`). 조회는 `entities/{slice}/api`, mutation 은 `features/{slice}/api`.
- **`axios` 를 import 하지 않는다** — `no-restricted-imports` 가 막는다. GET 하나에 라이브러리 전체가 딸려 와 번들 회귀를 세 번 냈다(`FE-REQ-035`).
- query key는 슬라이스 `api/queryKeys.ts`에 둔다.

## 서비스 함수

- `Response` 를 UI로 노출하지 말고 본문(`data`)만 반환한다. `!response.ok` 면 status 를 든 에러를 던진다(`CoachApiError` · `MarketApiError`).
- 본문을 보내면 `Content-Type: application/json` 을 직접 적는다 — 빠뜨리면 BFF 가 빈 본문을 받는다.
- 반환 타입을 명시한다.
- 조회 함수는 가능하면 `AbortSignal`을 받는다.
- 서비스 함수에서 Zustand/Redux store를 직접 import하지 않는다.

```ts
export const getPortfolio = async (signal?: AbortSignal): Promise<Portfolio> => {
  const response = await apiFetch(`${INVESTMENTS_BASE_URL}/api/app/portfolio`, { headers: authHeader(), signal });
  if (!response.ok) throw new PortfolioApiError(response.status);
  return (await response.json()) as Portfolio;
};
```

## 에러

- API error shape은 한 곳에서 정규화한다.
- UI는 HTTP 에러 내부 구조에 의존하지 않는다. 판단에 쓰는 것은 `status` 하나다.
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

## zone 데이터 소유권

- **zone은 자기 데이터를 스스로 부른다.** zone 간에 클라이언트 캐시를 공유하지 않는다 — hard navigation이라 넘어가지 않는다.
- 두 zone이 같은 데이터를 필요로 하면 **BFF 엔드포인트를 공유**한다. 프론트에서 다시 합치지 않는다.
- zone에 넘길 값은 **URL 파라미터**로 보낸다.
