---
id: FE-REQ-006
spec: ../../specs/done/FE-REQ-006.md
title: "@repo/ui 2차 확장(주문·대화·오버레이·이동식 격자) 체크리스트"
validated: 2026-09-09
---

# FE-REQ-006 체크리스트

## A. 주문 화면

| # | 요구사항 | 구현 위치 | 공개 경로 | 상태 |
|---|---|---|---|---|
| FR-1 | `Spinner` — reduced-motion에서 멈추지 않고 느려진다 | `src/Spinner/styles/spinner.css.ts` (`animationDuration: 2s`) | `@repo/ui/spinner` | ✅ |
| FR-2 | `Button`의 `loading` — `aria-busy`, 흐려지지 않음 | `src/Button/Button.tsx`, `styles/button.css.ts` (`loading` variant가 `&:disabled` opacity를 1로) | `@repo/ui/button` | ✅ |
| FR-3 | `Stepper` — ± 버튼 + 직접 입력, 경계에서 해당 버튼 비활성 | `src/Stepper/Stepper.tsx` (`disabled={disabled \|\| value <= min}`) | `@repo/ui/stepper` | ✅ |
| FR-4 | `Keypad` — 맨 앞 0, 소수점 중복 차단 | `src/Keypad/Keypad.tsx` (`append`) | `@repo/ui/keypad` | ✅ |
| FR-5 | `TextField`의 `big`·`hero` | `src/TextField/styles/textField.css.ts` (`fieldStyles`, `inputSizeStyles`) | `@repo/ui/textField` | ✅ |
| FR-6 | `Dialog` + `DialogProvider` + `useDialog` | `src/Dialog/` 4파일 | `@repo/ui/dialog`, `/dialogProvider`, `/useDialog` | ✅ |

`useDialog().confirm()`은 `Promise<boolean>`을 돌려주고 `alert()`는 `Promise<void>`다. `resolveRef`로 열림 1건만 유지한다. confirm은 `disableBackdropClose`로 배경 클릭을 막는다.

## B. 코치 대화

| # | 요구사항 | 구현 위치 | 공개 경로 | 상태 |
|---|---|---|---|---|
| FR-10 | `ChatBubble` — `streaming`이고 내용 비면 점 세 개 | `src/ChatBubble/ChatBubble.tsx` (`showTyping`) | `@repo/ui/chatBubble` | ✅ |
| FR-11 | `TextArea` — `autoResize`, `maxLength` 카운터 | `src/TextArea/TextArea.tsx` | `@repo/ui/textArea` | ✅ |
| FR-12 | `Highlight` — `mark` 기반 5 tone | `src/Highlight/Highlight.tsx` | `@repo/ui/highlight` | ✅ |
| FR-13 | `Rating` — 읽기 전용 `role="img"`, 입력 시 `radiogroup` | `src/Rating/Rating.tsx` | `@repo/ui/rating` | ✅ |

`ChatBubble`을 감싸는 목록에 `role="log"` + `aria-live="polite"`를 주도록 JSDoc과 `Conversation` story에 명시했다. 컴포넌트가 강제하지는 않는다.

## C. 오버레이와 안내

| # | 컴포넌트 | 구현 위치 | 공개 경로 | 상태 |
|---|---|---|---|---|
| FR-20 | `Modal` | `src/Modal/` | `@repo/ui/modal` | ✅ |
| FR-21 | `Tooltip` (hover + focus, ESC) | `src/Tooltip/` | `@repo/ui/tooltip` | ✅ |
| FR-22 | `Menu` (`role="menu"`, 화살표/Home/End) | `src/Menu/` | `@repo/ui/menu` | ✅ |
| FR-23 | `BottomInfo` | `src/BottomInfo/` | `@repo/ui/bottomInfo` | ✅ |
| FR-24 | `TextButton` | `src/TextButton/` | `@repo/ui/textButton` | ✅ |
| FR-25 | `ListFooter` | `src/ListFooter/` | `@repo/ui/listFooter` | ✅ |
| FR-26 | `Agreement` | `src/Agreement/` | `@repo/ui/agreement` | ✅ |
| FR-27 | `BoardRow` | `src/BoardRow/` | `@repo/ui/boardRow` | ✅ |
| FR-28 | `BarChart` (스크린 리더용 `table` 병기) | `src/BarChart/` | `@repo/ui/barChart` | ✅ |
| FR-29 | `ProgressStepper` (`aria-current="step"`) | `src/ProgressStepper/` | `@repo/ui/progressStepper` | ✅ |

`Menu`의 트리거는 render prop이다. `span`으로 감싸면 `aria-haspopup`/`aria-expanded`가 실제 버튼이 아닌 요소에 붙어 어긋나므로, 넘겨준 props를 소비자가 자기 버튼에 펼치게 했다.

## D. 이동식 격자

| # | 요구사항 | 구현 위치 | 상태 |
|---|---|---|---|
| FR-40 | 이진 트리 자료구조 (`panel` 잎 / `split{orientation,ratio}` 가지) | `src/MovableGrid/layoutTree.ts` | ✅ |
| FR-41 | `removePanel`(접힘) · `insertPanel` · `movePanel` · `setRatio`(0.08~0.92) · `layoutRects` · `dropZoneAt` · `panelAt` · `dropIndicatorRect` | 같은 파일 | ✅ |
| FR-42 | 두 대각선으로 넷으로 자른 삼각형 구역 판정 | 같은 파일 `dropZoneAt` | ✅ |
| FR-43 | `MovableGrid` — 머리말 드래그 이동, 구분선 드래그·화살표 키 조절 | `src/MovableGrid/MovableGrid.tsx` | ✅ (이동은 포인터 전용) |
| FR-44 | 트리 연산 단위 테스트 | `src/MovableGrid/layoutTree.test.ts` (17개), `vitest.config.ts` `unit` 프로젝트, `package.json` `test` 스크립트 | ✅ |

공개 경로: `@repo/ui/movableGrid`, `@repo/ui/layoutTree`.

## 공용 훅

| 항목 | 구현 위치 | 공개 경로 | 상태 |
|---|---|---|---|
| `useFocusTrap(ref, active, { onEscape })` | `src/Utils/hooks/useFocusTrap.tsx` | `@repo/ui/useFocusTrap` | ✅ |
| `useScrollLock(locked)` | `src/Utils/hooks/useScrollLock.tsx` | `@repo/ui/useScrollLock` | ✅ |
| `usePortal()` | `src/Utils/hooks/usePortal.tsx` | 내부 전용 | ✅ |
| `useBottomSheet(defaultOpen)` | `src/Utils/hooks/useBottomSheet.tsx` | `@repo/ui/useBottomSheet` | ✅ |

`BottomSheet`·`Modal`·`Dialog`가 모두 `useFocusTrap` + `useScrollLock`을 쓴다. `BottomSheet`는 자체 구현을 이 훅으로 교체했다.

## 같이 고친 것

| 항목 | 내용 | 파일 |
|---|---|---|
| 파일명 대소문자 | `Button/button.tsx` → `Button.tsx`. exports 맵이 `./src/Button/Button.tsx`를 가리켜 케이스 구분 파일시스템에서는 해석 실패하는 상태였다. macOS에서만 우연히 동작 | `src/Button/Button.tsx` |
| 죽은 export 제거 | `"./styles"`가 존재하지 않는 `./src/Button/styles/index.css.ts`를 가리켰고 레포 어디서도 `@repo/ui/styles`를 import하지 않았다 | `package.json` |

## 검증 결과

| Check | Status | Details |
|---|---|---|
| Lint | pass | 루트 `pnpm lint`, `@repo/ui lint --max-warnings 0` |
| Type | pass | `@repo/ui check-types` |
| Unit Test | pass | `@repo/ui test` — `layoutTree` 17/17 |
| Build | pass | 루트 `pnpm build` 3/3, 앱 개별 빌드 3/3 |
| Storybook | pass | `build-storybook` |
| MFE Boundary | pass | `packages/ui` → `apps/*` import 0건 |
| SSR Safety | pass | `createPortal(document.body)` 3곳(`BottomSheet`·`Modal`·`ToastProvider`) 전부 마운트 가드 뒤. `MovableGrid`의 `ResizeObserver`, `Menu`의 `document.addEventListener`는 `useEffect` 안 |
| Remote Loading | 변경 없음 | 커밋에 `apps/**` 0개 |
| Shared Dependencies | 변경 없음 | `next.config.js` 미변경 |
| Event Bus Registry | 변경 없음 | `packages/message-event-bus` 0개 |
| 번들 | 초과 | 신규 44종 전체 gzip 18.18KB (JS 12.73 + CSS 5.37). FE-REQ-005 NFR의 12KB 기준 초과 |

## 미충족 항목

| 항목 | 사유 |
|---|---|
| `MovableGrid` 칸 이동의 키보드 대체 수단 | 현재 포인터 전용. 크기 조절은 `role="separator"` + 화살표 키로 가능. 앱에서 `movePanel`을 메뉴로 노출해야 채워진다 |
| 320px 폭 브라우저 확인 | `Narrow` story는 있으나 실제 확인 미실시 |
| 번들 예산 | 위 표 참조. subpath별 tree-shaking이라 앱은 import한 것만 가져가지만, NFR 문구를 "앱별 실사용 증가분"으로 다시 써야 한다 |
| `Tooltip` 잘림 | 감싸는 `span` 기준 `position: absolute`라 좁은 스크롤 컨테이너 안에서는 말풍선이 잘릴 수 있다. JSDoc에 명시하고 `placement`로 회피하도록 했다 |
