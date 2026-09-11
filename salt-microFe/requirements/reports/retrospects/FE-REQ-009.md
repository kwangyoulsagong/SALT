# FE-REQ-009 회고 — FSD 전환

작성: 2026-09-11
체크리스트: `requirements/reports/checklists/FE-REQ-009.md`

## 1. 이 REQ가 실제로 한 일

파일을 옮긴 것이 아니라 **규칙을 실행 가능하게 만든 것**이 본체다.

`salt-microFe/CLAUDE.md`에는 이관 전에도 규칙이 적혀 있었다 — "앱끼리 직접 import하지 않는다",
"단일 앱에서만 쓰는 코드는 앱 내부에 둔다". 지켜졌는지 아무도 몰랐다. **강제 수단이 없었기
때문이다.** 이 REQ 이후로는 `layer-check` 훅이 쓰기를 막고 `@repo/fsd/layers`가 CI를 막는다.

폴더 이동은 그 규칙이 판정할 수 있는 모양을 만드는 작업이었다.

## 2. 규칙이 설계를 고친 순간

lint를 켜자마자 `app/layout.tsx`가 걸렸다 — `@/shared/ui`에서 `Layout`을 가져오고 있었고,
FR-25는 라우팅 파일이 `@/pages`·`@/app`만 보게 한다.

처음 반응은 "레이아웃은 예외로 두자"였다. **그게 틀렸다.** 규칙이 가리킨 것은 실제 문제였다 —
앱 껍데기가 `shared`에 있으면 "shared는 도메인 무관한 재사용 코드"라는 정의가 흐려진다.
`AppShell`을 `app/ui`로 옮겼더니 라우팅 파일이 `@/app` 하나만 보게 됐고, 규칙도 코드도
설명이 짧아졌다.

**규칙을 느슨하게 하고 싶어질 때가 규칙이 일하고 있는 순간이다.**

## 3. 예상과 달랐던 것 — barrel이 두 번 배신했다

FSD의 핵심 장치는 barrel(`index.ts`)이다. 그런데 Next의 두 메커니즘과 정면으로 부딪혔다.

### 3-1. barrel이 `"use client"` 경계를 지웠다

이관 전 `CategoryPicker`는 `"use client"`가 없었다. 부모(`AddGoalsContent`)가 갖고 있었으니까.
barrel을 만들자 **서버 컴포넌트인 페이지가 barrel을 import**했고, 그 순간 `CategoryPicker`가
서버 그래프에 들어가 빌드가 깨졌다.

> barrel로 노출되는 잎은 **부모의 경계에 기댈 수 없다.** 자기 `"use client"`를 가져야 한다.

12개 파일에 붙였다. 규칙(`fsd-entities.md`)에 적었다.

### 3-2. barrel이 코드 분할을 무효화했다 — 이건 빌드가 안 잡아준다

`widgets/market-board/index.ts`가 `RealtimeMarketTable`을 export하고 있었다. 그건
`MarketBoard`가 `next/dynamic({ssr:false})`로 부르는 잎이다. 페이지가 barrel을 import하는
순간 그 모듈이 **정적으로** 들어왔고, `next/dynamic`은 남아 있지만 분할은 사라졌다.

**빌드도 lint도 타입도 전부 통과했다.** `/investments` First Load가 117 → 180 kB가 된 것을
번들 수치를 실제로 비교해서 알았다. `main` 워크트리를 만들어 같은 명령으로 빌드하지 않았으면
그대로 머지됐다.

같은 종류로 `TradingViewChart`가 `lightweight-charts`를 barrel에 끌고 있었다.

→ 규칙에 넣었다: **barrel에 `next/dynamic` 대상을 올리지 않는다.**
→ `sideEffects` 선언도 같이 했다. 없으면 webpack이 안 쓰는 barrel 멤버를 못 떨군다
  (`/goals/addgoals` +12 kB → +1 kB).

**"구조가 좋아졌으니 번들도 괜찮겠지"가 이 REQ에서 가장 비쌀 뻔한 가정이었다.**

## 4. AC 하나를 그대로 따르지 않았다

> "사용자 노출 문구가 `shared/i18n`에 모여 있다"

문자 그대로 하면 `MARKET_MESSAGES`·`GOAL_MESSAGES`가 전부 `shared`로 올라간다. 그러면
`fsd-shared.md` 첫 줄("도메인 무관한 코드만")과 정면으로 충돌하고, 슬라이스를 지울 때
문구만 남는다.

그래서 **의도를 지키고 형태를 바꿨다**: 도메인 무관 문구는 `shared/i18n`, 슬라이스 문구는
`{slice}/model/messages.ts`. 검수가 목적이라면 **"한 파일"이 아니라 "컴포넌트 밖"이면 성립한다** —
확신 표현·목표주가·2인칭 평가 grep은 `**/model/messages.ts` + `shared/i18n`이면 끝난다.

측정값: 컴포넌트 한글 리터럴 **0건**(JSX 텍스트 + `alt`/`placeholder`/`title`/`aria-label`).

REQ를 고치지 않고 넘어갈 수도 있었다. 그러면 다음 사람이 같은 판단을 처음부터 한다.
`fsd-shared.md`에 **왜 그렇게 했는지**를 박스로 남겼다.

## 5. FR-37(슬라이스 단위 커밋)을 지키지 않았다

REQ는 "한 커밋이 여러 슬라이스를 건드리면 되돌릴 수 없다"고 적었다. 맞는 걱정이다.
그런데 **rename + import 재배선은 원자적이다.** 슬라이스별로 자르려면 중간 커밋마다
re-export 껍데기가 필요하고(FR-38), 껍데기가 남으면 done이 아니다(AC).

즉 FR-37과 FR-38·AC가 서로를 요구하면서 서로를 막는다. pr-convention §4가 답을 준다 —
**"되돌리기 비용이 큰 변경은 단일 커밋으로 가둔다. 그러면 revert 지점이 하나가 된다."**

이관 1커밋 · 강제 수단 1커밋 · 측정 1커밋 · 문서 1커밋으로 나눴다. 리뷰 단위는
"판단 하나"이지 "슬라이스 하나"가 아니다.

## 6. 다음 사람이 알아야 하는 것

1. **훅이 막으면 우회하지 말고 구조를 고친다.** §2가 그 사례다.
2. **화면을 추가하면 번들을 비교한다.** `main` 워크트리에서 같은 `next build`를 돌리는 데
   5분이면 된다. 빌드·lint·타입은 §3-2를 못 잡는다.
3. **렌더 동일성은 `apps/web/scripts/compare-render.mjs`로 본다.** 픽셀 비교를 다시 만들지
   않는다 — vanilla-extract 클래스가 파일 경로에서 나오므로 이관 작업에서는 의미가 없다.
4. 레지스트리에 슬라이스를 추가할 때는 **`layered-architecture.md` §4 표 →
   `layer-rules.cjs`의 `REGISTRY`** 순서로 고친다. 표만 고치면 훅이 막는다.

## 7. 남은 기술부채

| 항목 | 어디에 |
|---|---|
| Route Handler 자리(`src/app/api-routes`)가 비어 있다 | `FE-REQ-013` |
| `/investments` First Load +7 kB | F006 `FE-REQ-030` |
| 죽은 코드 7건을 옮기기만 했다 | F000 `FE-REQ-011` |
| `apps/web/src/shared/ui/tokens.css.ts`가 `@repo/ui/tokens`와 겹친다 | 디자인 시스템 적용 시 |
| `wsClient`가 모듈 스코프에서 `new WebSocket`을 부른다 | 서버 컴포넌트가 `shared/api`를 쓰게 되는 시점 |
