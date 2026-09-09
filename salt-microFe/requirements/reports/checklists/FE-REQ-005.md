---
id: FE-REQ-005
spec: ../../specs/done/FE-REQ-005.md
title: "@repo/ui 토큰·컴포넌트 확장 체크리스트"
validated: 2026-09-09
---

# FE-REQ-005 체크리스트

## A. 토큰

| # | 요구사항 | 구현 위치 | 상태 |
|---|---|---|---|
| FR-1 | `colors.neutral.50~900`을 균등 명도로 교체(D-2) | `packages/ui/src/styles/tokens.css.ts` | ✅ |
| FR-2 | `text.tertiary` `#8B95A1` / `disabled` `#B0B8C1` / `lightGray` `#6B7684` | 같은 파일 `colors.text` | ✅ |
| FR-3 | `border.light` `#E5E8EB` / `default` `#D1D6DB` / `dark` `#B0B8C1` | 같은 파일 `colors.border` | ✅ |
| FR-4 | `typography.t1~t8` 신설 (size + lineHeight 한 쌍) | 같은 파일 `typography` | ✅ |
| FR-5 | `letterSpacings.tightest: -0.03em` | 같은 파일 `letterSpacings` | ✅ |
| FR-6 | `elevation.none/sm/md/lg/sheet` 신설, `colors.shadow.*`는 유지 + deprecated | 같은 파일 `elevation`, `colors.shadow` JSDoc | ✅ |
| FR-7 | `numeric.tabular` 신설 | 같은 파일 `numeric` | ✅ |
| FR-8 | `space.lg2: 20px` | 같은 파일 `space` | ✅ |
| FR-9 | `colors.ai.primary/light/lighter` 신설 | 같은 파일 `colors.ai` (`#20C997`/`#63E6BE`/`#E6FCF5`, primary는 잠정) | ✅ |
| FR-10 | deprecated 텍스트 토큰 4개에 `@deprecated` 주석 | 같은 파일 `colors.text.base/nickname/email/H2` | ✅ |
| FR-11 | exports에 `"./tokens"` 추가 | `packages/ui/package.json` | ✅ |
| FR-12 | `style-tokens.md` 갱신 + "subpath 없음" 경고 제거 | `docs/design-system/style-tokens.md` | ✅ |
| 추가 | `radius.button.sm/md/lg/xl` = `8/10/14/16` (D-7) | `tokens.css.ts` `radius.button` | ✅ |
| 추가 | 배지 틴트 쌍 신설 — Open Question ①안 | `special.up/downLight`·`up/downDark`, `status.*Dark` | ✅ |

## B. 1차 컴포넌트

| # | 컴포넌트 | 구현 위치 | 공개 경로 | Story | 상태 |
|---|---|---|---|---|---|
| FR-20 | `NumberText` | `src/NumberText/` | `@repo/ui/numberText` | ✅ | ✅ |
| FR-21 | `ListRow` | `src/ListRow/` | `@repo/ui/listRow` | ✅ | ✅ |
| FR-22 | `ListGroup` | `src/ListGroup/` | `@repo/ui/listGroup` | ✅ | ✅ |
| FR-23 | `SectionBand` | `src/SectionBand/` | `@repo/ui/sectionBand` | ✅ | ✅ |
| FR-24 | `Badge` | `src/Badge/` | `@repo/ui/badge` | ✅ | ✅ |
| FR-25 | `Chip` | `src/Chip/` | `@repo/ui/chip` | ✅ | ✅ |
| FR-26 | `ProgressBar` | `src/ProgressBar/` | `@repo/ui/progressBar` | ✅ | ✅ |
| FR-27 | `Banner` | `src/Banner/` | `@repo/ui/banner` | ✅ | ✅ |
| FR-28 | `KeyValueList` | `src/KeyValueList/` | `@repo/ui/keyValueList` | ✅ | ✅ |
| FR-29 | `SegmentedControl` | — | — | — | ❌ **제외** |
| FR-30 | `AppBar` | `src/AppBar/` | `@repo/ui/appBar` | ✅ | ✅ |
| FR-31 | `AssetIcon` | `src/AssetIcon/` | `@repo/ui/assetIcon` | ✅ | ✅ |

**FR-29 미충족 사유** — `variant="pill"`은 `FilterTabs`(회색 트랙 + 흰 활성 알약)와, `variant="underline"`은 `Tabs`와 시각·역할이 그대로 겹친다. 사용자가 "이미 있는 것은 안 만들어도 된다"고 지시해 신규 컴포넌트 대신 `component-index.md`에 "겹치는 컴포넌트 고르기" 표를 추가했다. **대가로 `FilterTabs`에 `role="tablist"`/`aria-selected`가 없는 상태가 남았다** (아래 미충족 항목).

## C. 2차 컴포넌트

| # | 컴포넌트 | 구현 위치 | 공개 경로 | Story | 상태 |
|---|---|---|---|---|---|
| FR-40 | `BottomTabBar` (5개 제한 타입 강제) | `src/BottomTabBar/` | `@repo/ui/bottomTabBar` | ✅ | ✅ |
| FR-41 | `BottomSheet` (focus trap · ESC · 스크롤 락) | `src/BottomSheet/` | `@repo/ui/bottomSheet` | ✅ | ✅ |
| FR-42 | `EmptyState` | `src/EmptyState/` | `@repo/ui/emptyState` | ✅ | ✅ |
| FR-43 | `Skeleton` (reduced-motion) | `src/Skeleton/` | `@repo/ui/skeleton` | ✅ | ✅ |
| FR-44 | `Toggle` (`role="switch"`) | `src/Toggle/` | `@repo/ui/toggle` | ✅ | ✅ |
| FR-45 | `Divider` | `src/Divider/` | `@repo/ui/divider` | ✅ | ✅ |
| FR-46 | `Sparkline` | `src/Sparkline/` | `@repo/ui/sparkline` | ✅ | ✅ |
| FR-47 | `Slider` (키보드 + 직접 입력) | `src/Slider/` | `@repo/ui/slider` | ✅ | ✅ |

## C-2. 레퍼런스 인벤토리 누락분

| # | 컴포넌트 | 구현 위치 | 공개 경로 | 상태 |
|---|---|---|---|---|
| FR-60 | `BottomCTA` (single/double/fixed + safe-area) | `src/BottomCTA/` | `@repo/ui/bottomCTA` | ✅ |
| FR-61 | `Top` → `AppBar`로 충족 | `src/AppBar/` | `@repo/ui/appBar` | ✅ |
| FR-62 | `Result` → `EmptyState` `tone('empty'\|'success'\|'error')`로 충족 | `src/EmptyState/` | `@repo/ui/emptyState` | ✅ |
| FR-63 | `Toast` + `useToast` | `src/Toast/` | `@repo/ui/toast`, `/toastProvider`, `/useToast` | ✅ |
| FR-64 | `SearchField` (`role="search"`) | `src/SearchField/` | `@repo/ui/searchField` | ✅ |
| FR-65 | `IconButton` (`label` 필수) | `src/IconButton/` | `@repo/ui/iconButton` | ✅ |
| FR-66 | `Checkbox` (indeterminate 포함) | `src/Checkbox/` | `@repo/ui/checkbox` | ✅ |
| FR-67 | `TextField` `box`/`line` | `src/TextField/` | `@repo/ui/textField` | ✅ |

## D. 3차 (선택)

| # | 항목 | 상태 |
|---|---|---|
| FR-50 | `RadarChart` | ⏸ 미착수. 사용처 1곳이라 앱 로컬이 규칙에 맞다는 판단 유지 |
| FR-51 | `StatTile` | ⏸ 미착수. `ListGroup` + `NumberText` 조합으로 대체 가능 |

## D-8. `Card` 변경

| 항목 | 구현 위치 | 상태 |
|---|---|---|
| `elevation` variant 추가, 기본값 `none` | `src/Card/Card.tsx`, `styles/Card.css.ts` | ✅ |
| `bordered` variant 추가(그림자 없이 경계선) | 같은 파일 | ✅ |
| 기존 그림자는 `elevation="sm"`으로 재현 | `vars.elevation.sm` | ✅ |

## 검증 결과

| Check | Status | Details |
|---|---|---|
| Lint | pass | 루트 `pnpm lint` 전체 통과, `@repo/ui` `--max-warnings 0` |
| Type | pass | `@repo/ui check-types` |
| Build | pass | 루트 `pnpm build` 3/3 (shell·goals·investments 개별 빌드도 통과) |
| Storybook | pass | `build-storybook` |
| MFE Boundary | pass | `packages/ui`에서 `apps/*` import 0건, `apps` 간 직접 import 0건 |
| SSR Safety | pass | 신규 컴포넌트에 render-time browser API 없음. `BottomSheet`의 `createPortal(document.body)`는 마운트 가드 뒤 |
| Remote Loading | 변경 없음 | `apps/**` 커밋 파일 0개 |
| Shared Dependencies | 변경 없음 | `next.config.js`, `transpilePackages` 미변경 |
| Event Bus Registry | 변경 없음 | `packages/message-event-bus` 커밋 파일 0개 |
| 토큰 호환성 | pass | 기존 키 삭제 0건. `apps/**`의 `vars.*` 참조 17종이 `next build` 타입 체크를 통과 |

## 미충족 항목

| 항목 | 사유 |
|---|---|
| FR-29 `SegmentedControl` | 위 사유 참조. 대체 경로를 문서화했으나 **`FilterTabs`에 `role="tablist"`/`aria-selected`가 없는 상태는 그대로 남았다** |
| 320px 폭 브라우저 확인 | 각 컴포넌트에 `Narrow` story는 넣었으나 실제 브라우저 확인 미실시 |
| 앱 시각 회귀(검증 계획 2) | 중립 스케일 교체 후 375/390/1440 스크린샷 비교 미실시 |
| 번들 예산 gzip 12KB | FE-REQ-005 범위만으로는 9.08KB로 충족. FE-REQ-006까지 합치면 18.18KB로 초과 → 기준 재정의 필요 |
| `colors.ai.primary` 확정 | `#20C997` 잠정값 유지 |
