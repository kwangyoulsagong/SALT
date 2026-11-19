---
globs: "{apps/*/src,packages/domain-*/src}/widgets/**"
---

# widgets 레이어 (Layer 3)

## 허용 Import

- `@repo/web-shared/*` · `@/entities/*` · `@/features/*` — 허용
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
| `home-briefing` | `entities/home` 카드 + 목표 목록(임시) | 셸 홈 — 도메인 요약 카드(2026-11-02 `FE-REQ-055`). 도메인 엔티티를 읽지 않는다 |
| `coach-console` | coach + market(종목 로고 · 이름) + indicator + portfolio | 코치 리포트 — ~~맨 위 "내 보유"~~(2026-11-10 `/portfolio` 로 — `FE-REQ-069`, 패널은 이 위젯 것) · 리스크 예산 한 줄(+ 펼침) · 판정 성적표 · 추천 · 매매 거울 한 패널(코인 · 국내) · 월간 돌아보기 펼침 — ~~목표 비중~~ 2026-11-17 뺐다(F017 v4 순서 6) (대화는 F006). 판정 근거 상세 `/coach/signals/[signalType]`(F004, 2026-10-30) |
| `position-overview` | portfolio + coach(매입가 숨김) | `/portfolio` 위쪽 — 포지션 Hero · 평가금 흐름(기간 4 · MDD) · 리스크 레이더(F006 G절, 2026-11-18). 3탭 IA 를 안 만들어 `asset-workspace` 대신 포트폴리오 페이지가 자리 |
| `weekly-plan` | plan + `complete-weekly-plan` + `edit-plan-settings` | `/plan` — 이번 주 금액 · 자산별 근거 · 밴드 표 · 과거 성적 · 빗나간 때 · 김프 · 이번 달 · 월 적립액(F003 v2 순서 3, 2026-11-19). 게이트가 닫히면 밴드 카드 0 · 금액 그대로 |
| `asset-workspace` | portfolio + market | 자산 탭 세그먼트 3 (포지션/시장/관심 종목) |
| `coach-panel` | market + coach | 투자 우측 미리보기 — 한 장 패널 응답의 원인 · 틀리는 선 · 시나리오 한 칸(2026-11-17 F017 v4 순서 6 — 판단 · 모드 · 구간 · 심리 · 스마트 머니는 뺐다) |
| `scenario-panel` | coach + market + `check-trade-odds` | 종목 상세 한 장 패널 — 시나리오 · 원인 근거 결과 · 회사 사정 · 틀리는 때 · 성적 · AI 해설 · 내 기준(F017 v4 `FE-REQ-064` FR-8~11, 2026-11-13) |
| `judgment-overview` | coach + market(관심 종목) | 투자 화면 머리 아래 요약 띠(위험 · 판정 성적 — 목표 비중 칸은 2026-11-17 뺐다) — 칸마다 한 줄 값 + 한 줄 고지, 누르면 `/coach/report#섹션`. 카드 본문을 투자 화면에 펼치지 않는다 (F010 `FE-REQ-040` · `FE-REQ-042`). 같은 두 칸 + 관심 종목 = 오른쪽 사이드 `InvestSide` — 미리보기 칸이 없는 투자 화면(2026-11-19 `FE-REQ-047` FR-7) |
| `market-board` | market + news + indicator | 자산군(코인 · 국내 주식 — ~~본문 탭~~ 2026-11-10 머리 메뉴 코인 · 주식이 주소 `?asset=` 로 고른다, `FE-REQ-069`) + 실시간 테이블 + 우측 프리뷰. 자산군은 데이터 소스만 바꾼다 — 같은 표 · 같은 인터랙션 · 같은 요약 띠(머리 띠 포함, 자산군 문자열을 넘긴다) (F011 `FE-REQ-041` · `FE-REQ-050`) |
| `asset-search` | market + `search-asset` + `toggle-watchlist` | 종목 검색 ~~`/search`~~ **모달 `AssetSearchDialog`**(2026-11-09 `FE-REQ-066` — 머리 칸 · `/` · `/search` 는 연 채로) — 코인 + 국내 한 검색 · 추적 카운터 · 상한 안내 · 최근 검색 (F000 FR-40 · 41, 2026-10-30) |
| `alert-list` | notification + `mark-alert-read` | 셸 `/alerts` — 알림 목록 · 누르면 읽음 + 갈 곳 · 모두 읽음 · 더 보기(F006 `FE-REQ-030` FR-110~113, 2026-11-18). 벨은 위젯이 아니라 공용 레이아웃(`AlertBell`) |
| `settings-panel` | coach + `edit-coach-profile` + `toggle-purchase-price` | 투자 코치 설정 `/coach/settings` — 코치 설정 · 보기 · 내 기준 링크 (F004 FR-12, 2026-11-02 셸에서 옮김) |
| `onboarding-flow` | auth + `choose-domains` + `accept-invite` | 초대 → 쓸 것 고르기 → 첫 기록 → 끝(~~초대→첫 보유 기록→적립 3스텝~~ 2026-11-06 S3a `FE-REQ-055` FR-4 — 다음 단계는 서버 값) |
| `pc-panel-grid` | `MovableGrid` + `arrange-panels` — 칸 내용은 페이지가 넣는다 | PC 이진분할 배치 — `/coach/chat` 1280 이상(대화 · 오늘의 추천 · 포지션 요약, F006 2026-11-19) |

## 부분 실패는 위젯이 격리한다

홈 3블록은 소스가 3개이고 지연·실패가 제각각이다. **블록 하나가 죽어도 나머지가 살아야 한다**(F006 FR-5).

```tsx
// widgets/home-briefing/ui/HomeBriefing.tsx  (서버 컴포넌트)
export function HomeBriefing() {
  return (
    <>
      <BlockBoundary name="total-asset"><TotalAssetBlock /></BlockBoundary>
      <BlockBoundary name="weekly-plan"><WeeklyPlanBlock /></BlockBoundary>
      <BlockBoundary name="coach"><CoachHighlightBlock /></BlockBoundary>
    </>
  );
}
```

`BlockBoundary`는 `Suspense` + error boundary 묶음이며 `shared/ui`에 둔다. 상세는 `streaming-ssr.md`.

- ~~**블록 순서는 고정이다.** 설정으로 바꾸지 않는다(F006).~~ **정정 2026-11-06** 셸 홈 카드 순서 · 숨김은 사용자 설정(`FEATURE-015` FR-2) — 값은 BFF `order` · `hidden`(서버 identity), 편집은 홈이 아니라 `/settings` 패널(`arrange-home`). 위젯은 받은 순서대로 그리기만
- **홈은 읽기 전용이다.** `home-briefing`에 mutation을 부르는 feature를 넣지 않는다.
- 스켈레톤은 실제 블록과 **같은 높이**를 가져야 한다. 안 그러면 스트리밍이 레이아웃 시프트를 만든다.

## `pc-panel-grid` — 탭 대신 격자

2026-09-09 제품 결정: **탭이 많은 정보 구조를 쓰지 않는다.** PC에서는 탭으로 나누던 것을 `MovableGrid`(이진 트리 분할)로 한 화면에 놓는다.

- 칸 안에 들어가는 것은 **다른 위젯**이다. `pc-panel-grid`가 위젯을 import하는 것은 같은 레이어 cross-slice이므로 **금지**다 → 칸 내용은 `pages`가 children으로 주입한다.
- 칸 이동은 포인터 전용이다(알려진 제약). **키보드 대체 수단으로 `movePanel`을 메뉴로 노출**해야 한다.
