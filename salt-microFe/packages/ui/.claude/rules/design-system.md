# `@repo/ui` 디자인 시스템 규칙

이 규칙은 `salt-microFe/packages/ui/**` 작업에 적용한다. 상위 디자인 시스템 규칙도 함께 따른다.

## 참조 문서

- 상위 규칙: `../../../../.claude/rules/design-system.md`
- 스타일 토큰 인덱스: `../../../../docs/design-system/style-tokens.md`
- 컴포넌트 인덱스: `../../../../docs/design-system/component-index.md`
- 패키지 하네스: `../../CLAUDE.md`
- Storybook 작성 규칙: `storybook.md`

검색은 `packages/ui/**` 하위로 좁히고 `node_modules`, `.next`, `.turbo`, `turbo`, `.git`은 제외한다.

## 공개 API

- 외부 공개 import는 `package.json`의 `exports` subpath로만 제공한다.
- 앱에서 `packages/ui/src/**` 내부 파일을 직접 import하게 만들지 않는다.
- 새 컴포넌트가 앱에서 필요하면 구현과 함께 공개 subpath를 추가한다.
- 내부 구현 파일의 이름 변경이나 이동은 기존 공개 subpath 호환성을 먼저 확인한다.

## 컴포넌트 원칙

- `apps/*`, 앱 route, 앱 store, 앱 API를 import하지 않는다.
- 비즈니스 문구와 서비스별 데이터를 넣지 않는다.
- 데이터 요청, 라우팅 부수 효과, 앱 전역 상태 변경을 수행하지 않는다.
- 의미 기반 props와 제한된 variant를 제공한다.
- 임의의 일회성 prop으로 variant를 무한 확장하지 않는다.
- 새 재사용 컴포넌트나 의미 있는 variant에는 Storybook story를 추가한다.
- Storybook story는 `storybook.md`의 작성 규칙을 따른다.
- 아이콘만 있는 버튼에는 accessible name을 제공한다.
- focus visible 상태를 제거하지 않는다.

## 스타일과 토큰

- 스타일은 Vanilla Extract(`*.css.ts`)를 우선한다.
- 색상, 간격, 타이포그래피, radius, shadow는 `src/styles/tokens.css.ts`의 `vars`를 먼저 확인한다.
- 반복되는 값만 토큰으로 승격한다.
- 단일 컴포넌트에만 쓰는 레이아웃 수치는 컴포넌트 옆 스타일 파일에 둔다.
- magic hex/string을 여러 파일에 복제하지 않는다.

## 검증

가능하면 변경 후 아래 명령을 실행한다.

```bash
pnpm --filter @repo/ui lint
pnpm --filter @repo/ui check-types
```
