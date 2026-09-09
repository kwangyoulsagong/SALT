---
id: FE-REQ-005
title: "@repo/ui 토큰·컴포넌트 확장 — 증권 앱 수준 화면을 만들 수 있는 최소 셋"
priority: high
labels: [design-system, tokens, component, a11y, ui]
created: 2026-09-08
updated: 2026-09-08
---

## Summary

`pm/storyboard/SALT-Storyboard.html`에서 확정한 화면 27개(PC·모바일 각각)를 실제로 구현하려면 `@repo/ui`에 **토큰 3종과 컴포넌트 20종**이 없다. 이 요구사항은 그 갭을 메운다.

핵심은 색을 바꾸는 것이 아니다. **현재 브랜드/폰트/상승·하락 색은 그대로 유지**한다(사용자 결정). 바꾸는 것은 ① **중립 스케일 값 정합** ② **타입 스케일에 line-height 부여** ③ **elevation·numeric 토큰 신설**이고, 더하는 것은 화면 문법을 구성하는 **레이아웃 프리미티브 컴포넌트**다.

범위는 `salt-microFe/packages/ui/**`와 `salt-microFe/docs/design-system/**`이다. `apps/**`는 토큰 alias가 유지되므로 이 요구사항에서 변경하지 않는다. `bff/**`, `salt-server/**`는 변경하지 않는다.

## Research Notes — 레퍼런스 디자인 시스템 실조사

공식 문서에서 **확보한 것**과 **문서화되어 있지 않은 것**을 구분해 기록한다. 문서에 없는 값은 컴포넌트 스펙에서 역산하거나 2차 출처를 표시했다.

### 확보 — Foundation

| 항목 | 내용 | 출처 |
|---|---|---|
| **Grey 10단계** | `#f9fafb #f2f4f6 #e5e8eb #d1d6db #b0b8c1 #8b95a1 #6b7684 #4e5968 #333d4b #191f28` | 공식 Colors |
| **Blue 10단계** | `#e8f3ff #c9e2ff #90c2ff #64a8ff #4593fc #3182f6 #2272eb #1b64da #1957c2 #194aa6` | 공식 Colors |
| **Red 10단계** | `#ffeeee #ffd4d6 #feafb4 #fb8890 #f66570 #f04452 #e42939 #d22030 #bc1b2a #a51926` | 공식 Colors |
| 그 외 계열 | Orange · Yellow · Green · Teal · Purple 도 각 50~900 존재 | 공식 Colors |
| Grey opacity | `greyOpacity50~900`, 투명도 0.02~0.91 | 공식 Colors |
| Background 토큰 | `background` / `greyBackground(=grey100)` / `layeredBackground` / `floatedBackground` | 공식 Colors |
| **타입 주 7단계** | `30/40 · 26/35 · 22/31 · 20/29 · 17/25.5 · 15/22.5 · 13/19.5` (size/line-height) | 공식 Typography |
| 타입 보조 | `subTypography 1~13`, 29px → 11px | 공식 Typography |
| Weight | Light · Regular · Medium · Semibold · Bold (5단계) | 공식 Typography |
| 숫자 표기 | 표시용은 가변폭, **금융 표·시세는 고정폭(tabular)** 이중 모드 | 공식 Typography |

### 확보 — 컴포넌트 인벤토리 (40종+)

```text
Badge · Border · Bubble · Button · Checkbox · IconButton · Paragraph · Switch · TextButton
NumericSpinner · Rating · SearchField · SegmentedControl · Slider · Stepper
BoardRow · GridList · ListHeader · ListFooter · TableRow · ListRow
Highlight · Loader · ProgressBar · ProgressStepper · Result · Skeleton · Toast · Tooltip
BottomInfo · BottomSheet · Menu · Modal · Dialog(Alert/Confirm)
Post · Tab · Top
Agreement · Asset · BottomCTA(Single/Double/Fixed) · Chart(BarChart) · Keypad · TextField(box/line/big/hero)
훅: useDialog · useToast · useBottomSheet
```

> **이 목록이 FR-20~47의 검증이 되었다.** 내가 갭으로 뽑은 컴포넌트 20종 중 **17종이 레퍼런스에도 독립 컴포넌트로 존재**한다(ListRow · ProgressBar · Badge · Skeleton · BottomSheet · SegmentedControl · Slider · Switch · Border · Result · Top · Chart …). 즉 "화면 문법을 만들려면 이 프리미티브가 필요하다"는 판단이 맞았다.
> 반대로 **내가 놓쳤던 것**도 드러났다 — 아래 FR-60~67로 추가한다.

### 문서화되어 있지 않음 (foundation에 Colors·Typography만 존재)

| 항목 | 상태 | 이 REQ에서의 처리 |
|---|---|---|
| Spacing 토큰 | **공식 페이지 없음** | 2차 출처 기준 `4 / 6 / 8 / 16 / 24 / 32`. 우리 `space`는 이미 `4/8/12/16/24/32/48…`로 상위 호환이므로 **그대로 유지**하고 `20px`만 추가(D-5) |
| Radius 토큰 | **공식 페이지 없음.** 컴포넌트 스펙에서 역산 | 버튼 크기별 `8 / 10 / 14 / 16`, 소형 `4 / 6`. 우리 `radius`는 `2/4/8/12/16/20`이라 **10px·14px이 없다** → D-7로 추가 |
| Elevation / Shadow | **공식 토큰 없음** | D-4의 값은 우리가 정의한다. 레퍼런스는 그림자를 거의 쓰지 않고 **8px 회색 밴드와 여백으로 위계를 만든다** — 이 원칙을 따른다(FR-23) |
| Motion / Easing | **공식 토큰 없음** | 기존 `transitions.fast/base/slow/slower` 유지 |
| Grid | 문서 없음 | 해당 없음 |
| 폰트 | 전용 서체이며 **외부 배포되지 않음** | **우리 `Inter` + `Noto Sans KR`를 그대로 쓴다.** 이미 `globalFontFace`로 로드되어 있고 교체 대상이 아니다 |

### 컴포넌트 스펙 (확보한 것)

| 컴포넌트 | 스펙 |
|---|---|
| Button XLarge | height `56px` · padding `0 20px` · font `17px/600` · radius `16px` |
| Badge | `xsmall / small / medium / large` 4단계 |
| TextField | `box / line / big / hero` 4 variant |

## Current Findings (작업 전 실측)

### 토큰 — `packages/ui/src/styles/tokens.css.ts`

| 그룹 | 현재 상태 | 판정 |
|---|---|---|
| `radius` | `none/xs/small/base/medium/large/xl/full` = `0/2/4/8/12/16/20/9999` | **충분.** 그대로 사용 |
| `space` | `none/xs/sm/md/lg/xl/2xl…6xl` = `0/4/8/12/16/24/32/48/64/80/96` | **충분.** 단 `20px`이 없어 리스트 행 좌우 패딩에 `lg(16)`↔`xl(24)` 중 하나를 강제 선택해야 함 |
| `fontSizes` | `xs/sm/base/md/lg/xl/2xl/3xl/4xl/5xl/6xl` = `10/12/14/14/16/18/20/24/32/40/48` | **부족.** `base`와 `md`가 둘 다 14px로 중복. **line-height가 토큰에 없어** 컴포넌트마다 `1.3`/`1.5`를 하드코딩하고 있음(`Heading` 1.3, `Text` 1.5) |
| `fontWeights` | `300~800` 6단계 | 충분 |
| `fontFamily` | `Inter`, `Noto Sans KR` — `globalFontFace`로 이미 로드 | **그대로 유지.** 변경하지 않음 |
| `lineHeights` | `1.2/1.3/1.5/1.75/2` (배수) | 존재하지만 **어떤 컴포넌트도 참조하지 않음**. 배수만 있어 px 기반 리듬을 못 만든다 |
| `letterSpacings` | `-0.05/-0.02/0/0.02/0.05em` | 존재하지만 참조 거의 없음. 큰 숫자용 `-0.03em`이 없음 |
| `colors.brand` | `#7949FF` / hover `#6339E6` / active `#5329CC` / light `#9B7FFF` / lighter `#E5DBFF` | **유지** (아래 D-1) |
| `colors.special.up/down` | `#FF2E55` / `#1677EE` | **유지.** 상승 적색 / 하락 청색 국내 관례 |
| `colors.neutral.50~900` | `#F8F9FA #F0F1F3 #E1E3E6 #C8CCD1 #A8A6AC #868E96 #495057 #343A40 #212529 #191F28` | **명도 간격이 불균등.** 400(`#A8A6AC`)과 500(`#868E96`)은 차이가 작고, 500→600(`#495057`)은 급격히 어두워져 중간 위계를 만들 단계가 없다 |
| `colors.text` | primary/secondary/tertiary/disabled/white/inverse/lightGray + deprecated 4개 | deprecated(`base`,`nickname`,`email`,`H2`)가 남아 있음 |
| `colors.shadow` | `rgba(0,0,0,.05/.1/.15/.2)` 4단계 | 색만 있고 **완성된 box-shadow 토큰이 없어** 컴포넌트가 `0 1px 3px ${shadow.sm}` 식으로 조합을 반복 |
| `zIndices` | `base~tooltip` 8단계 | 충분 |
| `transitions` | `fast/base/slow/slower` | 충분 |
| 등가폭 숫자 | **없음** | 시세·금액이 실시간으로 바뀔 때 자리가 흔들린다 |
| exports | `package.json`에 **토큰 subpath 없음** | 앱에서 토큰을 공식 경로로 가져올 수 없음. `docs/design-system/style-tokens.md`에도 같은 지적이 있다 |

### 컴포넌트 — `packages/ui/package.json` exports 기준 25종

```text
button container radiobutton input card heading grid icon code
styles styles/button styles/heading text serviceicon wrapper header
flexBox padding section tabs margin filterTabs table servicewrapper
starIcon image scrollContainer root previewChart useThrottle useDebounce
```

스토리보드 27개 화면을 조립해 보면 **아래 20종이 없어서 앱 로컬에 중복 구현될 상황**이다.

| 필요 컴포넌트 | 스토리보드에서 쓰이는 곳 | 지금은 |
|---|---|---|
| `AppBar` | 모든 모바일 화면 상단(로고·제목·검색·알림 배지) | 앱마다 `<header>` 직접 작성 |
| `BottomTabBar` | 앱 하단 탭 5개 | 없음 |
| `SegmentedControl` | 홈 `내 자산/오늘 볼 것`, 세금 4탭, 청구서 기간 5탭 | `Tabs`가 있으나 밑줄형이라 세그먼트가 아님 |
| `ListRow` | 종목 행·알림 행·보유 행 — **가장 많이 쓰임** | 각 앱에서 flex 직접 조립 |
| `ListGroup` / `SectionBand` | 흰 배경 그룹 + 8px 회색 밴드로 위계 만들기 | 없음. 카드 남발로 위계 붕괴 |
| `BottomSheet` | 주문 전 체크 · 거래 기록 추가 · 알림 만들기 | 없음 |
| `Badge` (Pill/Tag) | 세금 배지·판정 배지·모드 배지 — 전 화면 | 앱 로컬 `Badge` 1개만 존재(뉴스 프리뷰 내부) |
| `Chip` | 금액·손절률·필터 선택 | `FilterTabs`는 그룹 전용이라 단독 칩이 없음 |
| `ProgressBar` | 신뢰도·목표 진행률·자산군 비중 | 없음 |
| `Toggle` | 설정 알림 on/off·보류 기능 | `RadioButton`만 있음 |
| `KeyValueList` | 시세 2열 그리드·세금 파라미터 12줄 | 없음 |
| `Banner` / `Callout` | 경고·면책·정보 — 전 화면 | 없음 |
| `EmptyState` | 빈 상태 4종 | 없음 |
| `Skeleton` | 로딩 2종 | 없음 |
| `Divider` | 그룹 내 구분선 | 없음 |
| `AssetIcon` | 종목 아이콘(색·이니셜) | `Image`로 로고 URL만. 로고 없는 자산 대응 불가 |
| `Sparkline` | 지수 칩 5개 | `PreviewChart`는 큰 차트 전용 |
| `NumberText` | 모든 금액·시세·수익률 | 없음. 등가폭·부호·색 규칙이 앱마다 재구현 |
| `Slider` | 연말 시가 가정 | 없음 |
| `RadarChart` | 리스크 레이더 5축 | 없음 |

## Decisions

### D-1. 브랜드 색은 `#7949FF`를 유지한다

레퍼런스 팔레트의 액센트는 청색 계열이지만, 이 제품에는 **하락이 청색(`#1677EE`)** 이다. 액센트를 청색으로 바꾸면 버튼·링크·선택 상태가 "하락"과 같은 색조가 되어 금융 화면에서 의미가 충돌한다. 현재 보라 브랜드는 이 충돌이 없고, 이미 앱 전반에 적용되어 있다.

> **결론: 브랜드/액센트는 `#7949FF` 유지.** "같은 디자인"의 인상은 액센트 색조가 아니라 **중립 스케일 · 타입 리듬 · 여백 · radius · 레이아웃 문법**이 만든다. 그쪽을 정합시킨다.

`brand.lighter(#E5DBFF)`는 선택 배경, `brand.light(#9B7FFF)`는 비활성 강조로 유지한다. AI/LLM 생성물(Gemini 해설 카드)은 브랜드 보라와 구분되도록 **별도 accent(`special.purple`이 아닌 신설 `ai` 그룹)** 를 쓴다 — 지금은 둘이 같은 값이어서 "브랜드 요소"와 "LLM 생성물"이 구분되지 않는다.

### D-2. 중립 스케일 값을 균등 명도로 교체한다 (키 이름 유지 → 비파괴)

| 키 | 현재 | 변경 | 비고 |
|---|---|---|---|
| `neutral.50` | `#F8F9FA` | `#F9FAFB` | 거의 동일 |
| `neutral.100` | `#F0F1F3` | `#F2F4F6` | 배경과 통일 |
| `neutral.200` | `#E1E3E6` | `#E5E8EB` | 경계선 |
| `neutral.300` | `#C8CCD1` | `#D1D6DB` | 비활성 경계 |
| `neutral.400` | `#A8A6AC` | `#B0B8C1` | 회색 문자 |
| `neutral.500` | `#868E96` | `#8B95A1` | 보조 문자 |
| `neutral.600` | `#495057` | `#6B7684` | **중간 단계 확보** |
| `neutral.700` | `#343A40` | `#4E5968` | **중간 단계 확보** |
| `neutral.800` | `#212529` | `#333D4B` | 본문 강조 |
| `neutral.900` | `#191F28` | `#191F28` | 동일 |

키 이름이 그대로이므로 앱 코드는 수정 없이 값만 바뀐다. `text.tertiary(#868E96)`는 `neutral.500(#8B95A1)`으로, `text.disabled(#A8A6AC)`는 `neutral.400(#B0B8C1)`으로 정렬한다.

### D-3. 타입 스케일에 line-height를 묶는다 (신설 `typography` 그룹)

`fontSizes`는 유지하되(호환), size와 line-height를 짝지은 `typography` 토큰을 신설한다. 7단계 + 보조 1단계.

| 토큰 | size | line-height | 용도 |
|---|---|---|---|
| `typography.t1` | `30px` | `40px` | 총자산·현재가 (화면당 1개) |
| `typography.t2` | `26px` | `35px` | 큰 금액 |
| `typography.t3` | `22px` | `31px` | 섹션 대표 숫자 |
| `typography.t4` | `20px` | `29px` | 화면 제목 |
| `typography.t5` | `17px` | `25.5px` | 그룹 제목·강조 본문 |
| `typography.t6` | `15px` | `22.5px` | 리스트 행 본문 |
| `typography.t7` | `13px` | `19.5px` | 보조 문자 |
| `typography.t8` | `11px` | `16.5px` | 배지·캡션 |

`letterSpacings`에 `-0.03em`(t1~t2용)을 추가한다.

### D-4. elevation·numeric 토큰을 신설한다

```ts
elevation: {
  none: "none",
  sm: "0 1px 2px rgba(25,31,40,.04), 0 2px 8px rgba(25,31,40,.04)",
  md: "0 4px 16px rgba(25,31,40,.08)",
  lg: "0 18px 50px rgba(25,31,40,.18)",
  sheet: "0 -8px 30px rgba(25,31,40,.16)",
}
numeric: { tabular: "tabular-nums" }
```

`colors.shadow.*`는 deprecated로 표시하되 삭제하지 않는다.

### D-5. `space`에 `20px`을 추가한다

리스트 행·그룹 헤더의 좌우 패딩이 20px일 때 가장 안정적이다. `space.lg2: "20px"`로 추가한다(기존 키 순서를 깨지 않기 위해 신규 키 사용).

### D-6. 토큰 공개 경로를 만든다

`package.json` exports에 `"./tokens": "./src/styles/tokens.css.ts"`를 추가한다. 앱에서 `@repo/ui/tokens`로만 가져오고 `packages/ui/src/**` deep import는 계속 금지한다.

### D-7. `radius`에 `10px`·`14px`을 추가한다

레퍼런스는 버튼 크기별로 radius를 `8 / 10 / 14 / 16`으로 쓴다. 우리 `radius`는 `2/4/8/12/16/20`이라 중간 두 단계가 없어 버튼 크기별 곡률을 맞출 수 없다.

| 키 | 값 | 용도 |
|---|---|---|
| `radius.button.sm` | `8px` | 작은 버튼·칩 |
| `radius.button.md` | `10px` | 기본 버튼 |
| `radius.button.lg` | `14px` | 큰 버튼 |
| `radius.button.xl` | `16px` | 하단 CTA (height 56) |

기존 평면 키(`base/medium/large/xl`)는 유지하고 `radius.button.*`을 중첩 그룹으로 신설한다.

### D-8. 그림자 대신 밴드로 위계를 만든다

레퍼런스는 카드 그림자를 거의 쓰지 않는다. 섹션은 **흰 배경 그룹 + 회색 밴드**로 끊고, 그림자는 실제로 떠 있어야 하는 것(BottomSheet, Toast, 떠 있는 CTA)에만 쓴다. 지금 `Card`는 무조건 `boxShadow: 0 1px 3px`가 들어가 있어 **모든 블록이 같은 무게로 보인다.**

> **결론: `Card`에 `elevation` variant를 추가하고 기본값을 `none`으로 바꾼다.** 기존 호출부 호환을 위해 `elevation="sm"`을 명시할 수 있게 하고, 문서에 "카드를 남발하지 말고 `ListGroup`+`SectionBand`를 우선한다"를 명시한다.

## Requirements

### A. 토큰

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | `colors.neutral.50~900` 값을 D-2 표대로 교체. 키 이름·개수 유지 | Must |
| FR-2 | `colors.text.tertiary` → `#8B95A1`, `colors.text.disabled` → `#B0B8C1`, `colors.text.lightGray` → `#6B7684`로 정렬 | Must |
| FR-3 | `colors.border.light` → `#E5E8EB`, `border.default` → `#D1D6DB`, `border.dark` → `#B0B8C1` | Must |
| FR-4 | `typography.t1~t8` 신설(D-3). size·lineHeight를 한 토큰으로 묶는다 | Must |
| FR-5 | `letterSpacings.tightest: "-0.03em"` 추가 | Must |
| FR-6 | `elevation.none/sm/md/lg/sheet` 신설(D-4). `colors.shadow.*`는 유지 + deprecated 주석 | Must |
| FR-7 | `numeric.tabular` 신설 | Must |
| FR-8 | `space.lg2: "20px"` 추가 | Should |
| FR-9 | `colors.ai.primary/light/lighter` 신설 — LLM 생성물 전용. 브랜드 보라와 구분되는 값 사용 | Should |
| FR-10 | `colors.text`의 deprecated 4개(`base`,`nickname`,`email`,`H2`)에 JSDoc `@deprecated` 주석 추가. 삭제하지 않음 | Should |
| FR-11 | `package.json` exports에 `"./tokens"` 추가 (D-6) | Must |
| FR-12 | `docs/design-system/style-tokens.md`를 변경된 값·신규 그룹으로 갱신하고, 토큰 subpath 없음 경고 문구 제거 | Must |

### B. 컴포넌트 — 1차 (스토리보드 필수 12종)

| ID | 컴포넌트 | 요구사항 | 우선순위 |
|---|---|---|---|
| FR-20 | `NumberText` | 금액·수익률·수량 전용. props: `value`, `unit?`, `signed?`, `tone?('auto'\|'up'\|'down'\|'neutral')`, `size?(t1~t8)`. `numeric.tabular` 적용. `signed`면 항상 `+/−` 문자 출력(색만으로 부호를 전달하지 않음) | Must |
| FR-21 | `ListRow` | `leading?`(아이콘) · `title` · `caption?` · `trailingTop?` · `trailingBottom?` · `onPress?` · `chevron?`. 최소 높이 56px, 좌우 패딩 `space.lg2` | Must |
| FR-22 | `ListGroup` | `title?` · `count?` · `action?`(더보기) · children. 흰 배경, 그룹 사이는 `SectionBand`로 끊는다 | Must |
| FR-23 | `SectionBand` | 높이 8px, `neutral.100` 배경. 카드 그림자 대신 위계를 만드는 기본 장치 | Must |
| FR-24 | `Badge` | `tone('neutral'\|'brand'\|'up'\|'down'\|'success'\|'warning'\|'ai')` · `size('sm'\|'md')`. 앱 로컬 Badge를 이걸로 대체 | Must |
| FR-25 | `Chip` | `selected` · `onPress` · `disabled`. 단독/그룹 모두. `FilterTabs`와 역할 분리 명시 | Must |
| FR-26 | `ProgressBar` | `value(0~1)` · `tone` · `segments?`(자산군 비중용 다중 세그먼트) · `height?` | Must |
| FR-27 | `Banner` | `tone('info'\|'warning'\|'error'\|'success'\|'neutral')` · `title?` · children. 면책·경고 전용 | Must |
| FR-28 | `KeyValueList` | `items: {label, value, tone?}[]` · `columns(1\|2)`. 행 사이 `neutral.100` 구분선 | Must |
| FR-29 | `SegmentedControl` | `options` · `value` · `onChange` · `variant('underline'\|'pill')`. `underline`은 기존 `Tabs`와 시각 일치, `pill`은 세그먼트형 | Must |
| FR-30 | `AppBar` | `title` · `leading?('back'\|'logo')` · `actions?` · `sticky?`. 알림 배지 슬롯 포함 | Must |
| FR-31 | `AssetIcon` | `symbol` · `src?` · `size`. `src`가 없으면 심볼 이니셜 + 결정적 배경색으로 폴백. 로고 없는 국내주식·ETF 대응 | Must |

### C. 컴포넌트 — 2차 (상태·상세 화면용 8종)

| ID | 컴포넌트 | 요구사항 | 우선순위 |
|---|---|---|---|
| FR-40 | `BottomTabBar` | `items` · `value` · `onChange`. 최대 5개 제한을 타입으로 강제 | Should |
| FR-41 | `BottomSheet` | `open` · `onClose` · `title?` · `grabber?`. focus trap · ESC 닫기 · 스크롤 락 | Should |
| FR-42 | `EmptyState` | `icon?` · `title` · `description?` · `action?` | Should |
| FR-43 | `Skeleton` | `width` · `height` · `radius?` · `lines?`. `prefers-reduced-motion`에서 애니메이션 정지 | Should |
| FR-44 | `Toggle` | `checked` · `onChange` · `disabled`. `role="switch"` | Should |
| FR-45 | `Divider` | `inset?` · `tone?` | Should |
| FR-46 | `Sparkline` | `points` · `tone` · `height`. 지수 칩용 소형 | Should |
| FR-47 | `Slider` | `min` · `max` · `value` · `onChange` · `format?`. 키보드 조작 + 숫자 직접 입력 대체 수단 필수 | Should |

### C-2. 레퍼런스 인벤토리에서 확인된 누락 8종

| ID | 컴포넌트 | 요구사항 | 우선순위 |
|---|---|---|---|
| FR-60 | `BottomCTA` | `Single` / `Double` / `Fixed` 3형태. 종목 상세 하단 고정 3버튼이 `Fixed`+`Double` 조합이다. safe-area 하단 패딩 처리 포함 | Must |
| FR-61 | `Top` (=`AppBar`) | FR-30과 동일 대상. **이름을 `Top`이 아니라 `AppBar`로 간다** — 레포에 이미 `Header`가 있어 `Top`은 의미가 겹친다 | Must |
| FR-62 | `Result` (=`EmptyState`) | FR-42와 동일 대상. 빈 상태 + 완료/실패 결과 화면을 하나로. `tone('empty'\|'success'\|'error')` | Should |
| FR-63 | `Toast` + `useToast` | 저장·삭제·복사 피드백. 스토리보드 거래 기록 추가·알림 만들기 저장 후 필요 | Should |
| FR-64 | `SearchField` | 종목 검색 화면 상단. `value` · `onChange` · `onClear` · `placeholder`. `InputField`와 역할 분리 | Should |
| FR-65 | `IconButton` | 앱바 액션(검색·알림·더보기), 관심 토글. accessible name 필수 | Should |
| FR-66 | `Checkbox` | 체크리스트·동의 항목. `RadioButton`만 있어 다중 선택을 못 만든다 | Should |
| FR-67 | `TextField` | `box` / `line` 4 variant 중 최소 `box`·`line`. 바텀시트 3종의 입력 필드가 전부 이걸 쓴다. 현재 `InputField`는 variant가 없다 | Should |

### D. 3차 (선택)

| ID | 컴포넌트 | 비고 |
|---|---|---|
| FR-50 | `RadarChart` | 리스크 레이더 5축. 앱 로컬로 두고 재사용되면 승격 |
| FR-51 | `StatTile` | KPI 4칸. `ListGroup`+`NumberText` 조합으로 대체 가능하면 만들지 않음 |

## 비기능 요구사항

| 구분 | 요구사항 |
|---|---|
| 성능 | Vanilla Extract 정적 추출 유지. 런타임 CSS-in-JS 도입 금지. 신규 컴포넌트로 `@repo/ui` 번들 증가분 gzip 12KB 이하 |
| 접근성 | `.claude/rules/a11y-policy.md` 준수. `Toggle`은 `role="switch"`, `BottomSheet`는 focus trap + ESC, `SegmentedControl`은 `role="tablist"`, 아이콘 전용 버튼은 accessible name 필수. focus visible 제거 금지. 상승·하락은 **색 + 부호 문자** 동시 표기(FR-20) |
| 호환성 | 기존 토큰 키를 삭제하지 않는다. 값 변경은 D-2/FR-1~3 범위로 한정하고, 앱 코드 수정 없이 반영되어야 한다 |
| 반응형 | 신규 컴포넌트는 폭 320px에서 깨지지 않아야 한다. 표·넓은 콘텐츠는 자체 `overflow-x` 컨테이너를 갖는다 |
| 문서 | 신규 컴포넌트 전부 Storybook story 작성(`packages/ui/.claude/rules/storybook.md`). `docs/design-system/component-index.md` 갱신 |
| 관측성 | 해당 없음 |

## 영향 범위

| Layer | 위치 | 영향 |
|---|---|---|
| UI 패키지 | `packages/ui/src/styles/tokens.css.ts` | FR-1~10 |
| UI 패키지 | `packages/ui/package.json` | FR-11 (`./tokens` + 신규 컴포넌트 subpath 20개) |
| UI 패키지 | `packages/ui/src/{NumberText,ListRow,ListGroup,SectionBand,Badge,Chip,ProgressBar,Banner,KeyValueList,SegmentedControl,AppBar,AssetIcon}/**` | FR-20~31 신규 |
| UI 패키지 | `packages/ui/src/{BottomTabBar,BottomSheet,EmptyState,Skeleton,Toggle,Divider,Sparkline,Slider}/**` | FR-40~47 신규 |
| 문서 | `docs/design-system/style-tokens.md` · `component-index.md` | FR-12 |
| 앱 | `apps/investments`, `apps/shell` | **이 요구사항에서 변경하지 않음.** 토큰 키가 유지되어 값만 반영됨. 화면 적용은 별도 REQ |
| BFF · 서버 | — | 변경 없음 |

## 수용 기준

- [ ] `colors.neutral.50~900`이 D-2 표의 값과 일치한다.
- [ ] `typography.t1~t8`이 존재하고 각 토큰이 size·lineHeight를 함께 제공한다.
- [ ] `elevation.sm/md/lg/sheet`와 `numeric.tabular`가 존재한다.
- [ ] `colors.brand.primary`가 여전히 `#7949FF`다. (D-1)
- [ ] `colors.special.up`이 `#FF2E55`, `down`이 `#1677EE`다.
- [ ] `fontFamily`가 `Inter`, `Noto Sans KR` 그대로이고 `globalFontFace` 선언이 변경되지 않았다.
- [ ] 기존 토큰 키가 하나도 삭제되지 않았다. `grep -rn "vars\." apps/` 결과가 전부 해석된다.
- [ ] `@repo/ui/tokens`로 토큰을 import할 수 있고, `apps/**`에 `packages/ui/src/**` deep import가 0건이다.
- [ ] FR-20~31 컴포넌트 12종이 exports subpath로 공개되고 Storybook story가 있다.
- [ ] FR-40~47 컴포넌트 8종이 exports subpath로 공개되고 Storybook story가 있다.
- [ ] FR-60~67 컴포넌트 8종이 exports subpath로 공개되고 Storybook story가 있다.
- [ ] `radius.button.sm/md/lg/xl` = `8/10/14/16`이 존재한다.
- [ ] `Card`의 `elevation` 기본값이 `none`이고, `sm`을 명시하면 기존 그림자가 나온다.
- [ ] `BottomCTA`가 safe-area 하단 패딩을 반영한다.
- [ ] `NumberText`에 `signed`를 주면 색과 무관하게 `+`/`−` 문자가 출력된다.
- [ ] `AssetIcon`에 `src`를 주지 않아도 심볼 이니셜과 배경색으로 렌더된다.
- [ ] `Toggle`이 `role="switch"`이고 키보드로 조작된다.
- [ ] `BottomSheet`가 열릴 때 focus를 가두고 ESC로 닫히며 배경 스크롤이 잠긴다.
- [ ] `SegmentedControl`이 `role="tablist"`이고 활성 항목에 `aria-selected`가 있다.
- [ ] 폭 320px에서 신규 컴포넌트 전부 가로 스크롤 없이 렌더된다.
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm build`, Storybook 빌드가 전부 통과한다.
- [ ] `@repo/ui` 번들 증가분이 gzip 12KB 이하다.
- [ ] `docs/design-system/style-tokens.md`에서 "토큰 전용 subpath가 없다" 경고 문구가 제거되었다.

## 검증 계획

1. **토큰 회귀** — 변경 전/후 `vars` 객체를 JSON으로 덤프해 diff. 삭제된 키가 0인지 확인.
2. **앱 시각 회귀** — `apps/investments` 실시간 테이블과 `apps/shell` 홈을 변경 전/후 동일 뷰포트(375 / 390 / 1440)에서 스크린샷 비교. 중립 스케일 교체로 의도치 않게 대비가 낮아진 곳을 찾는다.
3. **대비 검사** — `text.tertiary` on `background.white`, `text.disabled` on `neutral.50`, `up`/`down` on `white`를 WCAG AA(4.5:1, 큰 텍스트 3:1)로 측정. 미달 시 해당 토큰만 한 단계 어둡게 조정.
4. **컴포넌트 단위** — 12종 + 8종 각각 Storybook에서 variant 전수 확인. `NumberText`는 양수/0/음수/`signed` 조합, `AssetIcon`은 `src` 유/무, `ProgressBar`는 단일/다중 세그먼트.
5. **접근성** — Storybook a11y addon으로 위반 0건 확인. `BottomSheet` focus trap과 ESC, `Toggle` 키보드, `SegmentedControl` 화살표 키를 수동 확인.
6. **반응형** — 320 / 375 / 768 / 1440에서 신규 컴포넌트 스토리 전수 확인.
7. **번들** — 변경 전/후 `@repo/ui` 빌드 산출물 gzip 크기 비교.

## Open Questions

- **`fontSizes.base`와 `md`가 둘 다 14px**이다. `typography` 토큰이 들어오면 `fontSizes`는 사실상 legacy가 되는데, 중복 키를 정리할지 그대로 둘지 결정이 필요하다. 1차에서는 그대로 둔다(비파괴 우선).
- **`colors.ai.*`의 실제 값**을 정해야 한다(FR-9). 브랜드 보라(`#7949FF`)와 구분되면서 충돌하지 않는 값이 필요하다. 후보: 청록 계열(`special.teal #20C997`) 재사용 또는 신설.
- **틴트 배지용 토큰이 없다(신규).** `Badge`(FR-24)의 `up`·`down` tone은 라이트 틴트 배경을 쓸 값이 없어서(`market.upLight`/`downLight` 부재) 솔리드 배경 + 흰 글자로 만들었다. 흰 글자 대비는 `#FF2E55`에서 3.5:1, `#1677EE`에서 4.0:1로 **작은 글자 AA(4.5:1) 미달**이다. 또 `status.success(#51CF66)`를 `successLight(#D3F9D8)` 위에 올리면 약 2:1이라 틴트 배지의 전경색을 `neutral/800`으로 대체했다. 선택지는 ① `market.upLight/downLight` + `status.*Dark` 신설 ② 배지를 전부 `neutral/800` 전경으로 통일 ③ 배지 최소 크기를 큰 텍스트(AA 3:1)로 규정. Figma 컴포넌트는 현재 ②에 가깝게 만들어져 있다.
- **`space.lg2`라는 이름**이 어색하다. `space` 키를 숫자 기반(`s4/s8/s12/…`)으로 재편할지 여부는 별도 REQ로 미룬다.
- `RadarChart`(FR-50)를 `@repo/ui`에 올릴지, `apps/investments` 로컬에 둘지. 재사용처가 현재 1곳이므로 로컬 우선이 규칙에 맞다.
- `PreviewChart`와 `Sparkline`의 경계. 크기 기준으로 나눌지, `PreviewChart`에 `size` variant를 추가할지.
- **`Card` 기본 elevation을 `none`으로 바꾸면** 기존 화면에서 카드 경계가 사라져 보이는 곳이 생길 수 있다. D-8 적용 후 앱 스크린샷 회귀(검증 계획 2)에서 확인하고, 필요하면 `Card`에 `border` variant를 추가한다.
- **레퍼런스 컴포넌트 이름을 그대로 쓸지** 우리 관례를 유지할지. `Top`→`AppBar`, `Result`→`EmptyState`, `Switch`→`Toggle`처럼 이미 레포에 겹치는 이름이 있어 1:1로 맞추지 않았다. `component-index.md`에 대응표를 남긴다.
- `Paragraph` · `Highlight` · `Bubble` · `Post` · `BoardRow` · `GridList` · `Keypad` · `Rating` · `NumericSpinner` · `Stepper` · `ProgressStepper` · `Menu` · `Agreement`는 **현재 스토리보드에 쓰이는 곳이 없어 제외**했다. 필요해지면 별도 REQ로.
- 다크 모드. 현재 토큰은 라이트 단일이고 `background.dark`만 존재한다. 스토리보드도 라이트 단일이므로 이 REQ 범위 밖으로 둔다.

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-09-08 | 초안 작성. 토큰 실측(12그룹), 컴포넌트 갭 20종 확정, 브랜드 색 유지 결정(D-1), 중립 스케일 정합(D-2), 타입 스케일 line-height 부여(D-3) |
| 2026-09-08 | **레퍼런스 공식 문서 실조사 반영.** Research Notes 신설 — 색상 3계열 10단계·타입 7+13단계·컴포넌트 40종 인벤토리 확보, spacing·radius·elevation·motion은 공식 문서 없음을 명시. radius `10/14` 추가(D-7), 그림자 대신 밴드 원칙(D-8), 누락 컴포넌트 8종 추가(FR-60~67) |
| 2026-09-08 | **Figma 파운데이션 생성기 추가.** `tools/figma-plugin/`에 로컬 개발 플러그인을 작성해 D-2~D-8 목표값을 Figma Variables·Text Style·Effect Style·스펙시멘 페이지로 생성한다. 토큰 코드 반영(FR-1~FR-11)보다 Figma가 먼저 목표값을 들고 있는 상태이며, 값 변경 시 `code.js` 재실행으로 동기화한다. `colors.ai.*`는 Open Question 미결 상태이므로 후보값 `#20C997`을 잠정 적용 |
| 2026-09-08 | **Figma 컴포넌트 1차 12종(FR-20~FR-31) 생성 추가.** `tools/figma-plugin`이 Component Set 11개 + 단독 1개(총 60 컴포넌트)를 만든다. fill·stroke는 Variable, 텍스트는 Text Style에 바인딩. `ListGroup`은 `ListRow` 인스턴스를 품는다. **신규 갭 발견** — 상승·하락의 라이트 틴트 토큰(`market.upLight`/`downLight`)이 없어 `Badge`의 up·down을 솔리드 배경 + 흰 글자로 처리했고, `status.success`를 `successLight` 위에 올리면 대비 2:1로 AA 미달이라 틴트 배지 전경색을 `neutral/800`으로 대체했다. 틴트 배지를 정식화하려면 토큰 추가 결정이 필요하다 |
| 2026-09-08 | **Figma를 코드 실측값 기준으로 재정렬.** 생성물이 실제 구현과 다르다는 지적을 받아 Variable Collection을 Mode 2개(`Current`=tokens.css.ts 실측 / `Target`=본 REQ 적용 후)로 재구성했다. 누락 색 토큰(special 14 · status hover · overlay · shadow · background.gray · border.lightDark · text deprecated)을 모두 채워 123개가 되었고, 두 모드에서 값이 다른 것은 16개다. 또 이미 구현된 컴포넌트 10종(Button·Card·Heading·Text·InputField·Tab/Tabs·FilterTab/FilterTabs·Table)을 `packages/ui/src/**` 실측 스펙으로 미러링해 Figma가 "이미 있는 것 + 앞으로 만들 것"을 모두 들게 했다(총 22종/139 컴포넌트). **신규 발견** — `InputField`가 토큰이 아니라 하드코딩 hex(`#7949FF`·`#E5E8EB`·`#8B95A1`·`#F2F4F6`)와 `vw` 단위를 쓴다 |
| 2026-09-09 | **Figma 컴포넌트를 실측 기반으로 전면 교체.** CSS를 읽어 해석하던 방식을 버리고, 실행 중인 Storybook에서 실제 렌더 결과를 측정하는 방식으로 바꿨다. ① `?args=variant:ghost;size:lg`로 prop을 주입해 **238개 조합**을 렌더시켜 측정하고 Component Set 12개로 만들었다. variant 이름이 `variant=ghost, size=lg` 형태라 Figma 속성 패널에 실제 props가 드롭다운으로 뜬다. ② 스토리 174개도 측정해 Component Set 16개로 만들었다(조합형 스토리 대조용). ③ **CSS 해석으로 만든 신규 12종(FR-20~FR-31)은 Figma에서 제거했다** — 코드에 없어 측정할 수 없고 근사치라 서로 겹치는 문제가 있었다. 스펙은 본 REQ와 `pm/storyboard`에 남아 있고, 구현되면 Storybook 스토리가 생기므로 그때 실측으로 들어온다. 측정·검증 도구는 `salt-microFe/tools/figma-plugin/measure/`에 있다 |
| 2026-09-09 | **Figma 생성기를 제거하고 코드 구현으로 방향 전환.** 측정 기반 생성(토큰·Storybook 실측)은 정확했지만, 코드에 없는 컴포넌트를 새로 디자인하는 데는 맞지 않는 도구였다 — 구조와 명세 추적성은 나오지만 시각적 완성도가 나오지 않아 조립한 화면이 와이어프레임 수준에 머물렀다. `salt-microFe/tools/figma-plugin/`을 삭제하고, 본 REQ의 A(토큰 FR-1~12)와 B(1차 컴포넌트 12종 FR-20~31)를 `packages/ui`에 직접 구현하는 것으로 방향을 바꾼다. 생성기 코드는 커밋 `86d73b9`에 남아 있어 필요하면 되살릴 수 있다 |
