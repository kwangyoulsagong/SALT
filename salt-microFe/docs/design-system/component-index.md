# 컴포넌트 인덱스

`@repo/ui`는 `packages/ui/package.json`의 `exports` subpath로 import한다. 새 앱 UI를 만들 때는 아래 컴포넌트를 먼저 확인하고, 앱 전용 조합은 앱 내부에 둔다.

## 가져오기 패턴

```tsx
import { Button } from "@repo/ui/button";
import { Card } from "@repo/ui/card";
import { vars } from "@repo/ui/tokens";
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
| `@repo/ui/sectionBand` | `SectionBand` | `thickness` | `packages/ui/src/SectionBand/SectionBand.tsx` |
| `@repo/ui/divider` | `Divider` | `orientation`, `tone`, `inset` | `packages/ui/src/Divider/Divider.tsx` |
| `@repo/ui/listGroup` | `ListGroup` | `title`, `count`, `action`, `children` | `packages/ui/src/ListGroup/ListGroup.tsx` |
| `@repo/ui/listFooter` | `ListFooter` | `caption`, `children` | `packages/ui/src/ListFooter/ListFooter.tsx` |
| `@repo/ui/movableGrid` | `MovableGrid` | `layout`, `onLayoutChange`, `renderPanel`, `renderPanelTitle`, `renderPanelActions`, `gap` | `packages/ui/src/MovableGrid/MovableGrid.tsx` |
| `@repo/ui/layoutTree` | `panel`, `split`, `movePanel`, `removePanel`, `insertPanel`, `setRatio`, `layoutRects`, `dropZoneAt` | `packages/ui/src/MovableGrid/layoutTree.ts` |
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
| `@repo/ui/chip` | `Chip` | `selected`, `onPress`, `disabled`, `size`, `leading` | `packages/ui/src/Chip/Chip.tsx` |
| `@repo/ui/toggle` | `Toggle` | `checked`, `onChange`, `disabled`, `label` | `packages/ui/src/Toggle/Toggle.tsx` |
| `@repo/ui/slider` | `Slider` | `label`, `value`, `onChange`, `min`, `max`, `step`, `format`, `showNumberInput` | `packages/ui/src/Slider/Slider.tsx` |
| `@repo/ui/checkbox` | `Checkbox` | `checked`, `onChange`, `indeterminate`, `disabled`, `label`, `size`, `round` | `packages/ui/src/Checkbox/Checkbox.tsx` |
| `@repo/ui/iconButton` | `IconButton` | `icon`, `label`(필수), `variant`, `size`, `round` | `packages/ui/src/IconButton/IconButton.tsx` |
| `@repo/ui/textField` | `TextField` | `value`, `onChange`, `label`, `variant('box'\|'line')`, `error`, `helperText`, `leading`, `trailing` | `packages/ui/src/TextField/TextField.tsx` |
| `@repo/ui/searchField` | `SearchField` | `value`, `onChange`, `onClear`, `onSubmit`, `label`, `placeholder` | `packages/ui/src/SearchField/SearchField.tsx` |
| `@repo/ui/textArea` | `TextArea` | `value`, `onChange`, `label`, `variant('box'\|'line')`, `maxLength`, `autoResize`, `maxHeight`, `error` | `packages/ui/src/TextArea/TextArea.tsx` |
| `@repo/ui/stepper` | `Stepper` | `label`, `value`, `onChange`, `min`, `max`, `step`, `unit`, `helperText`, `hideLabel` | `packages/ui/src/Stepper/Stepper.tsx` |
| `@repo/ui/keypad` | `Keypad` | `value`, `onChange`, `maxLength`, `extraKey('00'\|'.'\|'none')` | `packages/ui/src/Keypad/Keypad.tsx` |
| `@repo/ui/textButton` | `TextButton` | `tone`, `size`, `chevron` | `packages/ui/src/TextButton/TextButton.tsx` |
| `@repo/ui/rating` | `Rating` | `value`, `max`, `onChange`, `size`, `showValue`, `label` | `packages/ui/src/Rating/Rating.tsx` |
| `@repo/ui/agreement` | `Agreement` | `items`, `value`, `onChange`, `allLabel` | `packages/ui/src/Agreement/Agreement.tsx` |

## 데이터 표시

| 공개 경로 | 컴포넌트 | 주요 props | 소스 |
| --- | --- | --- | --- |
| `@repo/ui/card` | `Card` | `padding`, `elevation`, `bordered`, `className` | `packages/ui/src/Card/Card.tsx` |
| `@repo/ui/numberText` | `NumberText` | `value`, `unit`, `signed`, `tone`, `size`, `weight` | `packages/ui/src/NumberText/NumberText.tsx` |
| `@repo/ui/listRow` | `ListRow` | `title`, `caption`, `leading`, `trailingTop`, `trailingBottom`, `onPress`, `chevron`, `divider` | `packages/ui/src/ListRow/ListRow.tsx` |
| `@repo/ui/keyValueList` | `KeyValueList` | `items`, `columns` | `packages/ui/src/KeyValueList/KeyValueList.tsx` |
| `@repo/ui/badge` | `Badge` | `tone`, `size`, `leading` | `packages/ui/src/Badge/Badge.tsx` |
| `@repo/ui/progressBar` | `ProgressBar` | `value`, `tone`, `segments`, `height`, `label` | `packages/ui/src/ProgressBar/ProgressBar.tsx` |
| `@repo/ui/banner` | `Banner` | `tone`, `title`, `icon`, `children` | `packages/ui/src/Banner/Banner.tsx` |
| `@repo/ui/table` | `TableContainer`, `Table`, `TableHeader`, `TableHeaderCell`, `TableBody`, `TableRow`, `TableCell`, `EmptyState`, `ScrollTableContainer` | 테이블 크기, 레이아웃, 정렬, 행, 셀 props | `packages/ui/src/Table/Table.tsx` |
| `@repo/ui/previewChart` | `PreviewChart` | `data`, 크기와 차트 옵션 | `packages/ui/src/PreviewChart/PreviewChart.tsx` |
| `@repo/ui/sparkline` | `Sparkline` | `points`, `tone`, `width`, `height`, `label` | `packages/ui/src/Sparkline/Sparkline.tsx` |
| `@repo/ui/barChart` | `BarChart` | `items`, `label`, `height`, `max`, `showValues`, `format` | `packages/ui/src/BarChart/BarChart.tsx` |
| `@repo/ui/highlight` | `Highlight` | `tone('brand'\|'ai'\|'up'\|'down'\|'neutral')` | `packages/ui/src/Highlight/Highlight.tsx` |
| `@repo/ui/progressStepper` | `ProgressStepper` | `steps`, `current`, `label` | `packages/ui/src/ProgressStepper/ProgressStepper.tsx` |
| `@repo/ui/boardRow` | `BoardRow` | `title`, `excerpt`, `author`, `time`, `commentCount`, `likeCount`, `badge`, `onPress` | `packages/ui/src/BoardRow/BoardRow.tsx` |
| `@repo/ui/image` | `Image` | 기본 image props와 로컬 variant | `packages/ui/src/Image/Image.tsx` |

## 내비게이션과 Shell

| 공개 경로 | 컴포넌트 | 주요 props | 소스 |
| --- | --- | --- | --- |
| `@repo/ui/appBar` | `AppBar` | `title`, `leading`, `onBack`, `logo`, `actions`, `sticky`, `bordered` | `packages/ui/src/AppBar/AppBar.tsx` |
| `@repo/ui/bottomTabBar` | `BottomTabBar` | `items`(최대 5개), `value`, `onChange`, `fixed`, `label` | `packages/ui/src/BottomTabBar/BottomTabBar.tsx` |
| `@repo/ui/bottomCTA` | `BottomCTA` | `layout('single'\|'double')`, `fixed`, `leading`, `children` | `packages/ui/src/BottomCTA/BottomCTA.tsx` |
| `@repo/ui/header` | `Header` | `route`, `children` | `packages/ui/src/Header/Header.tsx` |

## 오버레이와 상태

| 공개 경로 | 컴포넌트 | 주요 props | 소스 |
| --- | --- | --- | --- |
| `@repo/ui/bottomSheet` | `BottomSheet` | `open`, `onClose`, `title`, `grabber`, `label` | `packages/ui/src/BottomSheet/BottomSheet.tsx` |
| `@repo/ui/emptyState` | `EmptyState` | `title`, `description`, `icon`, `action`, `tone` | `packages/ui/src/EmptyState/EmptyState.tsx` |
| `@repo/ui/skeleton` | `Skeleton` | `width`, `height`, `radius`, `lines` | `packages/ui/src/Skeleton/Skeleton.tsx` |
| `@repo/ui/modal` | `Modal` | `open`, `onClose`, `title`, `footer`, `size`, `hideCloseButton`, `disableBackdropClose` | `packages/ui/src/Modal/Modal.tsx` |
| `@repo/ui/dialog` | `Dialog` | `open`, `title`, `description`, `confirmText`, `cancelText`, `tone`, `onConfirm`, `onCancel` | `packages/ui/src/Dialog/Dialog.tsx` |
| `@repo/ui/dialogProvider` | `DialogProvider` | `children` | `packages/ui/src/Dialog/DialogProvider.tsx` |
| `@repo/ui/useDialog` | `useDialog` → `{ alert, confirm }` | `packages/ui/src/Dialog/useDialog.ts` |
| `@repo/ui/tooltip` | `Tooltip` | `content`, `placement`, `children` | `packages/ui/src/Tooltip/Tooltip.tsx` |
| `@repo/ui/menu` | `Menu` | `trigger`(render prop), `items`, `onSelect`, `align`, `label` | `packages/ui/src/Menu/Menu.tsx` |
| `@repo/ui/spinner` | `Spinner` | `size`, `tone`, `label` | `packages/ui/src/Spinner/Spinner.tsx` |
| `@repo/ui/bottomInfo` | `BottomInfo` | `items`, `title` | `packages/ui/src/BottomInfo/BottomInfo.tsx` |
| `@repo/ui/chatBubble` | `ChatBubble` | `role('user'\|'assistant')`, `meta`, `streaming`, `avatar`, `footer` | `packages/ui/src/ChatBubble/ChatBubble.tsx` |
| `@repo/ui/toast` | `Toast` | `tone`, `action`, `children` | `packages/ui/src/Toast/Toast.tsx` |
| `@repo/ui/toastProvider` | `ToastProvider` | `max`, `duration` | `packages/ui/src/Toast/ToastProvider.tsx` |
| `@repo/ui/useToast` | `useToast` → `{ toast, dismiss }` | `packages/ui/src/Toast/useToast.ts` |

`BottomSheet`는 `document.body`로 portal하고 열려 있는 동안 포커스를 가둔다. ESC와 배경 클릭으로 닫히고, 닫으면 포커스가 열기 직전 요소로 돌아간다. 배경 스크롤은 잠긴다.

토스트는 앱 루트를 `ToastProvider`로 감싸고 화면에서 `useToast()`로 띄운다. 전역 store가 아니라 provider 아래 React context다.

```tsx
const { toast } = useToast();
toast({ message: "저장했습니다", tone: "success" });
toast({ message: "닫기 전까지 유지", duration: 0 });
```

## 아이콘

| 공개 경로 | 컴포넌트 | 주요 props | 소스 |
| --- | --- | --- | --- |
| `@repo/ui/assetIcon` | `AssetIcon` | `symbol`, `src`, `size`, `name` | `packages/ui/src/AssetIcon/AssetIcon.tsx` |
| `@repo/ui/icon` | `Icon` | `url`, `variant`, `onClick` | `packages/ui/src/Icon/Icon.tsx` |
| `@repo/ui/serviceicon` | `ServiceIcon` | `variant` | `packages/ui/src/ServiceIcon/ServiceIcon.tsx` |
| `@repo/ui/starIcon` | `StarIcon` | SVG props | `packages/ui/src/StarIcon/StarIcon.tsx` |

## 토큰

| 공개 경로 | API | 소스 |
| --- | --- | --- |
| `@repo/ui/tokens` | `vars` | `packages/ui/src/styles/tokens.css.ts` |

값과 그룹은 `docs/design-system/style-tokens.md`를 본다.

## 겹치는 컴포넌트 고르기

이름이 비슷한 것들이 있다. 아래 기준으로 고른다.

| 상황 | 쓸 것 | 쓰지 않을 것 |
| --- | --- | --- |
| 모바일 화면 상단 바 (제목·뒤로·액션·알림) | `AppBar` | `Header`는 마케팅 페이지용 얇은 헤더다 |
| 밑줄형 탭 + 패널 | `Tabs` | — |
| 회색 트랙 위 알약형 세그먼트 | `FilterTabs` | 단독 칩에는 쓰지 않는다 |
| 자유 배치·복수 선택 칩 | `Chip` | `FilterTabs`는 그룹 전용이다 |
| 종목 로고. 로고가 없으면 이니셜 폴백 | `AssetIcon` | `Icon`·`ServiceIcon`은 고정 자산 목록 전용이다 |
| 그룹과 그룹 사이 위계 | `ListGroup` + `SectionBand` | 카드 남발 (`Card` 기본 그림자는 `none`이다) |
| 큰 세로 여백을 가진 페이지 섹션 | `Section` | `SectionBand`는 8px 구분 밴드다 |
| 그룹 안 항목 사이 선 | `Divider` | `SectionBand`는 그룹과 그룹 사이용이다 |
| 화면 단위 빈 상태·결과 | `@repo/ui/emptyState`의 `EmptyState` | `@repo/ui/table`의 `EmptyState`는 표 안 `<tr><td>` 전용이다. 이름이 같으니 import 경로를 확인한다 |
| 지수 칩용 소형 추세선 | `Sparkline` | `PreviewChart`는 축·툴팁이 있는 캔들 차트다 |
| 켜고 끄는 설정 | `Toggle` (`role="switch"`) | `RadioButton`은 택일용이다 |
| 다중 선택·동의 체크 | `Checkbox` | `RadioButton`으로는 다중 선택을 만들 수 없다 |
| 일반 폼 입력 | `TextField` | `InputField`는 react-hook-form `register`에 묶여 있고 placeholder가 고정 5종뿐이다 |
| 검색창 | `SearchField` (`role="search"`, 지우기 버튼) | `TextField`는 검색 전용 처리가 없다 |
| 아이콘만 있는 버튼 | `IconButton` (`label` 필수) | 앱마다 `<button>`에 아이콘을 직접 넣지 않는다 |
| 화면 하단 주요 행동 | `BottomCTA` | `BottomTabBar`는 화면 이동용이다. 둘을 같이 쓰면 CTA를 탭바 위에 올린다 |
| 확인 한 번 받기 | `Dialog` / `useDialog` | 여러 항목을 담아야 하면 `Modal`이나 `BottomSheet` |
| 가운데 뜨는 오버레이 | `Modal` | 모바일에서 아래에서 올라오는 게 맞으면 `BottomSheet` |
| 처리 중 표시 | `Spinner` 또는 `Button loading` | `Skeleton`은 자리를 미리 잡아야 하는 목록·카드용이다 |
| 수량 ± 조절 | `Stepper` | `Slider`는 범위에서 고르는 값이다 |
| 금액 큰 입력 | `TextField variant="hero"` + `Keypad` | 일반 폼은 `variant="box"` |
| 여러 줄 입력 | `TextArea` | 채팅 입력은 `autoResize` |
| 짧은 액션 목록 | `Menu` | 항목이 많거나 모바일이면 `BottomSheet` |
| 지표·용어 설명 | `Tooltip` | 지금 읽어야 하는 경고는 `Banner`, 화면 아래 면책은 `BottomInfo` |
| 코치 대화 한 마디 | `ChatBubble` | 감싸는 목록에 `role="log"`을 준다 |
| 막대 비교 | `BarChart` | 캔들은 `PreviewChart`, 칩 추세선은 `Sparkline` |
| PC에서 여러 패널 동시 보기 | `MovableGrid` | 탭으로 나누지 않는다 |

## 훅

| 공개 경로 | API | 소스 |
| --- | --- | --- |
| `@repo/ui/useThrottle` | `useThrottle` | `packages/ui/src/Utils/hooks/useThrottle.tsx` |
| `@repo/ui/useDebounce` | `useDebounce` | `packages/ui/src/Utils/hooks/useDebounce.tsx` |
| `@repo/ui/useBottomSheet` | `useBottomSheet` → `{ open, onOpen, onClose, toggle, sheetProps }` | `packages/ui/src/Utils/hooks/useBottomSheet.tsx` |
| `@repo/ui/useFocusTrap` | `useFocusTrap(ref, active, { onEscape })` | `packages/ui/src/Utils/hooks/useFocusTrap.tsx` |
| `@repo/ui/useScrollLock` | `useScrollLock(locked)` | `packages/ui/src/Utils/hooks/useScrollLock.tsx` |

`BottomSheet`·`Modal`·`Dialog`는 모두 `useFocusTrap` + `useScrollLock`을 쓴다. 새 오버레이를 만들면 focus trap을 다시 구현하지 말고 이 훅을 쓴다.

## Storybook 커버리지

대부분의 재사용 UI에는 Storybook story가 있다: `Agreement`, `AppBar`, `AssetIcon`, `Badge`, `Banner`, `BarChart`, `BoardRow`, `BottomCTA`, `BottomInfo`, `BottomSheet`, `BottomTabBar`, `Button`, `Card`, `ChatBubble`, `Checkbox`, `Chip`, `Container`, `Dialog`, `Divider`, `EmptyState`, `FilterTabs`, `FlexBox`, `Grid`, `Heading`, `Highlight`, `IconButton`, `Image`, `Keypad`, `KeyValueList`, `ListFooter`, `ListGroup`, `ListRow`, `Margin`, `Menu`, `Modal`, `MovableGrid`, `NumberText`, `Padding`, `PreviewChart`, `ProgressBar`, `ProgressStepper`, `Rating`, `Root`, `ScrollContainer`, `SearchField`, `Section`, `SectionBand`, `Skeleton`, `Slider`, `Sparkline`, `Spinner`, `Stepper`, `Table`, `Tabs`, `Text`, `TextArea`, `TextButton`, `TextField`, `Toast`, `Toggle`, `Tooltip`.

story가 없는 것: `Header`, `Icon`, `InputField`, `RadioButton`, `ServiceIcon`, `ServiceWrapper`, `StarIcon`, `Wrapper`. 이 중 `Header`·`InputField`·`RadioButton`은 각각 `AppBar`·`TextField`·`Checkbox`/`Toggle`로 대체 가능하다.

Storybook 작성은 `packages/ui/.claude/rules/storybook.md`를 따른다.

## 규칙

- 앱 로컬 기본 컴포넌트를 만들기 전에 이 컴포넌트를 먼저 사용한다.
- 서비스별 문구, 데이터 요청, 라우팅 부수 효과, 앱 store 접근은 `packages/ui`에 넣지 않는다.
- 재사용 컴포넌트나 의미 있는 variant를 추가하면 Storybook story를 함께 추가한다.
- 의미 기반 props와 제한된 variant를 사용한다. 공유 컴포넌트에 열린 일회성 props를 추가하지 않는다.
- 두 개 이상 앱에서 같은 컴포넌트가 반복되면 명시적인 공개 subpath와 함께 `packages/ui`로 승격한다.
