# 컴포넌트 인덱스

`@repo/ui`는 `packages/ui/package.json`의 `exports` subpath로 import한다. 새 앱 UI를 만들 때는 아래 컴포넌트를 먼저 확인하고, 앱 전용 조합은 앱 내부에 둔다.

## 가져오기 패턴

```tsx
import { Button } from "@repo/ui/button";
import { Card } from "@repo/ui/card";
```

`packages/ui` 내부 파일을 앱에서 직접 찌르지 않는다. 필요한 공개 API가 없으면 `packages/ui/package.json`의 `exports`에 명시적으로 추가한다.

## 레이아웃

| 공개 경로 | 컴포넌트 | 주요 props | 소스 |
| --- | --- | --- | --- |
| `@repo/ui/root` | `Root` | `background`, `width`, `fullHeight` | `packages/ui/src/Root/Root.tsx` |
| `@repo/ui/container` | `Container` | `size`, `padding`, `centered`, `as` | `packages/ui/src/Container/Container.tsx` |
| `@repo/ui/section` | `Section` | `padding`, `background`, `fullWidth`, `containerSize`, `noContainer` | `packages/ui/src/Section/Section.tsx` |
| `@repo/ui/flexBox` | `FlexBox` | `direction`, `justify`, `align`, `gap`, `wrap`, `fullWidth`, `fullHeight`, `as` | `packages/ui/src/FlexBox/FlexBox.tsx` |
| `@repo/ui/grid` | `Grid`, `GridItem` | `columns`, `gap`, `rowGap`, `columnGap`, `responsive`, `minWidth`, `fullWidth`, `as` | `packages/ui/src/Grid/Grid.tsx` |
| `@repo/ui/padding` | `Padding` | 방향별 padding props | `packages/ui/src/Padding/Padding.tsx` |
| `@repo/ui/margin` | `Margin`, `Spacer`, `MarginBox` | 간격 props와 preset | `packages/ui/src/Margin/Margin.tsx` |
| `@repo/ui/scrollContainer` | `ScrollContainer` | `direction`, `scrollbarStyle`, `size`, `shadow`, `as` | `packages/ui/src/ScrollContainer/ScrollContainer.tsx` |
| `@repo/ui/wrapper` | `Wrapper` | `children` | `packages/ui/src/Wrapper/Wrapper.tsx` |
| `@repo/ui/servicewrapper` | `ServiceWrapper` | `children` | `packages/ui/src/ServiceWrapper/ServiceWrapper.tsx` |

## 타이포그래피

| 공개 경로 | 컴포넌트 | 주요 props | 소스 |
| --- | --- | --- | --- |
| `@repo/ui/heading` | `Heading` | `level`, `size`, `color`, `lineClamp` | `packages/ui/src/Typo/Heading/Heading.tsx` |
| `@repo/ui/text` | `Text` | `variant`, `color` | `packages/ui/src/Typo/Text/Text.tsx` |
| `@repo/ui/code` | `Code` | `children`, `className` | `packages/ui/src/code.tsx` |

## 컨트롤

| 공개 경로 | 컴포넌트 | 주요 props | 소스 |
| --- | --- | --- | --- |
| `@repo/ui/button` | `Button` | `variant`, `size`, `fullWidth`, `type`, `disabled`, `onClick` | `packages/ui/src/Button/button.tsx` |
| `@repo/ui/input` | `InputField` | `register`, `name`, `variant`, `placeholder`, `type` | `packages/ui/src/InputField/InputField.tsx` |
| `@repo/ui/radiobutton` | `RadioButton` | `checked`, `onChange` | `packages/ui/src/RadioButton/RadioButton.tsx` |
| `@repo/ui/tabs` | `Tabs` | `tabs`, `defaultActiveTab`, `activeTab`, `onTabChange`, `tabPanel` | `packages/ui/src/Tabs/Tabs.tsx` |
| `@repo/ui/filterTabs` | `FilterTabs` | `options`, `value`, `onChange` | `packages/ui/src/FilterTabs/FilterTabs.tsx` |

## 데이터 표시

| 공개 경로 | 컴포넌트 | 주요 props | 소스 |
| --- | --- | --- | --- |
| `@repo/ui/card` | `Card` | `padding`, `className` | `packages/ui/src/Card/Card.tsx` |
| `@repo/ui/table` | `TableContainer`, `Table`, `TableHeader`, `TableHeaderCell`, `TableBody`, `TableRow`, `TableCell`, `EmptyState`, `ScrollTableContainer` | 테이블 크기, 레이아웃, 정렬, 행, 셀 props | `packages/ui/src/Table/Table.tsx` |
| `@repo/ui/previewChart` | `PreviewChart` | `data`, 크기와 차트 옵션 | `packages/ui/src/PreviewChart/PreviewChart.tsx` |
| `@repo/ui/image` | `Image` | 기본 image props와 로컬 variant | `packages/ui/src/Image/Image.tsx` |

## 내비게이션과 Shell

| 공개 경로 | 컴포넌트 | 주요 props | 소스 |
| --- | --- | --- | --- |
| `@repo/ui/header` | `Header` | `route`, `children` | `packages/ui/src/Header/Header.tsx` |

## 아이콘

| 공개 경로 | 컴포넌트 | 주요 props | 소스 |
| --- | --- | --- | --- |
| `@repo/ui/icon` | `Icon` | `url`, `variant`, `onClick` | `packages/ui/src/Icon/Icon.tsx` |
| `@repo/ui/serviceicon` | `ServiceIcon` | `variant` | `packages/ui/src/ServiceIcon/ServiceIcon.tsx` |
| `@repo/ui/starIcon` | `StarIcon` | SVG props | `packages/ui/src/StarIcon/StarIcon.tsx` |

## 훅

| 공개 경로 | API | 소스 |
| --- | --- | --- |
| `@repo/ui/useThrottle` | `useThrottle` | `packages/ui/src/Utils/hooks/useThrottle.tsx` |
| `@repo/ui/useDebounce` | `useDebounce` | `packages/ui/src/Utils/hooks/useDebounce.tsx` |

## Storybook 커버리지

대부분의 재사용 UI에는 Storybook story가 있다: `Button`, `Card`, `Container`, `FilterTabs`, `FlexBox`, `Grid`, `Heading`, `Image`, `Margin`, `Padding`, `PreviewChart`, `Root`, `ScrollContainer`, `Section`, `Table`, `Tabs`, `Text`.

Storybook 작성은 `packages/ui/.codex/rules/storybook.md`를 따른다.

## 규칙

- 앱 로컬 기본 컴포넌트를 만들기 전에 이 컴포넌트를 먼저 사용한다.
- 서비스별 문구, 데이터 요청, 라우팅 부수 효과, 앱 store 접근은 `packages/ui`에 넣지 않는다.
- 재사용 컴포넌트나 의미 있는 variant를 추가하면 Storybook story를 함께 추가한다.
- 의미 기반 props와 제한된 variant를 사용한다. 공유 컴포넌트에 열린 일회성 props를 추가하지 않는다.
- 두 개 이상 앱에서 같은 컴포넌트가 반복되면 명시적인 공개 subpath와 함께 `packages/ui`로 승격한다.
