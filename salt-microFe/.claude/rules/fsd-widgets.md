---
globs: apps/*/src/widgets/**
---

# widgets 레이어 (Layer 3)

## 허용 Import

- `@/shared/*` · `@/entities/*` · `@/features/*` — 허용
- `@/widgets/*` (다른 슬라이스) — **금지** (cross-slice)
- `@/pages/*` · `@/app/*` — **금지** (상위 레이어)

## 구조

```
widgets/{slice}/
├── ui/       복합 컴포넌트 (entities + features 조합)
├── model/    위젯 수준 상태 (필요할 때만)
├── lib/      조합 로직
└── index.ts
```

## 원칙

- 여러 `entities`와 `features`를 조합한 **복합 UI 블록**이다.
- **비즈니스 로직을 직접 담지 않는다** — 조합만 한다. 로직이 생기면 feature로 내린다.
- `pages`가 import하는 최종 조합 단위다. 페이지는 위젯을 배치만 한다.
- widget 간 공통 로직은 `features` 이하로 내린다.

## 우리 위젯 목록

| widget | 엮는 것 | 화면 |
|---|---|---|
| `home-briefing` | portfolio + plan + coach + tax + invoice | 홈 5블록 |
| `coach-console` | coach + indicator + portfolio | 코치 대화 + 추천 카드 + 성적표 |
| `asset-workspace` | portfolio + invoice + tax | 자산 탭 세그먼트 3 |
| `market-board` | market + news + indicator | 실시간 테이블 + 우측 프리뷰 |
| `onboarding-flow` | auth + ledger + plan | 초대→계좌→적립 3스텝 |
| `pc-panel-grid` | `MovableGrid` + 위 위젯들 | PC 이진분할 배치 |

## 부분 실패는 위젯이 격리한다

홈 5블록은 소스가 5개이고 지연·실패가 제각각이다. **블록 하나가 죽어도 나머지가 살아야 한다**(F006 FR-5).

```tsx
// widgets/home-briefing/ui/HomeBriefing.tsx  (서버 컴포넌트)
export function HomeBriefing() {
  return (
    <>
      <BlockBoundary name="total-asset"><TotalAssetBlock /></BlockBoundary>
      <BlockBoundary name="weekly-plan"><WeeklyPlanBlock /></BlockBoundary>
      <BlockBoundary name="coach"><CoachHighlightBlock /></BlockBoundary>
      <BlockBoundary name="tax"><TaxDeadlineBlock /></BlockBoundary>
      <BlockBoundary name="invoice"><InvoiceSummaryBlock /></BlockBoundary>
    </>
  );
}
```

`BlockBoundary`는 `Suspense` + error boundary 묶음이며 `shared/ui`에 둔다. 상세는 `streaming-ssr.md`.

- **블록 순서는 고정이다.** 설정으로 바꾸지 않는다(F006).
- **홈은 읽기 전용이다.** `home-briefing`에 mutation을 부르는 feature를 넣지 않는다.
- 스켈레톤은 실제 블록과 **같은 높이**를 가져야 한다. 안 그러면 스트리밍이 레이아웃 시프트를 만든다.

## `pc-panel-grid` — 탭 대신 격자

2026-09-09 제품 결정: **탭이 많은 정보 구조를 쓰지 않는다.** PC에서는 탭으로 나누던 것을 `MovableGrid`(이진 트리 분할)로 한 화면에 놓는다.

- 칸 안에 들어가는 것은 **다른 위젯**이다. `pc-panel-grid`가 위젯을 import하는 것은 같은 레이어 cross-slice이므로 **금지**다 → 칸 내용은 `pages`가 children으로 주입한다.
- 칸 이동은 포인터 전용이다(알려진 제약). **키보드 대체 수단으로 `movePanel`을 메뉴로 노출**해야 한다.
