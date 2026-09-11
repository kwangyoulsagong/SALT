# SALT MicroFE Codex Harness

`salt-microFe/**` 프론트엔드 작업에 적용한다. `bff/**`, `salt-server/**`는 명시 요청이 없으면 수정하지 않는다.

## 프로젝트 개요

- Monorepo: `pnpm` workspace + Turborepo
- Apps: `apps/web`(default zone, 3000), `apps/web-tax`(tax zone, 3001)
- Framework: Next.js 15 Pages Router, React 18, TypeScript strict
- MFE: **Next.js Multi-Zones**. `@module-federation/nextjs-mf`는 제거됐다 (`requirements/decisions/ADR-001-microfrontend-replacement.md`)
- Style: Vanilla Extract(`*.css.ts`) + `@repo/ui`
- Shared packages: `packages/tokens`(플랫폼 중립 토큰), `packages/core`(플랫폼 무관 모델·상수·zone 레지스트리), `packages/ui`(웹 전용), `packages/mocks`, `packages/eslint-config`, `packages/eslint-plugin-zone`, `packages/typescript-config`

> **전환 중.** `FE-REQ-007`까지 완료. 남은 순서는 `FE-REQ-008`(App Router + 스트리밍 SSR) → `FE-REQ-009`(FSD 전환).

## Commands

```bash
pnpm dev                        # 두 zone 동시 기동 (web:3000, web-tax:3001)
pnpm build
pnpm lint
pnpm check-types
pnpm --filter web dev
pnpm --filter web-tax dev
pnpm --filter @repo/ui lint
pnpm --filter @repo/ui check-types
pnpm --filter @repo/ui storybook
```

## 구조 원칙

- 별도 레이어 아키텍처를 새로 도입하지 않는다. 현재 앱 구조와 도메인 폴더 규칙을 따른다.
- 앱 내부는 현재 구조를 따른다: `src/pages`, `src/components` 또는 `src/component`, `src/api`, `src/hooks`, `src/store`, `src/styles`, `src/constants`, `src/utils`, `src/types`.
- 도메인은 기능 도메인 폴더로 분리한다. 예: `src/domains/portfolio`, `src/domains/market`, `src/domains/goal`가 필요하면 그 안에 `components`, `api`, `hooks`, `store`, `types`, `constants`를 둔다.
- 단일 앱에서만 쓰는 코드는 앱 내부에 둔다. 2개 이상 앱에서 반복되거나 런타임 계약이면 `packages/*`로 승격한다.
- zone끼리 `apps/other/src/...`를 직접 import하지 않는다. 공유는 **workspace 패키지로만** 한다 (`@repo/tokens` · `@repo/ui` · `@repo/core`).
- zone 간 통신은 **URL 파라미터와 서버 상태**로 한다. zone을 넘는 링크는 `<a>`(=`CrossZoneLink`)다 — `<Link>`는 lint에서 막힌다.
- route 파일은 얇게 유지하고 조합만 담당한다. 실제 UI와 로직은 컴포넌트/도메인 폴더로 내린다.

## Rule Index

- `.codex/rules/domain-architecture.md` — 도메인 분리
- `.codex/rules/component-convention.md` — 컴포넌트 패턴
- `.codex/rules/api-convention.md` — API + React Query
- `.codex/rules/state-convention.md` — Zustand/Redux 상태
- `.codex/rules/import-convention.md` — import/alias
- `.codex/rules/className-convention.md` — className 작성
- `.codex/rules/constants-convention.md` — 상수 추출
- `.codex/rules/microfrontend.md` — **Next.js Multi-Zones** (zone 경계 기준)
- `.codex/rules/ssr.md` — SSR/하이드레이션
- `.codex/rules/performance.md` — 렌더링/번들/네트워크 성능
- `.codex/rules/canvas.md` — 고부하 시 Canvas 도입 기준
- `.codex/rules/design-system.md` — `@repo/ui` 디자인 시스템
- `.codex/rules/a11y-policy.md` — 접근성
- `.codex/rules/i18n-policy.md` — 문구/i18n 정책
- `.codex/rules/requirements-management.md` — 요구사항/리포트 관리
- `.codex/rules/study-report.md` — 요구사항 기반 학습 보고서 작성

## 문서 인덱스

- `docs/design-system/style-tokens.md` — `packages/ui/src/styles/tokens.css.ts` 토큰 인덱스
- `docs/design-system/component-index.md` — `@repo/ui` export별 컴포넌트 인덱스
- `docs/study/study-report-template.md` — 스터디 보고서 템플릿
- `packages/ui/AGENTS.md` — `@repo/ui` 패키지 로컬 작업 규칙
- `packages/ui/.codex/rules/storybook.md` — `@repo/ui` Storybook 작성 규칙

## Skills

`.codex/skills/` 하위 7종을 사용한다.

- `plan` — 요구사항 분석 + 구현 계획
- `orchestrate` — 계획 실행
- `validate` — 타입/린트/빌드/MFE/SSR 검증
- `deliver` — export/문서/커밋 준비
- `retrospect` — 회고/기술부채 정리
- `study` — REQ 구현 과정을 블로그형 학습 보고서로 작성
- `pipeline` — 위 5단계 순차 실행

작업 전 관련 rule을 먼저 읽고, 변경 후 가능한 검증 명령을 실행한다.
