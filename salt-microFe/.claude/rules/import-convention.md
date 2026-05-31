# Import 규칙

## 정렬 순서

1. React/Next.
2. 외부 npm 패키지.
3. workspace 패키지 `@repo/*`.
4. app alias `@/*`.
5. 상대 경로.

그룹 사이에는 빈 줄을 둔다.

## Alias

- 앱 내부는 `@/*`를 사용한다.
- workspace package는 `@repo/*`를 사용한다.
- 같은 폴더 또는 같은 컴포넌트 묶음 내부는 상대 경로를 허용한다.

## 금지

- `apps/other-app/src/...` 직접 import 금지.
- 깊은 상대 경로로 앱 경계를 넘지 않는다.
- public export가 있는 도메인/컴포넌트 폴더의 내부 파일을 외부에서 직접 찌르지 않는다.
- circular dependency를 만들지 않는다.

## Barrel Export

- 도메인 폴더 `index.ts`는 public API만 export한다.
- `packages/ui`는 package `exports`에 필요한 subpath만 추가한다.
- 대형 `index.ts` 하나에 모든 것을 몰아넣지 않는다.

## Type Import

- 타입만 쓰면 `import type`을 사용한다.
- runtime dependency가 불필요하게 생기지 않게 한다.
