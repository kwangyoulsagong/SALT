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
pnpm --filter web build
pnpm --filter web-tax build
pnpm check-types
pnpm --filter @repo/ui lint
pnpm --filter @repo/ui check-types
```

## 정적 규칙 점검

- zone(`apps/*/src`) 간 직접 import가 없는지 확인. 공유는 workspace 패키지로만 한다.
- `window/document/localStorage`가 render 또는 top-level에서 쓰이지 않는지 확인.
- `packages/ui`가 `apps/*`를 import하지 않는지 확인.
- API service가 store를 직접 import하지 않는지 확인.
- `next/dynamic` import에는 SSR 의도와 loading fallback이 있는지 확인.
- zone 간 경로가 유일한지, 다른 zone 경로에 `next/link`의 `<Link>`를 쓰지 않았는지 확인 (`@repo/zone/no-cross-zone-link`).
- `transpilePackages`에 존재하지 않는 workspace package가 없는지 확인.
- `apps/web-tax`가 `apps/web/src/**`를 직접 import하지 않는지 확인.
- `packages/tokens`가 `@vanilla-extract/css`를 import하지 않는지 확인 (RN이 못 쓰게 된다).

## 결과 보고

```text
## Validation Report

| Check | Status | Details |
|---|---|---|
| Lint | pass/fail/skipped | 내용 |
| Build | pass/fail/skipped | 내용 |
| MFE Boundary | pass/fail | 내용 |
| SSR Safety | pass/fail | 내용 |
| Zone Boundary | pass/fail | 경로 중복 · cross-zone `<Link>` · zone 간 직접 import 점검 |
| Shared Packages | pass/fail | `transpilePackages` · `@repo/tokens`의 CSS 의존 없음 점검 |
| Event Bus Registry | pass/fail | event name/payload registry 점검 |

## Errors
- 파일 — 에러 — 수정 제안
```

## 체크리스트

요구사항 파일이 있으면 `requirements/reports/checklists/REQ-{번호}.md`에 충족 여부를 저장한다.
