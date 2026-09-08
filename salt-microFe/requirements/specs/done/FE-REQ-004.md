---
id: FE-REQ-004
title: "@repo/message-event-bus / @repo/mocks lint 복구 (eslint 8·9 혼용 해소)"
priority: medium
labels: [chore, tooling, lint, tech-debt, type-safety]
created: 2026-09-08
updated: 2026-09-08
---

## Summary

FE-REQ-003으로 `@repo/ui` lint를 통과시킨 뒤에도 루트 `pnpm lint`(turbo lint)는 실패했다. 남은 실패는 `@repo/message-event-bus`와 `@repo/mocks`이고, 원인은 경고가 아니라 **eslint 실행 자체의 크래시**였다. 두 패키지는 자체 eslint devDependency가 없어 워크스페이스 루트의 `eslint@^8`(8.57.1) 바이너리로 실행되는데, 공유 flat config는 eslint 9 기준 `typescript-eslint` v8 규칙을 로드하기 때문에 규칙 로딩 단계에서 `TypeError`로 죽는다.

이 요구사항은 (1) 두 패키지가 올바른 eslint 버전으로 실행되게 만들고, (2) 그렇게 해서 처음으로 드러난 실제 경고를 고쳐 `--max-warnings 0`을 통과시키는 것을 목표로 한다.

범위는 `salt-microFe/packages/message-event-bus/**`, `packages/mocks/**`, `packages/ui/package.json`(같은 재발 위험 차단)이다. `bff/**`, `salt-server/**`는 변경하지 않는다.

## Research Notes

- pnpm은 패키지가 **직접 선언한** dependency의 실행 파일만 그 패키지의 `node_modules/.bin`에 링크한다. 선언하지 않으면 스크립트 실행 시 워크스페이스 루트의 `.bin`으로 폴백한다. 그래서 같은 레포 안에서 패키지별로 다른 eslint 버전이 실행될 수 있다. 출처: [pnpm workspaces](https://pnpm.io/workspaces)
- eslint 9의 flat config와 rule 구현은 eslint 8 런타임과 호환되지 않는다. `@typescript-eslint`의 확장 규칙(`no-unused-expressions` 등)은 base rule 구현을 가져와 확장하므로, eslint 8 Linter가 eslint 9의 base rule을 로드하면 옵션 스키마가 어긋나 `TypeError`가 난다. 출처: [ESLint flat config 마이그레이션](https://eslint.org/docs/latest/use/configure/migration-guide), [typescript-eslint](https://typescript-eslint.io/getting-started)
- `window`에 전역 slot을 두는 singleton은 `as any` 대신 `Window & typeof globalThis & { __SLOT__?: T }` 교차 타입으로 좁히면 타입 안전하게 접근할 수 있다. `declare global`로 `Window`를 확장하면 이 slot이 모든 소비 앱의 타입에 노출되므로, 패키지 내부 지역 타입이 더 좁은 선택이다. 출처: [TypeScript declaration merging](https://www.typescriptlang.org/docs/handbook/declaration-merging.html)
- `moduleResolution: "NodeNext"`는 상대 import에 확장자를 요구한다(`TS2835`). 번들러가 소비하는 source-only 워크스페이스 패키지는 `moduleResolution: "Bundler"`가 맞다. 출처: [TypeScript moduleResolution](https://www.typescriptlang.org/tsconfig#moduleResolution)
- 레포 event bus 규칙은 payload/콜백에 `any`를 금지하고 registry 기반 타입을 요구한다. 근거: `.claude/rules/event-bus.md`

## Current Findings (작업 전 상태)

```text
pnpm --filter @repo/message-event-bus lint   # exit 2, ESLint: 8.57.1
  TypeError: Error while loading rule '@typescript-eslint/no-unused-expressions':
  Cannot read properties of undefined (reading 'allowShortCircuit')
  at .../eslint@9.19.0/node_modules/eslint/lib/rules/no-unused-expressions.js:75
  at .../eslint@8.57.1/node_modules/eslint/lib/linter/linter.js:895
pnpm --filter @repo/mocks lint               # 같은 크래시
pnpm --filter @repo/ui lint                  # OK (eslint 9.19.0로 실행됨)
```

- `packages/ui`는 `eslint`를 직접 선언하지 않았지만 storybook 계열 의존성 덕분에 로컬 `.bin/eslint`가 9.19.0으로 잡혀 우연히 통과하고 있었다. 의존성 구성이 바뀌면 같은 방식으로 깨질 수 있다.
- eslint를 실제로 실행시키자 그동안 한 번도 검사되지 않았던 실제 경고가 드러났다.
  - `packages/message-event-bus/src/MessageEventBus.ts` — `(window as any).__MESSAGE_EVENT_BUS_INSTANCE__` 3건 (`no-explicit-any`).
  - `packages/mocks/src/openBank/responses/openBankingResponse.ts:104` — `generateAccounts(userSeqNo)`의 `userSeqNo` 미사용 (`no-unused-vars`).
- 추가 확인: `pnpm --filter @repo/mocks check-types`도 `TS2835` 4건으로 실패한다. `packages/mocks/tsconfig.json`만 `module`/`moduleResolution` override가 없어 `@repo/typescript-config/base.json`의 `NodeNext`를 그대로 상속하기 때문이다(형제 패키지 `ui`, `message-event-bus`는 `Bundler`로 override).

## Requirements

### 1. eslint 실행 환경 고정

- `packages/message-event-bus`, `packages/mocks`에 `eslint: ^9.19.0` devDependency를 선언한다.
- 재발 방지를 위해 `packages/ui`도 암묵적 해석에 의존하지 않도록 같은 선언을 추가한다.
- 공유 설정(`packages/eslint-config/**`)과 루트 `eslint: ^8`은 바꾸지 않는다. 앱 3개는 `next lint` + eslint 8로 동작하므로 건드리지 않는다.

### 2. `window` singleton 타입 정리 (`no-explicit-any` 3건)

- `(window as any)` 캐스팅을 제거하고 `Window & typeof globalThis & { __MESSAGE_EVENT_BUS_INSTANCE__?: MessageEventBus }` 지역 타입으로 대체한다.
- SSR 가드(`typeof window === "undefined"`) 동작은 그대로 유지한다.
- `declare global`로 전역 `Window`를 확장하지 않는다(소비 앱 타입 오염 방지).

### 3. 미사용 파라미터 정리 (`no-unused-vars` 1건)

- `generateAccounts`는 목 계좌를 무작위 생성하므로 사용하지 않는 `userSeqNo` 파라미터를 제거한다.
- 호출 체인(`generateAccountList`, `openBankHandlers`의 account list handler)도 같이 정리한다. 목 응답 shape은 바꾸지 않는다.

### 4. `@repo/mocks` check-types 복구

- `packages/mocks/tsconfig.json`에 형제 패키지와 동일하게 `module: "ESNext"`, `moduleResolution: "Bundler"`를 추가한다.
- 소스 import 경로는 바꾸지 않는다.

### 5. 게이트 복구

- `pnpm --filter @repo/message-event-bus lint`, `pnpm --filter @repo/mocks lint`가 `--max-warnings 0`으로 통과한다.
- 루트 `pnpm lint`(turbo lint)가 전체 통과한다.
- 세 앱과 `@repo/ui`에 회귀가 없다(tsc/lint/build/build-storybook).

## Acceptance Criteria

- `pnpm lint`(루트 turbo lint) exit 0, 모든 lint task 성공.
- `@repo/message-event-bus`, `@repo/mocks`, `@repo/ui` 각각 lint 0 warnings / check-types 통과.
- `packages/message-event-bus/src/**`에 `any`가 없다.
- `eslint-disable` 주석이나 `--max-warnings` 상향으로 해결한 항목이 없다.
- `packages/eslint-config/**`, 루트 `package.json`의 eslint 버전이 변경되지 않는다.
- `shell`, `goals`, `investments`의 `tsc --noEmit`/`lint`/`build`가 통과한다.
- `pnpm --filter @repo/ui build-storybook`이 성공한다.
- event bus의 SSR 가드와 MFE singleton 동작(`window` slot 재사용)이 유지된다.

## Out Of Scope

- 앱(`apps/**`) eslint 8 → 9 마이그레이션. `next lint`(Next 14)와 묶여 있어 별도 과제다.
- 공유 설정 `packages/eslint-config/**` 변경(예: ignore 목록에 `.next/**`, `storybook-static/**` 승격).
- `@repo/ui`의 미사용 `@storybook/react`, `@storybook/blocks` v8 의존성 제거.
- 테스트 코드 신규 작성.
- `bff/**`, `salt-server/**` 변경.

## Changelog

- 2026-09-08: FE-REQ-003 검증에서 확인된 `@repo/message-event-bus`, `@repo/mocks` lint 크래시를 별도 요구사항으로 분리해 작성했다.
- 2026-09-08: eslint를 실행 가능하게 만든 뒤 드러난 실제 경고 4건(`any` 3, 미사용 파라미터 1)을 수정 요구사항에 포함했다.
- 2026-09-08: `@repo/mocks`의 `check-types` 실패(`TS2835` 4건)가 tsconfig 상속 문제임을 확인하고 요구사항 #4로 포함했다.
- 2026-09-08: `pnpm install`로 `pnpm-lock.yaml`이 갱신됐다. 의도한 변경은 eslint 9.19.0 3건이고, 그 외에 floating specifier(`turbo: latest`)와 전이 의존성 재해석(`debug`, `@types/estree`, storybook webpack builder 엔트리 정리)이 함께 반영됐다. 설치된 turbo 바이너리는 2.3.4로 동일하고 모든 검증 명령이 통과한다.

## Status

- done (검증 완료: 루트 `pnpm lint` 6/6 통과, 3패키지 check-types, 3앱 tsc/lint/build, build-storybook 통과). 본 spec은 `requirements/specs/done/`에 위치한다.
