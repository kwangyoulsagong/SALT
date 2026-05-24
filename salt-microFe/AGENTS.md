# SALT MicroFE Codex Harness

`salt-microFe/**` 프론트엔드 작업에 적용한다. `bff/**`, `salt-server/**`는 명시 요청이 없으면 수정하지 않는다.

## 프로젝트 개요

- Monorepo: `pnpm` workspace + Turborepo
- Apps: `apps/shell`(host, 3000), `apps/goals`(remote, 3001), `apps/investments`(remote, 3002)
- Framework: Next.js 14 Pages Router, React 18, TypeScript strict
- MFE: `@module-federation/nextjs-mf`
- Style: Vanilla Extract(`*.css.ts`) + `@repo/ui`
- Shared packages: `packages/ui`, `packages/message-event-bus`, `packages/mocks`, `packages/eslint-config`, `packages/typescript-config`

## Commands

```bash
pnpm dev
pnpm build
pnpm lint
pnpm --filter shell dev
pnpm --filter goals dev
pnpm --filter investments dev
pnpm --filter @repo/ui lint
pnpm --filter @repo/ui check-types
pnpm --filter @repo/ui storybook
```

## 구조 원칙

- 별도 레이어 아키텍처를 새로 도입하지 않는다. 현재 앱 구조와 도메인 폴더 규칙을 따른다.
- 앱 내부는 현재 구조를 따른다: `src/pages`, `src/components` 또는 `src/component`, `src/api`, `src/hooks`, `src/store`, `src/styles`, `src/constants`, `src/utils`, `src/types`.
- 도메인은 기능 도메인 폴더로 분리한다. 예: `src/domains/portfolio`, `src/domains/market`, `src/domains/goal`가 필요하면 그 안에 `components`, `api`, `hooks`, `store`, `types`, `constants`를 둔다.
- 단일 앱에서만 쓰는 코드는 앱 내부에 둔다. 2개 이상 앱에서 반복되거나 런타임 계약이면 `packages/*`로 승격한다.
- 앱끼리 `apps/other/src/...`를 직접 import하지 않는다. 통합은 Module Federation, URL, `@repo/message-event-bus`, 공유 패키지로만 한다.
- route 파일은 얇게 유지하고 조합만 담당한다. 실제 UI와 로직은 컴포넌트/도메인 폴더로 내린다.

## Rule Index

- `.codex/rules/domain-architecture.md` — 도메인 분리
- `.codex/rules/component-convention.md` — 컴포넌트 패턴
- `.codex/rules/api-convention.md` — API + React Query
- `.codex/rules/state-convention.md` — Zustand/Redux 상태
- `.codex/rules/import-convention.md` — import/alias
- `.codex/rules/className-convention.md` — className 작성
- `.codex/rules/constants-convention.md` — 상수 추출
- `.codex/rules/microfrontend.md` — Module Federation
- `.codex/rules/event-bus.md` — MFE 이벤트 버스
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
