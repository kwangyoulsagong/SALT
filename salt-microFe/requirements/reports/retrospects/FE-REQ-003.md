---
id: FE-REQ-003
spec: ../../specs/done/FE-REQ-003.md
checklist: ../checklists/FE-REQ-003.md
title: "@repo/ui lint 경고 정리 회고"
date: 2026-09-08
---

# FE-REQ-003 회고

## 무엇을 했나

`@repo/ui`의 lint 경고 23건을 0으로 만들어 `--max-warnings 0` 게이트를 복구했다. 변경 파일 24개(story 17개는 타입 import 한 줄 이관, `Table.stories`는 컴포넌트 추출로 인한 들여쓰기 변경 포함).

## 잘된 점

- **경고를 덮지 않고 원인을 고쳤다.** `eslint-disable` 주석은 한 건도 쓰지 않았다. 규칙 완화는 `ignoreRestSiblings: true` 하나이고, 이는 "rest로 나머지를 모으면서 특정 prop만 제외"하는 패턴을 위해 ESLint가 제공하는 옵션이라 `TableRow`의 `memoKey` 의도와 정확히 맞는다.
- **경고 1건이 실제 버그였다.** `useDebounce`의 미사용 `args`는 `callback(timeoutRef.current)`로 타이머 ID를 넘기고 있던 버그의 흔적이었다. 유일한 호출부(`ScrollContainer`)가 인자 없는 콜백이라 증상이 없었을 뿐이고, 인자를 받는 콜백으로 쓰는 순간 깨질 코드였다. "경고 = 사소함"이라는 가정이 틀릴 수 있다는 사례.
- **`any` 제거가 타입 검증을 늘렸다.** `InputField`를 제네릭으로 바꾸면서 `name`이 `FieldPath<TFieldValues>`가 됐다. 이제 폼에 없는 필드명을 넘기면 컴파일 에러가 난다. 호출부 2곳은 수정 없이 통과했다.
- **범위를 지켰다.** 공유 설정 `packages/eslint-config/**`는 건드리지 않았고, 규칙 조정은 패키지 로컬 config에만 넣었다.

## 아쉬운 점 / 배운 점

- **스캐폴딩 잔재를 켜면 새 경고가 나온다.** `eslint.config.js`의 미사용 `storybook` import를 "실제로 적용"하는 쪽으로 고치자 `storybook/no-renderer-packages` 17건이 새로 드러났다. 결과적으로 Storybook framework(`@storybook/nextjs-vite` v10)와 story 타입 출처(`@storybook/react` v8.5) 불일치를 찾아낸 건 이득이지만, 처음 계획한 diff보다 파일 수가 크게 늘었다. 플러그인 활성화는 "경고 정리"와 별개 작업으로 분리해 견적을 내는 편이 정확했다.
- **규칙 문서와 코드가 어긋나면 다음 작업에서 되돌아간다.** story import를 옮기면서 `packages/ui/.claude/rules/storybook.md`(+`.codex` 사본)의 "`@storybook/react`에서 타입 import" 지침을 같이 갱신해야 했다. 코드만 바꾸면 다음 작업자가 규칙대로 원복한다.
- **`git diff`를 nested repo에서 봐서 한 번 헷갈렸다.** `salt-microFe/.git`은 커밋이 0개인 빈 레포라 그 안에서 `git diff`를 실행하면 이번 작업과 무관한 변경까지 섞여 나온다. 이번 작업 diff는 항상 루트 `SALT` 레포에서 확인해야 한다.

- **검증 명령이 검증 대상을 오염시킬 수 있다.** `build-storybook`을 돌리고 나서 lint를 다시 실행하니 `storybook-static/` 번들 때문에 게이트가 또 실패했다. 공유 설정의 ignore는 `dist/**`뿐이었다. "빌드 → lint" 순서로 한 번 더 돌려보지 않았으면 CI에서야 발견됐을 문제다.

## 남은 기술부채 / Action Items

1. **루트 `pnpm lint`가 여전히 실패한다(우선순위 높음).** `@repo/message-event-bus`, `@repo/mocks`가 자체 eslint devDependency 없이 루트 `eslint@^8`(8.57.1)로 실행되면서 공유 설정의 eslint 9용 `@typescript-eslint` v8 규칙을 로드해 크래시한다. 두 패키지에 `eslint@^9`를 추가하거나 루트 eslint를 9로 올리는 의존성 정리가 필요하다(FE-REQ-004 후보). 참고로 앱 3개는 `next lint` + eslint 8이라 정상 동작한다.
2. **`@storybook/react`, `@storybook/blocks` v8 의존성이 미사용으로 남았다.** story가 모두 `@storybook/nextjs-vite`를 쓰게 됐으므로 `packages/ui/package.json`에서 제거 가능성을 검토한다(설치/락파일 변경이라 별도 작업).
3. **`@repo/ui`에 테스트가 없다.** `@storybook/addon-vitest`와 `vitest`가 설치되어 있는데 테스트 파일이 없다. `useDebounce` 같은 유틸 hook은 이번 버그처럼 조용히 깨질 수 있어 테스트 대상 1순위다.
4. **다른 패키지/앱의 빌드 산출물 ignore도 점검이 필요하다.** 이번엔 `packages/ui`에만 `storybook-static/**`를 넣었다. 공유 설정(`packages/eslint-config/base.js`)의 ignore 목록에 `.next/**`, `storybook-static/**`, `coverage/**`를 올리는 편이 반복을 줄인다(공유 설정 변경이라 별도 작업).
5. **`salt-microFe/.husky/pre-commit`이 `npm test`를 호출하지만 루트에 `test` 스크립트가 없다.** 훅을 실제로 쓰려면 스크립트를 만들거나 훅 내용을 바꿔야 한다.
