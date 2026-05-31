# 디자인 시스템 규칙

## 참조 문서

- 스타일 토큰 인덱스: `docs/design-system/style-tokens.md`
- 컴포넌트 인덱스: `docs/design-system/component-index.md`
- `@repo/ui` 패키지 로컬 규칙: `packages/ui/CLAUDE.md`
- `@repo/ui` 패키지 Claude 규칙: `packages/ui/.claude/rules/design-system.md`
- `@repo/ui` Storybook 작성 규칙: `packages/ui/.claude/rules/storybook.md`
- 실제 구현: `packages/ui/**`

디자인 시스템 관련 작업은 전체 레포를 훑지 말고 `salt-microFe/**` 범위에서 필요한 하위 glob만 본다. 특히 `node_modules`, `.next`, `.turbo`, `.git`은 검색 대상에서 제외한다.

## 우선순위

1. `@repo/ui` 기존 컴포넌트 사용.
2. 앱 전용 조합 컴포넌트 작성.
3. 두 앱 이상에서 재사용되면 `packages/ui`로 승격.

## `packages/ui` 원칙

- 앱 route, 앱 store, 앱 API를 import하지 않는다.
- 비즈니스 문구와 서비스별 데이터를 넣지 않는다.
- 의미 기반 props와 제한된 variant를 제공한다.
- 공개 import는 `packages/ui/package.json`의 `exports` subpath를 통해 제공한다.
- 앱에서 `packages/ui/src/**` 내부 파일을 직접 import하지 않는다.
- 새 재사용 컴포넌트에는 Storybook story를 추가한다.
- Storybook story는 `packages/ui/.claude/rules/storybook.md`를 따른다.
- 스타일은 Vanilla Extract를 우선한다.

## 토큰

- 색상, 간격, 타이포그래피, radius, shadow는 `docs/design-system/style-tokens.md`와 기존 토큰을 먼저 확인한다.
- 반복되는 값만 토큰으로 승격한다.
- 단일 컴포넌트 레이아웃 수치는 무리하게 토큰화하지 않는다.
- magic hex/string을 여러 파일에 복제하지 않는다.

## 컴포넌트 선택

- 새 UI를 만들기 전에 `docs/design-system/component-index.md`에서 사용 가능한 `@repo/ui` export를 확인한다.
- `Button`, `Tabs`, `Table`, `Card`, `Container`, `Section`, `FlexBox`, `Grid`, `Heading`, `Text` 같은 기본 UI는 앱 로컬에서 다시 만들지 않는다.
- 앱 로직과 결합된 조합 컴포넌트는 앱 내부에 두고, 순수 UI로 일반화된 뒤 `packages/ui`로 올린다.

## 접근성 기본값

- button, input, nav, list 등 브라우저 기본 시맨틱 요소를 우선한다.
- focus visible 상태를 제거하지 않는다.
- 아이콘만 있는 버튼에는 accessible name을 제공한다.
- 키보드 상호작용이 필요한 컴포넌트는 Storybook에서 확인 가능해야 한다.

## 앱 스타일

- 앱 전용 레이아웃은 앱 내부 `src/styles` 또는 컴포넌트 옆 `*.css.ts`에 둔다.
- shell global style로 remote 내부를 덮어쓰지 않는다.
- global style은 reset, base font, CSS variable, body/root layout에 한정한다.

## 금지

- `packages/ui`에서 `apps/*` import 금지.
- 앱에서 `packages/ui/src/**` deep import 금지.
- 임의의 일회성 prop으로 variant를 무한 확장 금지.
- 디자인 시스템 컴포넌트에 API 요청 또는 routing 부수 효과 금지.
