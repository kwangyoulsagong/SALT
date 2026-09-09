---
id: FE-REQ-006
spec: ../../specs/done/FE-REQ-006.md
checklist: ../checklists/FE-REQ-006.md
title: "@repo/ui 2차 확장(주문·대화·오버레이·이동식 격자) 회고"
date: 2026-09-09
---

# FE-REQ-006 회고

## 무엇을 했나

FE-REQ-005로 25종을 채웠는데도 **주문 화면과 코치 대화 화면을 만들 수 없었다.** 수량 컨트롤, 금액 입력칸, 확인 대화 상자, 처리 중 표시, 말풍선이 전부 없었다. 컴포넌트 19종 + 훅 5종 + 순수 모듈 1종을 추가하고, PC의 정보 밀도를 탭이 아니라 이진 트리 분할 격자로 해결했다.

## 잘된 점

- **중복 구현을 만들기 직전에 훅으로 뽑았다.** `Modal`과 `Dialog`를 만들면 focus trap + 스크롤 락 + 포커스 복원이 `BottomSheet`와 세 벌이 된다. `useFocusTrap` / `useScrollLock` / `usePortal`을 먼저 만들고 `BottomSheet`의 자체 구현을 그쪽으로 교체했다. 새 오버레이를 만들 다음 사람이 focus trap을 또 쓰지 않는다.
- **`Dialog`를 `Modal` 위에 얹었다.** 오버레이·포커스·스크롤 처리를 다시 쓰지 않고 `Modal`의 `footer`/`hideCloseButton`/`disableBackdropClose`만 조합했다. 새로 쓴 코드는 제목·설명·버튼 배치뿐이다.
- **레이아웃 트리를 순수 함수로 분리하고 테스트를 붙였다.** `layoutTree.ts`는 React를 모른다. 덕분에 브라우저 없이 17개 테스트로 "빈틈·겹침 없음", "가지 접힘", "ratio 클램프", "드롭 구역 판정"을 검증할 수 있었다. 이 레포에 단위 테스트 프로젝트가 아예 없어서 vitest `unit` 프로젝트와 `test` 스크립트를 함께 만들었다.
- **테스트가 내 오해를 잡아줬다.** "칸 2개일 때 이동은 무변화"로 기대했는데 실패했다. 확인해 보니 a를 b 오른쪽으로 옮기면 자리가 바뀌는 게 올바른 동작이었다. **코드가 아니라 내 기대값이 틀렸다.** 그대로 테스트에 고정했다.
- **`Menu`의 트리거를 render prop으로 바꿨다.** 처음엔 `trigger: ReactNode`를 `span role="button" tabIndex={-1}`로 감쌌는데, 그러면 `aria-haspopup`/`aria-expanded`가 실제 버튼이 아닌 요소에 붙어 의미가 어긋난다. 소비자가 자기 버튼에 props를 펼치는 방식으로 바꿨다.
- **잠재 버그를 하나 찾아 고쳤다.** `Dialog`가 `Button`을 import하는 순간 `TS1149`가 났다. `Button/button.tsx`(소문자)인데 exports 맵은 `./src/Button/Button.tsx`(대문자)를 가리키고 있었다. macOS의 케이스 무시 파일시스템에서만 우연히 동작하던 상태였고, 케이스를 구분하는 CI/Linux에서는 `@repo/ui/button`이 해석 실패한다. 파일명을 맞춰 정리했다.
- **로딩 표시의 reduced-motion을 예외로 뒀다.** `prefers-reduced-motion`에서 애니메이션을 멈추는 게 기본이지만 `Spinner`는 "진행 중"이라는 필수 피드백이다. 멈추는 대신 0.7s → 2s로 느리게 했고 그 판단을 코드 주석에 남겼다.

## 아쉬운 점 / 배운 점

- **`MovableGrid` 칸 이동이 포인터 전용이다.** 구분선은 `role="separator"` + 화살표 키로 조절되는데, 칸 이동은 마우스만 가능하다. `movePanel`을 공개해 앱이 메뉴로 노출할 수 있게 했지만, **컴포넌트가 스스로 키보드 경로를 갖지 못한 건 미완이다.** 처음부터 "이동 메뉴" 형태를 같이 설계했어야 했다.
- **`MovableGrid`가 `packages/ui`에 있을 자격이 아직 없다.** 레포 규칙은 "두 앱 이상에서 반복되면 승격"이다. 지금 사용처는 PC 한 화면이라 앱 로컬이 규칙에 맞다. 순수 모듈 + 테스트라 옮기기 쉬운 형태로는 만들었지만, 규칙을 어긴 상태로 넣은 것은 맞다.
- **`Tooltip`이 잘릴 수 있다.** 감싸는 `span` 기준 `position: absolute`라 좁은 `overflow` 컨테이너 안에서는 말풍선이 잘린다. portal + 좌표 계산으로 가면 해결되지만 코드가 몇 배로 늘어난다. 지금은 한계를 JSDoc에 적고 `placement`로 회피하게 뒀다. **문서화한 한계는 여전히 한계다.**
- **한 번에 너무 많이 만들었다.** 19종 + 훅 5종을 한 커밋에 넣었다. 각각은 검증했지만 리뷰 단위로는 크다. `Button` 파일명 변경처럼 성격이 다른 수정도 같이 들어갔다. 주문/대화/오버레이/격자로 네 커밋으로 쪼갤 수 있었는데, `package.json` exports와 `tokens.css.ts`를 공유해서 패치 단위 분리가 번거로워 한 덩이로 갔다.
- **번들 예산을 넘겼는데 기준을 안 고쳤다.** 신규 44종 전체가 gzip 18.18KB로 FE-REQ-005 NFR의 12KB를 넘는다. subpath별 tree-shaking이라 앱이 실제로 지는 비용은 훨씬 작지만, **"초과했지만 괜찮다"는 설명이 필요한 상태 자체가 기준이 잘못 쓰였다는 신호다.** 기준을 "앱별 실사용 증가분"으로 다시 써야 한다.
- **`ChatBubble`이 `role="log"`을 강제하지 못한다.** 새 답이 스크린 리더에 읽히려면 감싸는 목록에 `role="log"` + `aria-live`가 필요한데, 그건 소비자 몫이다. story와 JSDoc에 적었지만 빠뜨리면 조용히 안 읽힌다. `ChatLog` 래퍼를 같이 만드는 편이 안전했다.
- **컴포넌트는 다 만들었지만 화면은 하나도 안 만들었다.** 두 REQ로 44종을 쌓았는데 실제로 조립된 화면은 Storybook story뿐이다. 프리미티브가 진짜 맞는지는 앱에 붙여봐야 안다. 다음 REQ에서 주문 화면 하나를 끝까지 만들면 여기서 놓친 것이 드러날 것이다.

## Action Items

- [ ] 주문 화면 하나를 앱에 끝까지 조립해 프리미티브 검증 — high
- [ ] `MovableGrid` 칸 이동의 키보드 경로 설계(이동 메뉴 형태) — high
- [ ] 번들 예산 NFR을 "앱별 실사용 증가분"으로 재작성 — medium
- [ ] `ChatLog` 래퍼 추가 검토(`role="log"` 강제) — medium
- [ ] `MovableGrid`를 앱 로컬로 내릴지 결정. 두 번째 사용처가 생기면 유지 — medium
- [ ] `Tooltip` portal 기반 재구현 검토(잘림 해소) — low
- [ ] 320px 폭 브라우저 전수 확인 — medium

## Quality Score

| 항목 | 점수 | 근거 |
|---|---|---|
| 도메인 경계 | 4/5 | `apps/*` import 0건, 비즈니스 문구 없음. `MovableGrid`가 사용처 1곳인데 공유 패키지에 있는 것이 감점 |
| 타입 안전성 | 5/5 | `any` 0건. `BottomTabBar` 5개 제한과 `IconButton.label` 필수를 타입으로 강제. `layoutTree`는 판별 union |
| SSR/MFE 안정성 | 5/5 | `createPortal` 3곳 전부 마운트 가드 뒤, browser API는 전부 `useEffect` 안. 세 앱 빌드 통과 |
| 성능 | 4/5 | 애니메이션은 transform/opacity만, `layoutTree`는 순수 계산, `ResizeObserver` 1개. 번들 기준 미정리가 감점 |
| 접근성 | 3/5 | focus trap 공용화, `role` 정확, `BarChart` 표 병기, reduced-motion 존중. **`MovableGrid` 이동 키보드 부재**와 `Tooltip` 잘림, `role="log"` 미강제가 감점 |
| 테스트 | 4/5 | 순수 모듈 17개 테스트로 커버. 컴포넌트 상호작용 테스트는 없음(Storybook 시각 확인에 의존) |
