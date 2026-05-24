# `@repo/ui` 디자인 시스템 하네스

이 문서는 `salt-microFe/packages/ui/**` 작업에 적용한다. 디자인 시스템 작업 전에는 상위 규칙과 문서를 함께 확인한다.

## 참조 순서

1. `../../.codex/rules/design-system.md`
2. `.codex/rules/design-system.md`
3. `.codex/rules/storybook.md`
4. `../../docs/design-system/style-tokens.md`
5. `../../docs/design-system/component-index.md`
6. 현재 컴포넌트 구현과 Storybook story

검색은 `packages/ui/**` 하위로 좁히고 `node_modules`, `.next`, `.turbo`, `turbo`, `.git`은 제외한다.

## 패키지 원칙

- `apps/*`, 앱 route, 앱 store, 앱 API를 import하지 않는다.
- 비즈니스 문구와 서비스별 데이터를 넣지 않는다.
- 공개 API는 `package.json`의 `exports` subpath로만 제공한다.
- 앱에서 필요한 컴포넌트가 있으면 내부 파일 deep import를 유도하지 말고 공개 subpath를 추가한다.
- 의미 기반 props와 제한된 variant를 사용한다.
- 임의의 일회성 prop으로 variant를 무한 확장하지 않는다.
- 새 재사용 컴포넌트나 의미 있는 variant에는 Storybook story를 추가한다.
- Storybook story는 `.codex/rules/storybook.md`의 작성 규칙을 따른다.
- 스타일은 Vanilla Extract(`*.css.ts`)를 우선한다.

## 토큰과 스타일

- 색상, 간격, 타이포그래피, radius, shadow는 `src/styles/tokens.css.ts`의 `vars`를 먼저 확인한다.
- 반복되는 값만 토큰으로 승격한다.
- 단일 컴포넌트에만 쓰는 레이아웃 수치는 컴포넌트 옆 스타일 파일에 둔다.
- magic hex/string을 여러 파일에 복제하지 않는다.
- focus visible 상태를 제거하지 않는다.
- 아이콘만 있는 버튼에는 accessible name을 제공한다.

## 컴포넌트 작성

- 컴포넌트 폴더 안에 구현, 스타일, story를 함께 둔다.
- 컴포넌트는 앱 라우팅, 데이터 요청, 전역 store 부수 효과를 수행하지 않는다.
- `children`, `as`, `className`, 기본 HTML 요소 props는 기존 컴포넌트 패턴을 따른다.
- 타입만 쓰는 import는 `import type`을 사용한다.
- 공유 컴포넌트가 두 앱 이상에서 반복되면 `packages/ui`로 승격하되 공개 경로와 story를 함께 추가한다.

## 검증

가능하면 변경 후 아래 명령을 실행한다.

```bash
pnpm --filter @repo/ui lint
pnpm --filter @repo/ui check-types
```
