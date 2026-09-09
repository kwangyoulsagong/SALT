# SALT Design System — Figma Generator

`@repo/ui`의 **실제 구현**과 `FE-REQ-005`의 **목표 스펙**을 Figma 파일로 생성하는 로컬 개발 플러그인이다. 캔버스를 손으로 그리지 않고 코드에서 생성하므로, 토큰이나 컴포넌트가 바뀌면 `code.js`만 고쳐 재실행하면 Figma가 따라온다.

## 왜 플러그인인가

Figma에 프로그래밍으로 레이어를 만들 수 있는 경로는 플러그인 API뿐이다.

| 경로 | 가능 여부 |
|---|---|
| 플러그인 API | ✅ 프레임·오토레이아웃·텍스트·Variables·스타일·컴포넌트 전부 생성 가능 |
| REST API | ❌ 노드 생성 엔드포인트가 없다(읽기 전용 + 코멘트/변수 일부) |
| 페이지 JS 주입 | ❌ `figma` 전역이 페이지 컨텍스트에 노출되지 않는다 |
| UI 자동 클릭 | ❌ 캔버스라 좌표 기반이고, 화면 단위 작업은 유지 불가 |

## 설치

로컬 플러그인 개발은 **Figma 데스크톱 앱**에서만 된다(브라우저 버전은 불가).

1. Figma 데스크톱 앱에서 대상 파일을 연다
2. 좌상단 메뉴 → `Plugins` → `Development` → `Import plugin from manifest…`
3. 이 디렉터리의 `manifest.json`을 선택

한 번 등록하면 이후 `Plugins` → `Development` → `SALT Design System`으로 실행된다. **`Publish`는 누르지 않는다** — Figma Community 공개 배포 흐름이고 이 플러그인은 내부용이다.

## 실행

| 메뉴 | 하는 일 |
|---|---|
| **Storybook 실측 컴포넌트 생성** | `SALT Storybook` 페이지 — 174개를 측정값 그대로 실제 Component로 |
| **전체 생성** | 파운데이션 + 컴포넌트 + Storybook 미러 (Current 값) |
| 파운데이션 + 컴포넌트 전체 · Target 값 | 같은 것을 FE-REQ-005 목표값으로 생성 |
| 파운데이션만 생성 | Variables + 스타일 + `SALT Foundation` 페이지 |
| 컴포넌트 생성 | `SALT Components` 페이지 — props 실측 12종 (variant 238개) |
| Variables만 생성 | Variable Collection `SALT` 재생성 |
| Variables만 생성 · Target 값 | 같은 것을 목표값으로 재생성 |
| Text / Effect 스타일만 생성 | `SALT/t{n}/{weight}` 32개 + `SALT/elevation/*` 4개 |
| 스펙시멘 페이지만 생성 | `SALT Foundation` 페이지 재생성 |

> `Variables만 생성`은 기존 Collection을 지우고 다시 만들기 때문에 이미 만들어진 페이지의 fill 바인딩이 끊긴다. 색 값을 바꿨다면 **`파운데이션 + 컴포넌트 전체`를 쓰는 것이 맞다.**

**재실행은 안전하다.** 같은 이름의 Collection·스타일·페이지를 먼저 지우고 다시 만들기 때문에 중복이 쌓이지 않는다. 반대로 말하면 **생성된 결과물을 Figma에서 직접 수정한 내용은 재실행 시 사라진다** — 수정은 `code.js`에 반영하는 것이 원칙이다.

## Current / Target 값

토큰에는 두 벌의 값이 있다.

| 값 세트 | 출처 |
|---|---|
| `Current` | `packages/ui/src/styles/tokens.css.ts` **실측값** |
| `Target` | `FE-REQ-005` D-2 / FR-1~FR-3 **적용 후 값** |

**123개 중 16개가 서로 다르다** — `neutral.50~800`(9개), `text.tertiary·disabled·lightGray`(3개), `border.light·default·dark`(3개), `market.flat`(1개).

### 플랜에 따라 동작이 갈린다

**유료 플랜(Professional 이상)** — Variable Collection에 모드가 `Current`/`Target` 2개로 만들어진다. `Current`가 첫 모드라서 파일을 열면 지금 코드 그대로가 보이고, 우측 패널에서 모드를 토글하면 D-2 교체가 스펙시멘과 컴포넌트 139개에 어떻게 반영되는지 한 번에 볼 수 있다.

**무료 / Starter 플랜** — Figma가 **컬렉션당 모드를 1개로 제한**해서 두 번째 모드 추가가 거부된다(`Limited to 1 mode`). 플러그인은 이걸 감지해 **단일 모드로 자동 폴백**하고, 완료 알림에 어느 값 세트를 넣었는지 적는다. 이 경우 두 값 세트를 이렇게 확인한다.

- 기본 실행(`파운데이션 + 컴포넌트 전체`) → **Current 값**
- `… · Target 값` 커맨드로 재실행 → 같은 것을 **Target 값**으로 다시 생성
- 어느 쪽으로 돌렸든 **차이는 없어지지 않는다** — 각 Variable의 `description`에 `Current #XXXXXX → Target #YYYYYY`가 적히고, `SALT Foundation`의 Color 섹션에는 값이 바뀌는 토큰에만 보라색 `→` 화살표가 붙는다

두 값 세트를 나란히 비교해야 한다면 Target으로 한 번 생성해 스펙시멘 페이지를 다른 파일로 복사해 두고, 다시 Current로 생성해 두 파일을 대조하면 된다.

> 모드 추가가 거부되면 이전 실행에서 **반쯤 만들어진 컬렉션이 남을 수 있다.** 재실행하면 같은 이름의 컬렉션을 먼저 지우고 다시 만들므로 그대로 다시 돌리면 된다.

REQ에서 새로 만드는 것(`typography.t1~t8` · `elevation.*` · `radius.button.*` · `space.lg2` · `color.ai.*`)은 코드에 대응값이 없어 두 모드에 같은 값을 넣고, 각 Variable의 description에 `코드 미반영`을 적어 두었다.

## 생성물

### Variables — Collection `SALT` (123개)

```text
color/neutral/50…900        10   D-2 교체 대상 (900 제외)
color/brand/*                5
color/action/*               3
color/text/*                11   base·nickname·email·H2는 deprecated
color/background/*           6
color/border/*               6
color/status/*              12
color/special/*             14   up·down이 여기 있다
color/shadow/*               4   deprecated (elevation으로 대체)
color/overlay/*              4
color/market/*               3   ⚠ REQ 신설 별칭 (코드에서는 special.up/down)
color/ai/*                   3   ⚠ FR-9 신설 · 값 미확정
space/*                     12   lg2(20px) 포함
radius/*                     8
radius/button/*              4   ⚠ D-7 신설
type/t{1..8}/*              18   ⚠ D-3 신설 (size · line-height · letter-spacing)
```

### Text Style (32개) · Effect Style (4개)

`SALT/t1/Bold` … `SALT/t8/Regular` — t1~t8 × Regular·Medium·SemiBold·Bold. size와 line-height가 픽셀로 묶여 있고(D-3), t1·t2는 letter-spacing `-3%`(FR-5).

`SALT/elevation/sm·md·lg·sheet`(D-4). `sm`은 2겹. D-8 원칙에 따라 기본은 그림자 없음이고 실제로 떠 있는 것에만 쓴다.

### `SALT Foundation` 페이지

Color / Typography / Space & Radius / Elevation / Market & Numeric 5섹션. 스와치와 시세 숫자의 fill은 Variable에 **바인딩**되어 있다.

### `SALT Components` 페이지 — props 실측 12종 / variant 238개 / Component Set 12개

**Storybook args로 prop을 주입해 렌더시킨 결과를 측정한 컴포넌트다.** Storybook은 `?args=variant:ghost;size:lg` 형태로 prop을 넘길 수 있어서, "그 prop 조합으로 코드가 실제로 그린 것"을 잴 수 있다. CSS를 읽어 해석하지 않는다.

variant 이름이 `variant=ghost, size=lg, disabled=false` 형태라서 **Figma가 이걸 실제 variant 속성(=props)으로 인식한다.** 속성 패널에 `variant` · `size` · `disabled` 드롭다운이 뜨고, 인스턴스에서 골라 쓸 수 있다.

| 컴포넌트 | props | 조합 |
|---|---|---|
| `Button` | `variant` 7 · `size` 4 · `disabled` 2 | 56 |
| `Heading` | `level` 6 · `color` 5 | 30 |
| `Text` | `variant` 3 · `color` 9 | 27 |
| `FlexBox` | `direction` 4 · `justify` 6 | 24 |
| `Grid` | `columns` 6 · `gap` 3 | 18 |
| `Section` | `background` 6 · `padding` 3 | 18 |
| `Root` | `background` 6 · `width` 3 | 18 |
| `Container` | `size` 6 · `centered` 2 | 12 |
| `Table` | `size` 3 · `striped` 2 · `hoverable` 2 | 12 |
| `ScrollContainer` | `direction` 4 · `scrollbar` 3 | 12 |
| `Image` | `radius` 2 · `objectFit` 3 | 6 |
| `Card` | `padding` 5 | 5 |

조합 총 **238개**. prop 행렬은 `measure/props-matrix.js`의 `MATRIX`에 있고, 컴포넌트 코드의 recipe variants와 stories의 `argTypes`를 대조해 만들었다.

> **CSS를 해석해 만들던 "신규 12종"은 제거했다.** 코드에 없는 컴포넌트라 Storybook 스토리가 없어서 측정할 수 없고, `pm/storyboard`의 CSS를 읽어 근사치로 만들었더니 서로 겹치는 문제가 있었다. 스펙은 `FE-REQ-005`와 `pm/storyboard/SALT-Storyboard.html`에 그대로 있고, 코드가 구현되면 Storybook 스토리가 생기므로 그때 실측으로 들어온다.

### props 재측정

컴포넌트 props가 바뀌면 `measure/props-matrix.js`의 `MATRIX`를 고치고 다시 뜬다.

```bash
python3 tools/figma-plugin/measure/collector.py        # :6100
```

브라우저에서 `http://localhost:6006` 을 열고 콘솔에:

```js
window.__PM_SLICE = [0, 9999];
eval(await (await fetch("http://localhost:6100/props-matrix.js")).text())
```

> 조합이 많으면 브라우저 콘솔이 응답을 기다리다 끊길 수 있다. `await` 없이 던지고(`eval(src).then(r => window.__PM_DONE = r)`) `window.__PM_DONE`으로 상태를 확인하면 된다.

```bash
python3 tools/figma-plugin/measure/build-props.py      # props.js 생성
```

그다음 `props.js` 내용을 `code.js` 상단의 `MEASURED_PROPS` 상수로 교체한다.

## 알려진 제약

- **`numeric.tabular`(FR-7)는 플러그인 API로 설정할 수 없다.** Figma가 OpenType 기능 토글을 플러그인에 노출하지 않는다. 금액·시세 텍스트는 타입 패널 `Details` → `Number style` → `Tabular`로 직접 지정해야 한다.
- **`InputField`는 코드가 `vw` 단위와 하드코딩 hex를 쓴다.** `primary`의 `#7949FF`, 나머지의 `#E5E8EB`·`#8B95A1`·`#F2F4F6`가 토큰이 아니라 리터럴이다. Figma에는 대표 px로 옮기고 색만 대응 토큰에 바인딩했으므로 **폭은 코드와 1:1이 아니다.**
- **`Icon` · `ServiceIcon`은 자리표시자다.** 둘 다 `<img width=35 height=35>`이고 `src`가 앱이 서빙하는 `/assets/**.svg`다. 플러그인은 `networkAccess: none`이라 가져올 수 없어 35×35 회색 박스 + 변형명으로 둔다. `StarIcon`과 `RadioButton`은 SVG가 코드 안에 있어서 **실제 path를 그대로 넣었다.**
- **`Section` · `Root`의 `gradient`는 표현할 수 없다.** `linear-gradient`는 Figma Variable(단색)로 바인딩이 안 되므로 시작색만 칠하고 컴포넌트에 경고를 적었다.
- **`FlexBox`의 `space-around` · `space-evenly`는 근사값이다.** Figma 오토레이아웃에 해당 정렬이 없어 `SPACE_BETWEEN`으로 표시한다.
- **`Container`의 폭은 1/4 축소 표시다.** `maxWidth`가 640~1536px이라 실제 크기로 넣으면 페이지가 과하게 넓어진다. 실제 값은 라벨에 적혀 있다.
- **hover/active/focus는 대부분 뽑지 않았다.** `Button.disabled`, `Tab.disabled`, `TableRow.hoverable/selected`는 variant로 넣었지만, `&:hover` 색(`*.hover`·`*.active` 토큰)은 Variable로만 존재한다.
- **hover/active/focus 상태는 만들지 않는다.** 코드의 `&:hover` 값은 Variable(`*.hover`·`*.active`)로 들어가 있지만 Figma 컴포넌트 variant로는 뽑지 않았다. 필요해지면 `state` prop을 추가한다.
- **레이아웃 프리미티브는 제외했다.** `flexBox` `grid` `padding` `margin` `section` `wrapper` `container` `root` `scrollContainer`는 시각 토큰이 없는 순수 레이아웃 유틸이라 Figma 컴포넌트로 만들 실익이 없다.
- **다크 모드는 없다.** 토큰이 라이트 단일이고 스토리보드도 라이트 단일이라 REQ 범위 밖이다.
- **Inter에 없는 기호 문자는 벡터로 대체한다.** 실측 데이터 전수 조사에서 9종이 나왔다(`★ ☆ ● ⬨ → ↑ ↓ ₩ ₿`). 브라우저는 시스템 폰트로 폴백해 그리지만 Figma에서 Inter로 지정하면 글리프가 없어 **사라진다.** 도형으로 그릴 수 있는 7종(`★ ☆ ● ⬨ → ↑ ↓`)은 SVG 벡터로 대체하고, `₩`·`₿`는 Inter에 있어 텍스트로 둔다. Table의 관심 표시(★/☆)와 코인 심볼이 이 경우다.
- **스토리 프레임은 root가 아니라 콘텐츠 전체 크기다.** 174개 중 54개에서 콘텐츠가 `#storybook-root` 경계를 넘는다(Card는 최대 48px). root 크기로 프레임을 만들면 넘친 부분이 옆 스토리를 덮으므로, 실제 콘텐츠를 감싸는 크기로 만들고 원점을 옮긴다.
- **실측 미러의 외부 이미지는 자리표시자다.** Card 스토리 7곳이 `via.placeholder.com`·Wikipedia URL을 쓰는데 플러그인은 `networkAccess: none`이라 받아올 수 없다. `#F2F4F6` 박스 + `img` 라벨로 둔다.
- **반복 그라디언트는 양 끝 2색으로 축약된다.** `linear-gradient(45deg, … 25%, … 25%, …)` 같은 체커보드 패턴 4곳이 해당한다. Figma 단일 페인트로는 반복 패턴을 표현할 수 없다.
- **실측 미러는 오토레이아웃이 없다.** 좌표를 그대로 옮긴 스냅샷이라 정확하지만, 크기를 바꿔도 재배치되지 않는다. 편집해서 쓰려면 `SALT Components` 페이지의 컴포넌트를, Storybook과 대조하려면 이 페이지를 본다.

## 코드가 바뀌면

1. 토큰: `code.js` 상단 `COLOR_GROUPS` / `SPACE` / `RADIUS` / `RADIUS_BUTTON` / `TYPE` / `ELEVATION`
   - `COLOR_GROUPS`의 items는 `[키, Current, Target?]`이다. Target을 생략하면 두 모드가 같은 값이 된다
2. 미러 컴포넌트: `MIRROR_SPECS`와 각 `c*` 빌더 (각 스펙에 출처 파일을 적어 두었다)
3. 신규 컴포넌트: `COMPONENT_SPECS`
4. Figma에서 **파운데이션 + 컴포넌트 전체** 재실행
5. `docs/design-system/style-tokens.md`·`component-index.md`도 같이 갱신

## 검증

Figma 없이 로직을 돌려볼 수 있다. 플러그인 API를 흉내내는 목 하네스로 실행하면 노드 수·바인딩 수·모드 커버리지를 확인할 수 있고, 잘못된 enum 값이나 오토레이아웃 축 오용은 예외로 잡힌다. 현재 기준 출력:

```text
Variable 123개(Mode 1 · Current 값) · Text Style 32개 · Effect Style 4개 · 스펙시멘 5섹션
props 실측 컴포넌트 12종(variant 238개 / Set 12개)
Storybook 실측 컴포넌트 174개 / Component Set 16개
collection "SALT": 123 vars × 1 modes (Current) → 모든 모드에 값 있음
```

계층·좌표는 `measure/verify-tree.js`로 검산한다. 플러그인을 목으로 실행한 뒤 만들어진 트리를 걸어 각 컴포넌트의 절대 좌표(부모 좌표 누적)를 원본 측정값과 비교한다.

```text
검산 노드: 1670
불일치: 0
```

무료 플랜(모드 1개)도 같은 하네스로 재현해 폴백을 확인했다.

```text
Variable 123개(Mode 1 · Current 값) · Text Style 32개 · Effect Style 4개
스펙시멘 섹션 5개 · 컴포넌트 12종 · Storybook 실측 컴포넌트 174개 / Component Set 16개
collection "SALT": 123 vars × 1 modes (Current) → 모든 모드에 값 있음
```

계층·좌표는 `measure/verify-tree.js`로 검산한다. 플러그인을 목으로 실행한 뒤 만들어진 트리를 걸어 각 컴포넌트의 절대 좌표(부모 좌표 누적)를 원본 측정값과 비교한다.

```text
검산 노드: 1670
불일치: 0
```
