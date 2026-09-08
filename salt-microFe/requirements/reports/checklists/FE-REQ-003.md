---
id: FE-REQ-003
spec: ../../specs/done/FE-REQ-003.md
title: "@repo/ui lint 경고 정리 체크리스트"
validated: 2026-09-08
---

# FE-REQ-003 체크리스트

## 요구사항 검증

| # | 요구사항 | 구현 위치 | 상태 |
|---|---|---|---|
| 1 | `useDebounce`/`useThrottle` 제네릭 제약을 `(...args: never[]) => unknown`으로 교체 | `packages/ui/src/Utils/hooks/useDebounce.tsx`, `useThrottle.tsx` | ✅ |
| 2 | `useDebounce`가 인자를 유실하던 버그 수정(`callback(timeoutRef.current)` → `callback(...args)`) | `useDebounce.tsx:21` | ✅ |
| 3 | `InputField`를 `TFieldValues extends FieldValues` 제네릭으로 전환(`UseFormRegister<any>` 제거) | `packages/ui/src/InputField/InputField.tsx` | ✅ |
| 4 | 기존 `InputField` 호출부 무수정 통과 | `apps/shell/src/pages/index.tsx`, `apps/goals/.../AddGoalsContent.tsx` (변경 없음, tsc 통과) | ✅ |
| 5 | story `Box` 헬퍼 `any` 제거 → `ComponentPropsWithoutRef<"div">` | `FlexBox.stories.tsx`, `Grid.stories.tsx` | ✅ |
| 6 | `Margin.stories`의 `as any` 캐스팅 제거 → `NonNullable<MarginProps["bottom"]>[]` 상수 | `Margin/Margin.stories.tsx` (`spaceSizes`) | ✅ |
| 7 | story 미사용 import 제거(`Card`, `GridItem`, `FlexBox`) | `FlexBox.stories.tsx`, `Grid.stories.tsx`, `Margin.stories.tsx` | ✅ |
| 8 | `render` 안 `useState` 제거 → 대문자 컴포넌트로 추출 | `FilterTabs.stories.tsx`(`StatefulFilterTabs`), `Table.stories.tsx`(`ClickableTableExample`, `SortableTableExample`) | ✅ |
| 9 | `Tabs` switch case 블록 스코프화 | `packages/ui/src/Tabs/Tabs.tsx` (`ArrowLeft`, `ArrowRight`) | ✅ |
| 10 | `Card.stories` JSX 따옴표 이스케이프 | `Card/Card.stories.tsx:322` (`&quot;`) | ✅ |
| 11 | `memoKey` 경고를 `ignoreRestSiblings`로 해소(소스 무변경, 공유 설정 무변경) | `packages/ui/eslint.config.js` | ✅ |
| 12 | `eslint-plugin-storybook` import만 있던 상태 해소 → flat config 실제 적용 | `packages/ui/eslint.config.js` | ✅ |
| 13 | story 타입 import를 framework 패키지로 이관(17개 파일) | `packages/ui/src/**/*.stories.tsx` (`@storybook/nextjs-vite`) | ✅ (요구사항 #6, 작업 중 추가) |
| 14 | Storybook 규칙 문서를 코드와 일치시키기 | `packages/ui/.claude/rules/storybook.md`, `packages/ui/.codex/rules/storybook.md` | ✅ |
| 15 | Storybook 빌드 산출물을 lint 대상에서 제외 | `packages/ui/eslint.config.js` (`ignores: ["storybook-static/**"]`) | ✅ (검증 중 발견 후 수정) |
| 16 | `--max-warnings 0` 게이트 복구 | `pnpm --filter @repo/ui lint` exit 0 | ✅ |
| 17 | 루트 `pnpm lint`(turbo lint) 전체 통과 | `@repo/message-event-bus`, `@repo/mocks`가 eslint 8/9 혼용으로 크래시 | ❌ 미충족 (범위 밖, 후속 과제) |

## 경고 해소 내역 (23 → 0)

| 규칙 | 작업 전 | 작업 후 | 해소 방식 |
|---|---|---|---|
| `@typescript-eslint/no-explicit-any` | 8 | 0 | `never[]`/`unknown` 제네릭, 제네릭 컴포넌트, `ComponentPropsWithoutRef`, 토큰 union 타입 |
| `@typescript-eslint/no-unused-vars` | 6 | 0 | 미사용 import 제거, 인자 유실 버그 수정, storybook 플러그인 실제 적용, `ignoreRestSiblings` |
| `react-hooks/rules-of-hooks` | 5 | 0 | 상태 보유 story를 대문자 컴포넌트로 추출 |
| `no-case-declarations` | 2 | 0 | case 본문 블록 스코프화 |
| `react/no-unescaped-entities` | 2 | 0 | `&quot;` 이스케이프 |
| `storybook/no-renderer-packages` | 0(비활성) → 17(활성 직후) | 0 | story 타입 import를 `@storybook/nextjs-vite`로 이관 |

`build-storybook`을 실행한 뒤 lint가 다시 실패했다. 원인은 8.9MB 규모의 `storybook-static/` 번들이 lint 대상에 포함돼 `@typescript-eslint/no-unused-expressions` 경고가 쏟아진 것이고, 공유 설정의 `ignores`에는 `dist/**`만 있어 잡히지 않았다. `packages/ui/eslint.config.js`에 `storybook-static/**` ignore를 추가해 해결했다(해당 디렉터리는 이미 `.gitignore` 대상).

`eslint-disable` 주석은 사용하지 않았다. 규칙 완화는 `ignoreRestSiblings: true` 하나이며 `packages/ui/eslint.config.js` 로컬 override로 제한했다(공유 설정 `packages/eslint-config/**` 무변경).

## 검증 산출 (2026-09-08)

```text
pnpm --filter @repo/ui lint                         # OK (0 warnings, 0 errors)  ← 작업 전: 23 warnings, exit 1
pnpm --filter @repo/ui check-types                  # OK
pnpm --filter @repo/message-event-bus check-types   # OK

cd apps/shell        && npx tsc --noEmit            # OK (exit 0)
cd apps/goals        && npx tsc --noEmit            # OK (exit 0)
cd apps/investments  && npx tsc --noEmit            # OK (exit 0)

pnpm --filter shell        lint                     # OK
pnpm --filter goals        lint                     # OK
pnpm --filter investments  lint                     # OK

pnpm --filter goals        build                    # OK
pnpm --filter investments  build                    # OK
pnpm --filter shell        build                    # OK

pnpm --filter @repo/ui build-storybook              # OK
```

## 미충족 항목 (숨기지 않고 기록)

- 루트 `pnpm lint`(turbo lint, 8 패키지)는 여전히 실패한다. 실패 패키지는 `@repo/message-event-bus`와 `@repo/mocks`이고, `@repo/ui`는 이제 통과한다.
  - 원인: 두 패키지에 자체 eslint devDependency가 없어 루트 `eslint@^8`(8.57.1) 바이너리로 실행되는데, 공유 설정이 가져오는 `@typescript-eslint` v8 규칙은 eslint 9 기준이라 규칙 로딩 단계에서 `TypeError`로 크래시한다(`Error while loading rule '@typescript-eslint/no-unused-expressions'`).
  - 이번 요구사항 범위(`packages/ui/**`, 의존성 변경 제외) 밖이라 수정하지 않았다. 후속 과제로 회고에 기록했다.
