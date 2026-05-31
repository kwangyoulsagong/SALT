---
name: validate
description: "Phase 3: 타입, 린트, 빌드, MFE/SSR 규칙을 검증한다"
---

# Phase 3: Validate

## 기본 검증

변경 범위에 따라 실행한다.

```bash
cd salt-microFe
pnpm lint
pnpm build
pnpm --filter shell build
pnpm --filter goals build
pnpm --filter investments build
pnpm --filter @repo/ui lint
pnpm --filter @repo/ui check-types
```

## 정적 규칙 점검

- `apps/*/src` 간 직접 import가 없는지 확인.
- `window/document/localStorage`가 render 또는 top-level에서 쓰이지 않는지 확인.
- remote expose 변경 시 shell import도 같이 변경됐는지 확인.
- `packages/ui`가 `apps/*`를 import하지 않는지 확인.
- API service가 store를 직접 import하지 않는지 확인.
- shell route가 remote를 `React.lazy`로 직접 소비하지 않는지 확인.
- `next/dynamic` remote import에는 SSR 의도와 loading fallback이 있는지 확인.
- `@tanstack/react-query` shared 설정이 shell/goals/investments에서 일관적인지 확인.
- `transpilePackages`에 존재하지 않는 workspace package가 없는지 확인.
- shell remote type declaration이 실제 configured remote/expose와 일치하는지 확인.
- event bus 사용처가 문자열 직접 입력 대신 registry event name을 쓰는지 확인.
- event bus payload 타입이 `any`가 아닌 registry 기반 타입인지 확인.

## 결과 보고

```text
## Validation Report

| Check | Status | Details |
|---|---|---|
| Lint | pass/fail/skipped | 내용 |
| Build | pass/fail/skipped | 내용 |
| MFE Boundary | pass/fail | 내용 |
| SSR Safety | pass/fail | 내용 |
| Remote Loading | pass/fail | React.lazy/direct dynamic 점검 |
| Shared Dependencies | pass/fail | federation shared/transpilePackages 점검 |
| Event Bus Registry | pass/fail | event name/payload registry 점검 |

## Errors
- 파일 — 에러 — 수정 제안
```

## 체크리스트

요구사항 파일이 있으면 `requirements/reports/checklists/REQ-{번호}.md`에 충족 여부를 저장한다.
