# SALT MicroFE Claude Harness

`salt-microFe/**` 프론트엔드 작업에 적용한다. `bff/**`, `salt-server/**`는 명시 요청이 없으면 수정하지 않는다.

## 프로젝트 개요

- Monorepo: `pnpm` workspace + Turborepo
- Apps: `apps/web`(default zone, 3000), `apps/web-tax`(zone, 3001), `apps/mobile`(React Native, iOS+Android)
- Framework: Next.js App Router, React 18, TypeScript strict / React Native
- 아키텍처: **FSD**(6레이어) · **Next.js Multi-Zones**(마이크로프론트엔드) · **스트리밍 SSR**(RSC + Suspense)
- Style: Vanilla Extract(`*.css.ts`) + `@repo/ui`(웹) / `StyleSheet` + `@repo/ui-native`(모바일)
- Shared packages: `packages/tokens`(플랫폼 중립), `packages/ui`, `packages/ui-native`, `packages/core`, `packages/mocks`, `packages/eslint-config`, `packages/typescript-config`

> **전환 중.** 현재 코드는 `apps/{shell,goals,investments}` + Pages Router + `@module-federation/nextjs-mf`다. 전환 근거와 순서는 `requirements/decisions/ADR-001-microfrontend-replacement.md`와 `FE-REQ-007`~`FE-REQ-009`에 있다. 새 코드는 목표 구조로 쓰고, 기존 코드는 그 REQ 순서로 옮긴다.

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

- **FSD 6레이어를 따른다**: `shared`(0) → `entities`(1) → `features`(2) → `widgets`(3) → `pages`(4) → `app`(5). 의존은 아래로만 흐른다.
- **같은 레이어의 다른 슬라이스를 직접 import하지 않는다.** 공통이 필요하면 아래 레이어로 내린다.
- 슬라이스 이름은 `.claude/rules/layered-architecture.md` §4 **레지스트리**를 따르고, 새 슬라이스는 표에 먼저 추가한다. 이름은 서버 DDD 컨텍스트와 동일하다.
- **Next 라우팅은 프로젝트 루트**(`apps/*/app/**`)에 두고 `@/pages/*`를 re-export만 한다. FSD는 `src/` 안에만 있다.
- 단일 앱에서만 쓰는 코드는 앱 내부에 둔다. 2개 이상에서 반복되거나 런타임 계약이면 `packages/*`로 승격한다.
- **zone끼리 `apps/other/src/...`를 직접 import하지 않는다.** 공유는 workspace 패키지로만 한다.
- **`apps/mobile`은 `packages/ui`를 import하지 않는다** — vanilla-extract는 RN에서 동작하지 않는다.
- 레이어·슬라이스 위반은 `.claude/hooks/layer-check.mjs`가 쓰기 시점에 차단한다. **훅이 막으면 우회하지 말고 구조를 고친다.**

## Rule Index

### 아키텍처
- `.claude/rules/layered-architecture.md` — 네 서피스 · 의존 방향 · **슬라이스 레지스트리**
- `.claude/rules/fsd-shared.md` · `fsd-entities.md` · `fsd-features.md` · `fsd-widgets.md` · `fsd-pages.md` · `fsd-app.md` — FSD 레이어별 규칙
- `.claude/rules/microfrontend.md` — **Next.js Multi-Zones** (zone 경계 기준)
- `.claude/rules/streaming-ssr.md` — App Router RSC 경계 · Suspense 스트리밍
- `.claude/rules/rn-architecture.md` — React Native 앱 구조
- `.claude/rules/rn-microfrontend.md` — 모바일 번들 분리 (단계적 도입)

### 성능
- `.claude/rules/performance-frontend.md` — 웹 예산 · 실시간 테이블 · 번들
- `.claude/rules/performance-rn.md` — 앱 시작 · 프레임 · 대화 스트리밍 · 메모리

### 관례
- `.claude/rules/domain-architecture.md` — (구) 도메인 분리 — `layered-architecture.md`로 대체됨
- `.claude/rules/component-convention.md` — 컴포넌트 패턴
- `.claude/rules/api-convention.md` — API + React Query
- `.claude/rules/state-convention.md` — Zustand/Redux 상태
- `.claude/rules/import-convention.md` — import/alias
- `.claude/rules/className-convention.md` — className 작성
- `.claude/rules/constants-convention.md` — 상수 추출
- `.claude/rules/microfrontend.md` — Module Federation
- `.claude/rules/event-bus.md` — MFE 이벤트 버스
- `.claude/rules/ssr.md` — SSR/하이드레이션
- `.claude/rules/performance.md` — 렌더링/번들/네트워크 성능
- `.claude/rules/canvas.md` — 고부하 시 Canvas 도입 기준
- `.claude/rules/design-system.md` — `@repo/ui` 디자인 시스템
- `.claude/rules/a11y-policy.md` — 접근성
- `.claude/rules/i18n-policy.md` — 문구/i18n 정책
- `.claude/rules/requirements-management.md` — 요구사항/리포트 관리
- `.claude/rules/study-report.md` — 요구사항 기반 학습 보고서 작성

## 문서 인덱스

- `docs/design-system/style-tokens.md` — `packages/ui/src/styles/tokens.css.ts` 토큰 인덱스
- `docs/design-system/component-index.md` — `@repo/ui` export별 컴포넌트 인덱스
- `docs/study/study-report-template.md` — 스터디 보고서 템플릿
- `packages/ui/CLAUDE.md` — `@repo/ui` 패키지 로컬 작업 규칙
- `packages/ui/.claude/rules/storybook.md` — `@repo/ui` Storybook 작성 규칙

## Skills

`.claude/skills/` 하위 7종을 사용한다.

- `plan` — 요구사항 분석 + 구현 계획
- `orchestrate` — 계획 실행
- `validate` — 타입/린트/빌드/MFE/SSR 검증
- `deliver` — export/문서/커밋 준비
- `retrospect` — 회고/기술부채 정리
- `study` — REQ 구현 과정을 블로그형 학습 보고서로 작성
- `pipeline` — 위 5단계 순차 실행

작업 전 관련 rule을 먼저 읽고, 변경 후 가능한 검증 명령을 실행한다.
