---
globs: "{apps/*/src,packages/domain-*/src}/pages/**"
---

# pages 레이어 (Layer 4 — 라우트 셸)

> **주의.** 여기는 `src/pages`(FSD 레이어)다. Next 라우팅은 **프로젝트 루트 `app/`** 에 있다.

## 허용 Import

- `@repo/web-shared/*` · `@/entities/*` · `@/features/*` · `@/widgets/*` — 허용
- `@/pages/*` (다른 슬라이스) — **금지** (cross-slice)
- `@/app/*` — **금지** (상위 레이어)

## 구조

```
pages/{page-name}/
├── ui/       페이지 컴포넌트 (widgets 배치)
├── model/    페이지 수준 상태 (최소화)
├── lib/      페이지 내부 헬퍼
└── index.ts  { XxxPage, metadata } 를 named export
```

## 페이지 목록

### `apps/web` (default zone)

**목표:** `home`(`/`) · `coach`(`/coach`) · `assets`(`/assets`) · `goals` · `onboarding` · `login`

**2026-11-02 현재(셸):** `login`(`/`) · `home`(`/home`) · ~~`add-goal`(`/goals/addgoals`)~~(**2026-11-03 저축 zone 으로** — `FE-REQ-056`) · `onboarding` · `settings`(`/settings` — 도메인별 설정 링크 목록, 2026-11-02) · `streaming-probe`(측정 전용, 기본 404).
404 는 zone 이 같이 쓴다 — `@repo/web-shared/layout` `NotFoundPage`(`FE-REQ-044` → `FE-REQ-053`).
투자 페이지(`investments` · `investment-detail` · `coach`(`/coach/report` · `/coach/signals/[signalType]` · `/coach/settings`) · `search`)는 `packages/domain-invest/src/pages` 로 옮겼다(2026-11-02 `FE-REQ-053`).
`investments`는 F006에서 `assets`로 바뀐다(`FE-REQ-030`). 코치 탭 `/coach`(대화)는 그때 생긴다.

### 도메인 zone 4개(`apps/web-investment` · `web-savings` · `web-household` · `web-tips`)

zone 앱은 `src/pages` 를 갖지 않는다 — 루트 `app/` 이 `@repo/domain-<x>/pages/<slice>` 를 re-export 한다(`microfrontend.md` §2-4). 투자 zone 이 첫 실례다(2026-11-02 `FE-REQ-053`), 저축이 둘째(2026-11-03 `FE-REQ-056` — `goals` · `add-goal` · `goal-detail`), 가계부가 셋째(2026-11-04 `FE-REQ-057` — `household` · `new-expense` · `budget`, S1b `recurring` `/household/templates`, S1d `challenges` `/household/challenges`, S1g `story` `/household/story/[period]`). 팁은 빈 골격. **페이지 최상위는 `<div>`** — zone 레이아웃 `AppShell` 이 이미 `<main>` 이다(저축 실측에서 main 3개). `apps/web-tax` 는 지웠다(`FE-REQ-052` FR-6).

### `apps/mobile`

`home` · `coach` · `assets` · `tax` · `onboarding` · `login` (3탭 + push 화면)

## 원칙

- 라우트 진입 셸이다. **위젯 배치 + 라우트 파라미터 해석까지만** 한다.
- **비즈니스 로직·데이터 조회 로직을 담지 않는다.** 서버 컴포넌트에서 데이터를 부르는 것은 허용되지만, 그 호출은 `entities/*/api` 또는 `shared/api`를 경유한다.
- 페이지 간 공통 로직은 `widgets` 이하로 내린다.
- 루트 라우팅 파일이 이것을 re-export한다:

```tsx
// apps/web/app/coach/page.tsx
export { CoachPage as default, metadata } from '@/pages/coach';
```

## 3탭 IA — 페이지가 탭이다

> **정정 2026-11-03** — 앱 하단 탭은 **4개**(홈 · 저축 · 가계부 · 투자, `FEATURE-015` FR-8 · `FE-REQ-054`). 한 벌은 `@repo/core/navigation` `APP_TABS`.
> 아래 3탭(홈 · 코치 · 자산)은 F006 당시 투자 IA 다 — 투자 zone 안 탭으로 다시 쓰는 범위(`FEATURE-015` 범위 밖)라 기록으로 둔다.

2026-09-09 결정: 하단 탭 **3개**(`홈` / `코치` / `자산`). 그 외 화면은 탭 내부 이동이다.

| 탭 | 페이지 | 내부 구성 |
|---|---|---|
| 홈 | `home` | `home-briefing` 3블록 + 기존 목표 · 분석 · 팁 (읽기 전용) |
| 코치 | `coach` | `coach-console` — 대화가 제품의 핵심 |
| 자산 | `assets` | `asset-workspace` — 세그먼트 3(포지션/시장/관심 종목). 종목 → `investment-detail` push |

- ~~**탭을 4개로 늘리지 않는다.**~~ **정정 2026-11-03: 앱 탭은 도메인 4개다 — 5개로 늘리지 않는다(`@repo/ui` `BottomTabItems` 타입 상한 5).** 새 기능은 기존 탭 내부로 들어간다.
- 세금 기능은 빠졌다(`ADR-002`). `/tax` zone 은 지웠다(2026-11-02 `FE-REQ-052`) — zone 은 이제 도메인이다(`ADR-005`). zone 을 넘는 링크는 **`CrossZoneLink`(`<a>`)** 다(`microfrontend.md`).
- PC에서는 탭 대신 `pc-panel-grid`로 여러 패널을 동시에 본다. **같은 페이지 슬라이스가 두 배치를 모두 제공**한다.

## 클라이언트 전용 컴포넌트 배치

`@repo/ui/tradingChart`(캔버스)·`MovableGrid`는 SSR이 되지 않는다. 페이지에서 `next/dynamic` + `ssr: false`로 마운트한다.

```tsx
const PanelGrid = dynamic(() => import('@/widgets/pc-panel-grid'), { ssr: false });
```
