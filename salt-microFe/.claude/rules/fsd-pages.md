---
globs: apps/*/src/pages/**
---

# pages 레이어 (Layer 4 — 라우트 셸)

> **주의.** 여기는 `src/pages`(FSD 레이어)다. Next 라우팅은 **프로젝트 루트 `app/`** 에 있다.

## 허용 Import

- `@/shared/*` · `@/entities/*` · `@/features/*` · `@/widgets/*` — 허용
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

**2026-09-11 현재:** `login`(`/`) · `home`(`/home`) · `investments`(`/investments`) ·
`add-goal`(`/goals/addgoals`) · `streaming-probe`(측정 전용, 기본 404).
`investments`는 F006에서 `assets`로 바뀐다(`FE-REQ-030`). `coach`는 그때 생긴다.

### `apps/web-tax` (세금 zone)

`tax`(`/tax`)

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

2026-09-09 결정: 하단 탭 **3개**(`홈` / `코치` / `자산`). 그 외 화면은 탭 내부 이동이다.

| 탭 | 페이지 | 내부 구성 |
|---|---|---|
| 홈 | `home` | `home-briefing` 5블록 (읽기 전용) |
| 코치 | `coach` | `coach-console` — 대화가 제품의 핵심 |
| 자산 | `assets` | `asset-workspace` — 세그먼트 3(포지션/청구서/세금 요약) |

- **탭을 4개로 늘리지 않는다.** 새 기능은 기존 탭 내부로 들어간다.
- **세금은 별도 zone**이다(`/tax`). 자산 탭의 세금 세그먼트는 요약만 보여주고 상세는 zone으로 넘긴다. 그 링크는 **`<a>`** 여야 한다(`microfrontend.md`).
- PC에서는 탭 대신 `pc-panel-grid`로 여러 패널을 동시에 본다. **같은 페이지 슬라이스가 두 배치를 모두 제공**한다.

## 클라이언트 전용 컴포넌트 배치

`lightweight-charts`·`TradingViewChart`·`MovableGrid`는 SSR이 되지 않는다. 페이지에서 `next/dynamic` + `ssr: false`로 마운트한다.

```tsx
const PanelGrid = dynamic(() => import('@/widgets/pc-panel-grid'), { ssr: false });
```
