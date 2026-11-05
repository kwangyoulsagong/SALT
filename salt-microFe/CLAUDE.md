# SALT MicroFE Claude Harness

`salt-microFe/**` 프론트엔드 작업에 적용한다. `bff/**`, `salt-server/**`는 명시 요청이 없으면 수정하지 않는다.

## 프로젝트 개요

- Monorepo: `pnpm` workspace + Turborepo
- Apps: `apps/web`(셸 zone, 3000) · `apps/web-investment`(3002) · `apps/web-savings`(3003) · `apps/web-household`(3004) · `apps/web-tips`(3005) — 투자 zone 은 투자 화면을 서비스(2026-11-02 `FE-REQ-053`), 저축 zone 은 저축 화면을 서비스(2026-11-03 `FE-REQ-056`), ~~가계부 · 팁은 빈 골격~~ **정정 2026-11-05** 가계부 zone 은 가계부 화면(2026-11-04 `FE-REQ-057`), 팁 zone 은 공개 금융 팁(2026-11-05 `FE-REQ-058` — `PublicShell` · 공개 플래그 꺼짐), `apps/mobile`(React Native, iOS+Android — 미착수)
- **zone = 도메인(2026-10-30 `ADR-005`)**: 셸 `web` + `web-investment` · `web-savings` · `web-household` · `web-tips`, `web-tax` 삭제됨. 규칙 · 레지스트리(`registry.json`) · lint 도메인 축은 `FE-REQ-052`(2026-11-02)로 코드가 됐다. **투자 화면은 `packages/domain-invest` → `apps/web-investment`(2026-11-02 `FE-REQ-053`), 저축 화면은 `packages/domain-savings` → `apps/web-savings`(2026-11-03 `FE-REQ-056`)** — 레지스트리 `hostedIn` 이 옮기기 전 상태를 적고, 남은 차이는 `microfrontend.md` §0
- Framework: Next.js 15, React 18, TypeScript strict / React Native
- 아키텍처: **FSD**(6레이어) · **Next.js Multi-Zones**(마이크로프론트엔드) · **스트리밍 SSR**(RSC + Suspense)
- Style: Vanilla Extract(`*.css.ts`) + `@repo/ui`(웹) / `StyleSheet` + `@repo/ui-native`(모바일)
- Shared packages: `packages/tokens`(플랫폼 중립 토큰), `packages/core`(플랫폼 무관 모델·상수·zone 레지스트리), `packages/ui`(웹 전용), `packages/web-shared`(웹 shared 레이어 + zone 공용 레이아웃 `layout` — 앱 내비게이션 연결 · prerender · 문서 간 전환, 2026-11-02 · 11-03), `packages/config-next`(zone 공용 Next 설정 프리셋, 2026-11-03 `FE-REQ-054`), `packages/domain-invest`(투자 화면, 2026-11-02), `packages/domain-savings`(저축 화면, 2026-11-03), `packages/domain-household`(가계부 화면, 2026-11-04), `packages/domain-tips`(공개 금융 팁, 2026-11-05), `packages/eslint-config`, `packages/eslint-plugin-zone`, `packages/eslint-plugin-fsd`, `packages/typescript-config`

> **아키텍처 전환 3개가 끝났다.** `FE-REQ-007`(Multi-Zones) · `FE-REQ-008`(App Router +
> 스트리밍 SSR) · `FE-REQ-009`(FSD 6레이어). 다음은 기능 REQ(F000~)다.
> **2026-11-03 `FE-REQ-054`: 앱 내비게이션 — `@repo/ui/app-navigation` `AppNavigation`(왼쪽 레일 1024+ · 하단 탭 768~1023 · 머리 52) + 탭 한 벌 `@repo/core/navigation` `APP_TABS`. 화면이 머리 · 프로필을 놓지 않는다(공용 `AppShell`).**
> **2026-11-02 `FE-REQ-053`: 투자 슬라이스(`market` · `portfolio` · `coach` 와 그 위 features · widgets · pages)는 `packages/domain-invest/src` 에 있다. 셸에 `entities/home` 이 생겼고 `sign-out` 은 `@repo/web-shared/layout` `ProfileMenu` 로 대체됐다. `settings-panel` 은 `/coach/settings`.**
> 현재 실재하는 슬라이스는 `auth`·`goal`·`home`·`market`·`portfolio`·`coach`(entities),
> `sign-in`·`add-goal`·`accept-invite`·`toggle-watchlist`·`switch-coach-mode`·`explain-symbol`·`regenerate-coach`·`record-transaction`·`set-risk-budget`·`confirm-outcome-tags`·`toggle-purchase-price`·`run-preflight`·`search-asset`·`edit-coach-profile`(features, `toggle-purchase-price` 까지 뒤 넷은 F009 2026-09-24 · 09-27 · 10-29, 그다음 둘은 F004 2026-10-29 · F000 2026-10-30, 마지막은 F004 2026-10-30),
> `home-briefing`·`market-board`·`onboarding-flow`·`coach-panel`·`symbol-analysis`·`coach-console`·`judgment-overview`·`asset-search`·`settings-panel`(widgets, `asset-search` 는 F000 2026-10-30, `settings-panel` 은 F004 2026-10-30),
> `investment-detail`(pages, `/investments/[symbol]`)·`coach`(pages, `/coach/report` · `/coach/signals/[signalType]` 2026-10-30)·`search`(pages, `/search` 2026-10-30)·`settings`(pages, `/settings` 2026-10-30)다 (2026-09-23).
> 스트리밍 게이트 측정값은 `requirements/reports/checklists/FE-REQ-008.md` §3에 있다 —
> **홈·세금 콕핏·청구서의 화면 단위 판정은 그 화면이 생길 때 다시 한다.**
> 근거는 `requirements/decisions/ADR-001-microfrontend-replacement.md`.
> `apps/mobile`·`packages/ui-native`는 `RN-REQ-001`에서 생긴다.

## Commands

```bash
pnpm dev                        # zone 5개 동시 기동 (web:3000 · 투자 3002 — 투자 화면은 3002 가 서비스, 셸이 프록시. 3003~3005 는 빈 골격). 상시 기동은 루트 ops/salt.sh up
pnpm build
pnpm lint
pnpm check-types
pnpm test                       # 단위 테스트 — @repo/core · @repo/ui (vitest, node)
pnpm --filter web dev
pnpm --filter web-investment dev  # 도메인 zone 하나만 (savings · household · tips 도 같은 꼴)
pnpm --filter @repo/ui lint
pnpm --filter @repo/ui check-types
pnpm --filter @repo/ui test
pnpm --filter @repo/core test
pnpm --filter @repo/ui storybook
pnpm static:merge               # 운영 빌드 뒤 zone 정적 파일을 셸 .next/static 에 합친다(같은 이름 · 다른 내용이면 실패, FE-REQ-054 · ADR-005 규칙 7) — 운영 빌드로 zone 을 띄우기 전에 필수
pnpm test:layer-check           # layer-check 훅 위반 케이스 16(레이어 8 + 도메인 4 + 패키지 안 4) + 통과 케이스 10
```

## 구조 원칙

- **FSD 6레이어를 따른다**: `shared`(0) → `entities`(1) → `features`(2) → `widgets`(3) → `pages`(4) → `app`(5). 의존은 아래로만 흐른다.
- **같은 레이어의 다른 슬라이스를 직접 import하지 않는다.** 공통이 필요하면 아래 레이어로 내린다.
- 슬라이스 이름은 `.claude/rules/layered-architecture.md` §4 **레지스트리**를 따르고, 새 슬라이스는 표에 먼저 추가한다. 이름은 서버 DDD 컨텍스트와 동일하다.
- **Next 라우팅은 프로젝트 루트**(`apps/*/app/**`)에 두고 `@/pages/*`를 re-export만 한다. FSD는 `src/` 안에만 있다.
  루트 `pages/`는 **빈 폴더로 둔다** — Next가 `src/pages`(FSD 레이어)를 Pages Router로 집지 않게 하는 장치다.
- **기본은 서버 컴포넌트다.** `"use client"`는 상호작용·브라우저 API가 필요한 **잎**에만 붙인다.
  클라이언트 컴포넌트도 SSR을 위해 **서버로 한 번 컴파일**된다 — 브라우저 전용 모듈은 `ssr.md`를 먼저 읽는다.
- **블록 경계는 `BlockBoundary`**(Suspense + error boundary)다. 화면당 5개 이하, 스켈레톤 높이는 실제 블록과 같게.
- 단일 앱에서만 쓰는 코드는 앱 내부에 둔다. 2개 이상에서 반복되거나 런타임 계약이면 `packages/*`로 승격한다.
- **zone끼리 `apps/other/src/...`를 직접 import하지 않는다.** 공유는 workspace 패키지로만 한다.
- **`apps/mobile`은 `packages/ui`를 import하지 않는다** — vanilla-extract는 RN에서 동작하지 않는다. 토큰은 `packages/tokens`로 공유한다.
- **zone을 넘는 링크는 `<a>`(=`CrossZoneLink`)다.** `next/link`의 `<Link>`를 쓰면 `@repo/zone/no-cross-zone-link`가 lint에서 막는다. zone 경로의 단일 소스는 `@repo/core/zones`.
- **HTTP 는 `shared/api` 의 `apiFetch` 로만 한다.** `axios` import 는 `no-restricted-imports` 가 막는다(번들 회귀 3회, `FE-REQ-035`).
- 레이어·슬라이스 위반은 `.claude/hooks/layer-check.mjs`가 쓰기 시점에 차단하고 `@repo/fsd/layers`가
  에디터·CI에서 같은 것을 본다. 규칙 표는 `packages/eslint-plugin-fsd/layer-rules.cjs` **한 곳**이다.
  **훅이 막으면 우회하지 말고 구조를 고친다.**
- **사용자 노출 문구는 컴포넌트 밖에 둔다.** 도메인 무관한 것은 `shared/i18n`, 슬라이스 문구는
  그 슬라이스의 `model/messages.ts`. 컴포넌트에 한글 리터럴을 남기지 않는다.
- **barrel에 `next/dynamic`으로 부르는 잎을 올리지 않는다.** 올리면 소비자가 정적으로 끌어와
  코드 분할이 무효가 된다(실측 근거는 `checklists/FE-REQ-009.md` §5).

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
- `.claude/rules/ssr.md` — SSR/하이드레이션
- `.claude/rules/performance.md` — 렌더링/번들/네트워크 성능
- `.claude/rules/canvas.md` — 고부하 시 Canvas 도입 기준
- `.claude/rules/design-system.md` — `@repo/ui` 디자인 시스템
- `.claude/rules/screen-desktop.md` — 데스크톱 화면 틀 · 글자 위계 · 컨트롤 값(실측 근거)
- `.claude/rules/screen-mobile.md` — 모바일(RN · 앱 웹뷰) 글자 토큰 · 배치 · 컴포넌트 · 라이팅
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
