---
id: FE-REQ-003
title: "@repo/ui lint 경고 정리 (--max-warnings 0 게이트 복구)"
priority: medium
labels: [chore, design-system, lint, tech-debt, type-safety]
created: 2026-09-08
updated: 2026-09-08
---

## Summary

`pnpm --filter @repo/ui lint`(`eslint . --max-warnings 0`)이 경고 23건으로 실패한다. 세 앱(`shell`/`goals`/`investments`)의 lint는 통과하지만 `@repo/ui`만 빨간불이라 루트 `pnpm lint`(turbo lint) 전체가 실패한다. FE-REQ-001/FE-REQ-002 회고에서 "이번 작업 이전부터 있던 경고, 별도 정리 대상"으로 기록되어 미뤄둔 항목을 이번 요구사항에서 정리한다.

경고를 `eslint-disable`이나 규칙 off로 덮지 않고, 원인이 되는 코드를 고치는 것을 원칙으로 한다. 규칙 옵션을 조정하는 경우는 해당 패턴을 위해 ESLint가 제공하는 공식 옵션에 한정하고 근거를 남긴다.

이 요구사항은 `salt-microFe/packages/ui/**`(+ 타입 변경 영향이 있는 `apps/**` 호출부 확인) 범위에만 적용한다. `bff/**`, `salt-server/**`는 변경하지 않는다.

## Research Notes

- `no-unused-vars`의 `ignoreRestSiblings` 옵션은 "rest 프로퍼티로 나머지를 모으면서 특정 프로퍼티만 destructuring으로 제외하는" 패턴을 위해 존재한다. `eslint-disable` 대신 이 옵션을 쓰는 것이 규칙 의도에 맞다. 출처: [ESLint no-unused-vars](https://eslint.org/docs/latest/rules/no-unused-vars)
- `case` 블록 안의 `let`/`const`는 switch 전체 스코프로 호이스팅되어 다른 `case`에서도 보이므로, 중괄호로 case 본문을 감싸 블록 스코프를 만들어야 한다. 출처: [ESLint no-case-declarations](https://eslint.org/docs/latest/rules/no-case-declarations)
- Hook은 React 함수 컴포넌트나 커스텀 Hook 안에서만 호출해야 한다. Storybook CSF의 `render`는 대문자로 시작하지 않는 일반 함수라 `render` 안에서 `useState`를 직접 부르면 규칙 위반이다. 상태가 필요한 story는 대문자 컴포넌트로 추출해 `render`에서 그 컴포넌트를 렌더링한다. 출처: [Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks)
- 제네릭 함수 타입 제약에서 `(...args: any[]) => any` 대신 `(...args: never[]) => unknown`을 쓰면 `no-explicit-any` 없이도 임의 함수 타입을 받을 수 있다. 파라미터는 반공변으로 검사되므로 `never[]`가 어떤 파라미터 목록에도 대입 가능하다. 출처: [typescript-eslint no-explicit-any](https://typescript-eslint.io/rules/no-explicit-any)
- `react-hook-form`의 `UseFormRegister<TFieldValues>`와 `FieldPath<TFieldValues>`를 함께 쓰면 `any` 없이 폼 필드명을 타입으로 검증할 수 있다. 출처: [react-hook-form register](https://react-hook-form.com/docs/useform/register)
- `eslint-plugin-storybook`은 flat config에서 `storybook.configs["flat/recommended"]`를 spread해 적용하며, 이 설정은 `**/*.stories.*`와 `.storybook/**`에만 붙는다. 출처: [eslint-plugin-storybook flat config](https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format)
- 레포 lint는 `packages/eslint-config/base.js`에서 `eslint-plugin-only-warn`을 적용하므로 모든 error가 warning으로 표시된다. 즉 현재 23건은 "경고 수준의 사소한 문제"가 아니라 `--max-warnings 0` 게이트를 막는 error급 항목이다. 근거: `packages/eslint-config/base.js`

## Current Findings (작업 전 상태)

`pnpm --filter @repo/ui lint` → 23 warnings (0 errors), 게이트 실패. 규칙별 분류:

| 규칙 | 건수 | 위치 |
|---|---|---|
| `@typescript-eslint/no-explicit-any` | 8 | `useDebounce.tsx`(2), `useThrottle.tsx`(2), `InputField.tsx`(1), `FlexBox.stories.tsx`(1), `Grid.stories.tsx`(1), `Margin.stories.tsx`(1) |
| `@typescript-eslint/no-unused-vars` | 6 | `eslint.config.js`(storybook), `FlexBox.stories.tsx`(Card), `Grid.stories.tsx`(GridItem), `Margin.stories.tsx`(FlexBox), `Table.tsx`(memoKey), `useDebounce.tsx`(args) |
| `react-hooks/rules-of-hooks` | 5 | `FilterTabs.stories.tsx`(3), `Table.stories.tsx`(2) |
| `no-case-declarations` | 2 | `Tabs.tsx`(69, 83) |
| `react/no-unescaped-entities` | 2 | `Card.stories.tsx`(322) |

추가로 확인된 사실:

- `useDebounce`의 `args`가 미사용인 이유는 실제 버그다. `callback(timeoutRef.current)`로 타이머 ID를 콜백에 넘기고 있어 debounce 대상 인자가 유실된다. 현재 유일한 호출부(`ScrollContainer`)가 인자 없는 콜백을 쓰기 때문에 증상이 드러나지 않았다.
- `Table.tsx`의 `memoKey`는 memo 비교 함수 전용 prop이며, `<tr>`로 스프레드되지 않도록 destructuring으로 제외하는 용도라 "쓰지 않는 것"이 의도다.
- `packages/ui/eslint.config.js`는 `eslint-plugin-storybook`을 import만 하고 적용하지 않는다(스캐폴딩 잔재).

## Requirements

### 1. 타입 안전성 (`no-explicit-any` 8건)

- `useDebounce`, `useThrottle`의 제네릭 제약을 `(...args: never[]) => unknown`으로 바꾼다.
- `InputField`를 `TFieldValues extends FieldValues` 제네릭 컴포넌트로 바꾸고 `register: UseFormRegister<TFieldValues>`, `name: FieldPath<TFieldValues>`를 받는다. 기존 호출부(`apps/shell`, `apps/goals`)는 코드 변경 없이 통과해야 한다.
- story의 `Box` 헬퍼는 `ComponentPropsWithoutRef<"div">`로 타입을 준다.
- `Margin.stories`의 `bottom={size as any}` 캐스팅을 제거하고 배열 자체에 `NonNullable<MarginProps["bottom"]>[]` 타입을 준다.

### 2. 미사용 심볼 (`no-unused-vars` 6건)

- story의 미사용 import(`Card`, `GridItem`, `FlexBox`)를 제거한다.
- `packages/ui/eslint.config.js`의 `storybook` import는 지우지 않고 `storybook.configs["flat/recommended"]`를 실제로 적용해 story 전용 규칙을 켠다. 새로 발생하는 storybook 규칙 위반은 이번 작업에서 함께 해결한다.
- `useDebounce`는 `callback(...args)`로 원래 의도대로 인자를 전달하도록 고친다(버그 수정 + 경고 해소).
- `Table.tsx`의 `memoKey`는 코드를 바꾸지 않고, `packages/ui/eslint.config.js`에 패키지 로컬 override로 `ignoreRestSiblings: true`를 준다. 공유 설정(`packages/eslint-config/**`)은 건드리지 않는다.

### 3. Hook 규칙 (`rules-of-hooks` 5건)

- `FilterTabs.stories`의 상태 보유 `render` 3건을 대문자 컴포넌트로 추출한다.
- `Table.stories`의 `Clickable`, `WithSorting` `render`를 대문자 컴포넌트로 추출한다.
- story의 시각적 결과(렌더 출력)는 바뀌지 않아야 한다.

### 4. 문법/문구 (`no-case-declarations` 2건, `no-unescaped-entities` 2건)

- `Tabs.tsx`의 `ArrowLeft`/`ArrowRight` case 본문을 블록(`{ ... }`)으로 감싼다. 키보드 탐색 동작은 그대로 유지한다.
- `Card.stories`의 JSX 텍스트 안 따옴표를 `&quot;`로 이스케이프한다.

### 6. storybook 플러그인 활성화 후속 (작업 중 확인)

- `storybook.configs["flat/recommended"]`를 적용하면 `storybook/no-renderer-packages`가 story 17개에서 새로 발생한다. 이 패키지의 Storybook framework는 `@storybook/nextjs-vite`(v10)인데 story는 renderer 패키지 `@storybook/react`(v8.5)에서 타입을 가져오고 있었다.
- 17개 story의 `import type { Meta, StoryObj }`를 framework 패키지 `@storybook/nextjs-vite`로 옮긴다.
- 규칙 문서(`packages/ui/.claude/rules/storybook.md`, `.codex/rules/storybook.md`)의 "`@storybook/react`에서 타입 import" 지침도 함께 갱신한다. 문서와 코드가 어긋나면 다음 작업에서 되돌아간다.
- `pnpm --filter @repo/ui build-storybook`으로 Storybook 빌드 회귀가 없는지 확인한다.

### 5. 게이트 복구

- `pnpm --filter @repo/ui lint`가 `--max-warnings 0`으로 통과한다(옵션 완화나 `--max-warnings` 상향 금지).
- 세 앱의 lint/tsc/build 회귀가 없다.

## 구현 계획 (Plan)

1. **hooks**: `useDebounce`(제네릭 + `callback(...args)` 버그 수정), `useThrottle`(제네릭) → `ScrollContainer` 호출부 타입 확인.
2. **컴포넌트**: `InputField` 제네릭화 → `apps/shell`, `apps/goals` tsc 확인. `Tabs.tsx` case 블록화. `Table.tsx`는 무변경.
3. **stories**: 미사용 import 제거, `Box` 타입 지정, `Margin` 캐스팅 제거, `FilterTabs`/`Table` 상태 story 컴포넌트 추출, `Card` 따옴표 이스케이프.
4. **eslint config**: `packages/ui/eslint.config.js`에서 storybook flat config 적용 + `ignoreRestSiblings: true` override.
5. **검증**: `@repo/ui` lint/check-types → 3앱 tsc/lint → 3앱 build(goals→investments→shell) → `build-storybook` → 결과를 체크리스트에 기록.

## Acceptance Criteria

- `pnpm --filter @repo/ui lint`가 exit 0 (0 warnings, 0 errors).
- `pnpm --filter @repo/ui check-types`가 통과한다.
- `packages/ui/src/**`에 `any`가 새로 추가되지 않고, 기존 8건이 제거된다.
- `eslint-disable` 주석으로 경고를 덮은 곳이 없다.
- `packages/eslint-config/**`(공유 설정)이 변경되지 않는다.
- `shell`, `goals`, `investments`의 `tsc --noEmit`과 `lint`가 통과한다.
- `goals`, `investments`, `shell` build가 모두 성공한다.
- `pnpm --filter @repo/ui build-storybook`이 성공한다.
- story의 Storybook 타입 import가 framework 패키지로 통일되고 규칙 문서가 코드와 일치한다.
- `InputField` 호출부(`apps/shell/src/pages/index.tsx`, `apps/goals/.../AddGoalsContent.tsx`)는 수정 없이 컴파일된다.
- story의 렌더 결과와 `Tabs` 키보드 탐색 동작이 변경되지 않는다.

## Out Of Scope

- `packages/eslint-config/**` 공유 설정 변경, `only-warn` 플러그인 제거.
- `bff/**`, `salt-server/**` 변경.
- 컴포넌트 API/디자인 변경, 새 variant 추가.
- 테스트 코드 신규 작성(테스트 도입은 별도 REQ).
- 앱(`apps/**`) 내부 lint 경고 정리(현재 0건).

## Changelog

- 2026-09-08: FE-REQ-002 검증 중 남아 있던 `@repo/ui` lint 경고 23건을 별도 요구사항으로 분리해 작성했다.
- 2026-09-08: storybook flat config를 적용하니 `storybook/no-renderer-packages` 17건이 새로 나왔다. story 타입 import를 `@storybook/nextjs-vite`로 옮기고 Storybook 규칙 문서를 갱신하는 요구사항(#6)을 추가했다.
- 2026-09-08: `useDebounce`가 `callback(timeoutRef.current)`로 인자를 유실하던 버그를 `callback(...args)`로 고쳤다. 미사용 변수 경고가 실제 버그였다.
- 2026-09-08: 검증 중 루트 `pnpm lint`(turbo lint)가 `@repo/ui` 외에 `@repo/message-event-bus`, `@repo/mocks`에서도 실패하는 것을 확인했다. 원인은 두 패키지가 자체 eslint devDependency 없이 루트 `eslint@^8`(8.57.1)을 쓰면서 공유 설정의 eslint 9용 규칙을 로드해 크래시하는 것이다. 의존성 변경이 필요해 본 요구사항 범위에서 제외하고 후속 과제로 남겼다(회고 참조).

- 2026-09-08: `build-storybook` 검증 후 lint가 다시 실패했다. `storybook-static/` 빌드 산출물이 lint 대상에 들어가는 문제라 `packages/ui/eslint.config.js`에 `ignores: ["storybook-static/**"]`를 추가했다.

## Status

- done (검증 완료: `@repo/ui` lint 0 warnings, 3앱 tsc/lint/build, build-storybook 통과). 본 spec은 `requirements/specs/done/`에 위치한다.
