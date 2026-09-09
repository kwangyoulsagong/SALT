---
id: FE-REQ-006
title: "@repo/ui 2차 확장 — 주문·대화·오버레이·이동식 격자"
priority: high
labels: [design-system, component, a11y, ui, layout]
created: 2026-09-09
updated: 2026-09-09
---

## Summary

FE-REQ-005로 컴포넌트 25종을 채웠지만 **주문 화면과 코치 대화 화면을 아직 만들 수 없다.** 수량을 올리고 내릴 컨트롤, 금액을 넣을 큰 입력칸, 확인을 받을 대화 상자, 처리 중 표시가 전부 없다. 코치가 제품의 핵심인데 대화 화면을 조립할 말풍선도 없다.

이 요구사항은 그 갭을 메우고, PC 화면의 정보 밀도를 **탭이 아니라 이동식 격자**로 해결한다.

범위는 `salt-microFe/packages/ui/**`와 `salt-microFe/docs/design-system/**`이다. `apps/**`, `bff/**`, `salt-server/**`는 변경하지 않는다.

## 제품 방향 (사용자 결정, 2026-09-09)

| 결정 | 내용 | 디자인 시스템에 주는 요구 |
|---|---|---|
| **탭을 줄인다** | 탭이 많은 정보 구조는 쓰지 않는다. 지금 스토리보드는 하단 5탭 + 화면 내부 세그먼트 여러 겹이다 | PC는 `MovableGrid`로 여러 패널을 동시에 본다. 탭으로 나누던 것을 한 화면에 놓는다 |
| **대화가 핵심이다** | 코치와 자연어로 주고받는 것이 이 제품의 중심이다 | `ChatBubble` + `TextArea autoResize` + `Chip`(추천 질문) + `Spinner`가 대화 화면의 기본 문법이다 |
| **직관적일 것** | 화면을 읽고 바로 무엇을 할지 알 수 있어야 한다 | 확인은 `Dialog`, 처리 중은 `Button loading`, 결과는 `Toast`로 일관되게 처리한다 |

> 하단 탭 개수 축소와 화면 재배치는 **기획 변경**이므로 `pm/storyboard/**`와 `pm/requirements/**`에서 별도로 다룬다. 이 REQ는 그것을 가능하게 하는 컴포넌트만 만든다.

## Requirements

### A. 주문 화면 (없으면 화면이 안 나오는 것)

| ID | 컴포넌트 | 요구사항 | 우선순위 |
|---|---|---|---|
| FR-1 | `Spinner` | `size` · `tone` · `label`. `prefers-reduced-motion`에서 멈추지 않고 느려진다(로딩은 필수 피드백) | Must |
| FR-2 | `Button`의 `loading` | 누를 수 없게 막고 `aria-busy`. 흐려지지 않는다(`disabled` 투명도 무효화) | Must |
| FR-3 | `Stepper` | `label` · `value` · `onChange` · `min`/`max`/`step` · `unit` · `helperText`. ± 버튼 + 직접 입력. 경계에서 해당 버튼 비활성 | Must |
| FR-4 | `Keypad` | `value` · `onChange` · `maxLength` · `extraKey('00'\|'.'\|'none')`. 맨 앞 0 처리와 소수점 중복을 막는다 | Must |
| FR-5 | `TextField`의 `big`·`hero` | `hero`는 t1(30px) 굵게 + tabular. 화면 전체가 입력 하나일 때 | Must |
| FR-6 | `Dialog` + `DialogProvider` + `useDialog` | `alert`는 `Promise<void>`, `confirm`은 `Promise<boolean>`. `tone('danger')`. confirm은 배경 클릭으로 닫히지 않는다 | Must |

### B. 코치 대화 화면

| ID | 컴포넌트 | 요구사항 | 우선순위 |
|---|---|---|---|
| FR-10 | `ChatBubble` | `role('user'\|'assistant')` · `meta` · `streaming` · `avatar` · `footer`. `streaming`이고 내용이 비면 점 세 개. 감싸는 쪽에 `role="log"`을 두도록 문서화 | Must |
| FR-11 | `TextArea` | `box`/`line` · `maxLength` 카운터 · `autoResize`(+`maxHeight`) · `error`/`helperText`. 카운터 초과는 표시만 하고 입력은 막지 않는다 | Must |
| FR-12 | `Highlight` | `mark` 기반. `tone('brand'\|'ai'\|'up'\|'down'\|'neutral')`. 근거 문장의 수치 강조와 검색어 일치에 쓴다 | Must |
| FR-13 | `Rating` | 읽기 전용은 `role="img"`, `onChange`를 주면 `radiogroup`. 색만으로 전달하지 않도록 숫자 병기 옵션 | Should |

### C. 오버레이와 안내

| ID | 컴포넌트 | 요구사항 | 우선순위 |
|---|---|---|---|
| FR-20 | `Modal` | 가운데 오버레이. `size` · `footer` · `hideCloseButton` · `disableBackdropClose`. focus trap · ESC · 스크롤 락 · 포커스 복원 | Must |
| FR-21 | `Tooltip` | hover와 focus 둘 다에서 열리고 ESC로 닫힌다. `placement` 4방향. `aria-describedby` 연결 | Must |
| FR-22 | `Menu` | `role="menu"`. ↑↓ Home End 이동(비활성 건너뜀), ESC·바깥 클릭으로 닫힘. 트리거는 render prop으로 받아 aria가 실제 버튼에 붙게 한다 | Must |
| FR-23 | `BottomInfo` | 화면 맨 아래 작은 안내·면책 묶음. 지금 읽어야 하는 경고는 `Banner` | Should |
| FR-24 | `TextButton` | 배경 없는 텍스트 버튼. `tone` · `size` · `chevron` | Should |
| FR-25 | `ListFooter` | `ListGroup` 마지막 줄. `caption` + 액션 슬롯 | Should |
| FR-26 | `Agreement` | `Checkbox` 조합. 전체 선택이 하위 상태에 따라 indeterminate | Should |
| FR-27 | `BoardRow` | 커뮤니티 글 행. 제목 1줄 · 본문 2줄 clamp · 댓글/좋아요 수 | Should |
| FR-28 | `BarChart` | 막대 비교. 항목별 `tone`. 스크린 리더용 `<table>` 병기 | Should |
| FR-29 | `ProgressStepper` | 순서 있는 절차의 현재 위치. `aria-current="step"` | Should |

### D. 이동식 격자 (탭 대체)

| ID | 항목 | 요구사항 | 우선순위 |
|---|---|---|---|
| FR-40 | `layoutTree` | 화면을 겹침·빈틈 없이 나누는 **이진 트리**. 잎은 `panel`, 가지는 `split{orientation,ratio}`. 순수 함수 모듈로 분리 | Must |
| FR-41 | 트리 연산 | `removePanel`(가지 접힘) · `insertPanel` · `movePanel` · `setRatio`(0.08~0.92 클램프) · `layoutRects` · `dropZoneAt` · `panelAt` · `dropIndicatorRect` | Must |
| FR-42 | 드롭 방향 판정 | 목표 칸을 두 대각선으로 넷으로 자르고 커서가 속한 삼각형이 붙일 방향 | Must |
| FR-43 | `MovableGrid` | 머리말을 끌어 칸 이동, 구분선을 끌어 크기 조절. 구분선은 `role="separator"` + 화살표 키 조절 | Must |
| FR-44 | 단위 테스트 | 트리 연산을 vitest `unit` 프로젝트로 검증. 빈틈·겹침 없음, 접힘, 클램프, 드롭 구역 | Must |

## 비기능 요구사항

| 구분 | 요구사항 |
|---|---|
| 성능 | Vanilla Extract 정적 추출 유지. 애니메이션은 `transform`/`opacity`만. `MovableGrid`는 컨테이너 크기를 `ResizeObserver`로 한 번만 관측하고 좌표 계산은 순수 함수 |
| 접근성 | `.claude/rules/a11y-policy.md` 준수. 오버레이 3종(`BottomSheet`·`Modal`·`Dialog`)은 공용 `useFocusTrap`/`useScrollLock`을 쓴다. `Menu`는 `role="menu"`, `Tooltip`은 focus에서도 열림, `BarChart`는 표 병기, 아이콘 전용 버튼은 `label` 필수 |
| SSR | `createPortal`은 `usePortal`(마운트 후 `true`)로 감싼다. 렌더 중 browser API 접근 금지 |
| 호환성 | 기존 공개 subpath를 깨지 않는다. `Button`의 `loading`과 `TextField`의 `big`/`hero`는 기본값이 기존 동작과 같다 |
| 반응형 | 폭 320px에서 깨지지 않아야 한다. `MovableGrid`는 PC 전용으로 본다 |
| 문서 | 신규 컴포넌트 전부 Storybook story. `docs/design-system/component-index.md` 갱신 |

## 수용 기준

- [x] `Spinner`가 `prefers-reduced-motion`에서 멈추지 않고 느려진다.
- [x] `Button loading`이 `aria-busy`를 주고 흐려지지 않는다.
- [x] `Stepper`가 경계에서 해당 방향 버튼만 비활성화한다.
- [x] `Keypad`가 맨 앞 0과 소수점 중복을 막는다.
- [x] `TextField`에 `big`·`hero`가 있고 `hero`는 t1 크기다.
- [x] `useDialog().confirm`이 `Promise<boolean>`을 돌려주고 취소·ESC에서 `false`다.
- [x] `Modal`·`Dialog`·`BottomSheet`가 같은 `useFocusTrap`/`useScrollLock`을 쓴다.
- [x] `Tooltip`이 hover와 keyboard focus 둘 다에서 열리고 ESC로 닫힌다.
- [x] `Menu`가 `role="menu"`이고 화살표 키로 비활성 항목을 건너뛴다.
- [x] `ChatBubble`이 `streaming`일 때 점 세 개를 보여주고 `reduced-motion`에서 멈춘다.
- [x] `TextArea autoResize`가 내용이 줄어들 때도 높이를 줄인다.
- [x] `BarChart`가 스크린 리더용 `<table>`을 함께 낸다.
- [x] `layoutTree`가 빈틈·겹침 없이 좌표를 만든다(단위 테스트).
- [x] 칸을 지우면 가지가 남은 쪽으로 접힌다(단위 테스트).
- [x] 칸이 2개일 때 이동하면 자리가 바뀌고, 방향을 바꾸면 `orientation`도 바뀐다(단위 테스트).
- [x] 구분선이 `role="separator"`이고 화살표 키로 조절된다.
- [x] `pnpm --filter @repo/ui lint` · `check-types` · `test` · `build-storybook` · 루트 `pnpm build` 전부 통과.
- [ ] 폭 320px 브라우저 확인 — 각 컴포넌트에 `Narrow` story는 있으나 실제 확인은 미실시.
- [ ] `MovableGrid` 드래그 이동의 키보드 대체 수단 — 현재 포인터 전용. 앱에서 `movePanel`을 메뉴로 노출해야 한다.

## 남은 결정

- **번들 예산.** FE-REQ-005의 NFR은 "증가분 gzip 12KB 이하"였다. 신규 44종을 전부 합치면 **18.18KB**(JS 12.73 + CSS 5.37)로 초과한다. 다만 공개 경로가 컴포넌트별 subpath이고 `sideEffects`가 `**/*.css.ts`로 한정되어 있어 **앱은 import한 것만 가져간다.** 예산을 "앱별 실사용 증가분" 기준으로 다시 쓸지 결정이 필요하다.
- **`MovableGrid` 배치.** 현재 `packages/ui`에 있다. 쓰는 곳이 PC 한 화면뿐이면 앱 로컬이 규칙에 맞다. 두 번째 사용처가 생길 때까지 지켜본다.
- **탭 축소의 구체안.** 하단 5탭(`홈`/`코치`/`청구서`/`세금`/`포트폴리오`)을 몇 개로 줄일지, 줄인 것을 코치 대화 안으로 넣을지는 기획 결정이다.

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-09-09 | 초안 + 구현 완료. A(6) · B(4) · C(10) · D(4) 전부. 신규 컴포넌트 19종 + 훅 5종 + 순수 모듈 1종, 기존 2종(`Button`·`TextField`) 확장. `Button/button.tsx` → `Button.tsx` 파일명 대소문자 정정(exports 맵과 어긋나 케이스 구분 파일시스템에서 깨지는 상태였다). vitest `unit` 프로젝트와 `test` 스크립트 신설, `layoutTree` 테스트 17개 |
| 2026-09-09 | 마무리 점검. 죽은 export `"./styles"` 제거 — `./src/Button/styles/index.css.ts`를 가리키는데 그 파일이 없었고 레포 전체에서 `@repo/ui/styles`를 import하는 곳도 없었다. 공개 subpath 84 → 83 |

## Status

- done. 검증 완료 — 루트 `pnpm lint`·`pnpm build`(3/3), `@repo/ui` `lint`/`check-types`/`test`(17/17)/`build-storybook` 통과.
- 체크리스트: `requirements/reports/checklists/FE-REQ-006.md`
- 회고: `requirements/reports/retrospects/FE-REQ-006.md`
- **부분 미충족을 안고 done으로 옮긴다.** `MovableGrid` 칸 이동이 포인터 전용(크기 조절은 키보드 가능), 320px 브라우저 확인 미실시, 번들 예산 NFR 재작성 필요, `Tooltip` 좁은 스크롤 컨테이너에서 잘림. 후속 항목은 회고의 Action Items에 있다.
- 본 spec은 `requirements/specs/done/`에 위치한다.
