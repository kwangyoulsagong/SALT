---
id: FE-REQ-004
spec: ../../specs/done/FE-REQ-004.md
title: "@repo/message-event-bus / @repo/mocks lint 복구 체크리스트"
validated: 2026-09-08
---

# FE-REQ-004 체크리스트

## 요구사항 검증

| # | 요구사항 | 구현 위치 | 상태 |
|---|---|---|---|
| 1 | `@repo/message-event-bus`에 `eslint: ^9.19.0` 선언 | `packages/message-event-bus/package.json` | ✅ |
| 2 | `@repo/mocks`에 `eslint: ^9.19.0` 선언 | `packages/mocks/package.json` | ✅ |
| 3 | `@repo/ui`도 암묵적 eslint 해석 제거(재발 방지) | `packages/ui/package.json` | ✅ |
| 4 | 공유 설정/루트 eslint 버전 무변경 | `packages/eslint-config/**`, 루트 `package.json` (diff 없음) | ✅ |
| 5 | `(window as any)` 3건 제거 → 지역 교차 타입 | `packages/message-event-bus/src/MessageEventBus.ts` (`MessageEventBusGlobal`, `getBrowserGlobal`) | ✅ |
| 6 | SSR 가드 유지 | `getBrowserGlobal()`이 `typeof window === "undefined"`에서 `undefined` 반환 | ✅ |
| 7 | `declare global`로 `Window` 확장하지 않음 | 지역 타입만 사용 | ✅ |
| 8 | 미사용 `userSeqNo` 파라미터 제거 | `packages/mocks/src/openBank/responses/openBankingResponse.ts`, `.../handlers/openBank.ts` | ✅ |
| 9 | 목 응답 shape 무변경 | `generateAccountList()` 반환 필드 동일 | ✅ |
| 10 | `@repo/mocks` check-types 복구 | `packages/mocks/tsconfig.json` (`module: ESNext`, `moduleResolution: Bundler`) | ✅ (검증 중 발견 후 수정) |
| 11 | 루트 `pnpm lint` 전체 통과 | `turbo lint` 6 tasks 성공 | ✅ |
| 12 | 앱/디자인시스템 회귀 없음 | 3앱 tsc·lint·build, `@repo/ui` build-storybook | ✅ |

## 경고/에러 해소 내역

| 패키지 | 작업 전 | 작업 후 |
|---|---|---|
| `@repo/message-event-bus` lint | exit 2 (eslint 8.57.1 크래시, 검사 불가) → 실행 가능하게 만든 뒤 3 warnings | 0 warnings |
| `@repo/mocks` lint | exit 2 (동일 크래시) → 실행 가능하게 만든 뒤 1 warning | 0 warnings |
| `@repo/mocks` check-types | `TS2835` 4건 | 0 |
| 루트 `pnpm lint` | Failed: `@repo/message-event-bus#lint` (mocks도 크래시) | 6 successful, 6 total |

크래시 원인: 두 패키지가 자체 eslint 없이 루트 `eslint@^8`(8.57.1)로 실행되면서 공유 flat config가 가져오는 eslint 9의 base rule 구현을 로드해 `TypeError: Error while loading rule '@typescript-eslint/no-unused-expressions'`로 종료됐다. 즉 이 두 패키지는 그동안 **한 번도 실제로 lint된 적이 없었다**.

## 실제 수정한 코드

| 항목 | 수정 전 | 수정 후 | 파일 |
|---|---|---|---|
| window singleton 접근 | `(window as any).__MESSAGE_EVENT_BUS_INSTANCE__` (3곳) | `getBrowserGlobal()?.__MESSAGE_EVENT_BUS_INSTANCE__` + `MessageEventBusGlobal` 교차 타입 | `MessageEventBus.ts` |
| 목 계좌 생성 | `generateAccounts(userSeqNo)` — 파라미터 미사용 | `generateAccounts()` | `openBankingResponse.ts` |
| 목 계좌 목록 | `generateAccountList(userSeqNo)` → 내부로 전달만 | `generateAccountList()` | `openBankingResponse.ts` |
| account list handler | Authorization 헤더에서 `userId`를 뽑아 넘기지만 목이 무시 | 헤더 파싱 제거, `generateAccountList()` 호출 | `openBank.ts` |
| mocks tsconfig | override 없음 → `base.json`의 `NodeNext` 상속 | `module: ESNext`, `moduleResolution: Bundler` (형제 패키지와 동일) | `packages/mocks/tsconfig.json` |

## 검증 산출 (2026-09-08)

```text
pnpm --filter @repo/message-event-bus lint          # OK (eslint 9.19.0, 0 warnings)  ← 작업 전: exit 2 크래시
pnpm --filter @repo/mocks             lint          # OK (0 warnings)                 ← 작업 전: exit 2 크래시
pnpm --filter @repo/ui                lint          # OK

pnpm --filter @repo/message-event-bus check-types   # OK
pnpm --filter @repo/mocks             check-types   # OK   ← 작업 전: TS2835 4건
pnpm --filter @repo/ui                check-types   # OK

pnpm lint                                           # OK (turbo lint, 6 successful / 6 total)  ← 작업 전: Failed

cd apps/shell        && npx tsc --noEmit            # OK
cd apps/goals        && npx tsc --noEmit            # OK
cd apps/investments  && npx tsc --noEmit            # OK

pnpm --filter goals        build                    # OK
pnpm --filter investments  build                    # OK
pnpm --filter shell        build                    # OK
pnpm --filter @repo/ui     build-storybook          # OK
```

## 부수 변경 (숨기지 않고 기록)

- `pnpm install`로 `pnpm-lock.yaml`이 갱신됐다. 의도한 변경은 eslint 9.19.0 devDependency 3건이며, 그 외에 루트의 floating specifier(`turbo: "latest"`)와 전이 의존성 재해석이 함께 반영됐다: `eslint-plugin-turbo`의 turbo peer 엔트리 `2.6.2 → 2.10.12`, `debug 4.4.0 → 4.4.3`, `@types/estree 1.0.6 → 1.0.8`, 사용되지 않는 `@storybook/builder-webpack5@8.5.2` 엔트리 정리.
- 실제 설치되어 실행되는 turbo 바이너리는 `2.3.4`로 변경 전과 동일하고(`npx turbo --version`), 위 검증 명령이 모두 통과한다.
- `pnpm install` 출력의 storybook v8/v10 peer 경고는 이번 작업 이전부터 있던 것으로 FE-REQ-003 회고의 후속 과제(미사용 v8 의존성 제거)와 같은 항목이다.
