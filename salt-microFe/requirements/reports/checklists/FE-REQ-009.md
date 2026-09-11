# FE-REQ-009 검증 체크리스트 — FSD 전환

작성: 2026-09-11
브랜치: `feature/fe-req-009-fsd`
상태: **done.** 수용 기준 14개가 전부 통과(1개는 대상 없음)이고 체크리스트·회고·검증 명령이 끝났다.
§8에 **이 REQ의 미달 2건**과 **다른 REQ가 닫는 5건**을 나눠 기록한다.

## 0. 실행한 검증 명령

| 명령 | 결과 |
|---|---|
| `pnpm build` | **2/2 성공** (`web` 6 routes, `web-tax` 2 routes) |
| `pnpm lint` | **6/6 성공** — `@repo/fsd/layers` 활성 상태 |
| `pnpm check-types` | **6/6 성공** |
| `pnpm test:layer-check` | **성공** — 차단 8 · 통과 5 (§4) |
| `node apps/web/scripts/compare-render.mjs` | **성공** — 4경로 × 3뷰포트 전부 동일 (§6) |

## 1. Acceptance Criteria

| AC | 결과 | 근거 |
|---|---|---|
| `src/`에 6레이어가 있고 그 외 최상위 폴더가 없다 | pass | `web/src`: `app`·`entities`·`features`·`pages`·`shared`·`widgets`. `web-tax/src`: `app`·`pages`·`shared`(나머지는 F002에서 생긴다) |
| Next 라우팅이 루트 `app/`에 있고 `@/pages/*` re-export만 한다 | pass | 라우팅 파일 6개가 **각 1줄**. 예외는 `layout.tsx` 둘(껍데기)뿐이고 규칙이 그것만 허용한다. §2 |
| 빈 루트 `pages/` 폴더가 있다 | pass | `web/pages/README.md`·`web-tax/pages/README.md` |
| Route Handler 로직이 `src/app/api-routes/`에 있다 | **해당 없음** | Route Handler가 0개다. 만드는 시점은 세션 쿠키 이관(`FE-REQ-013`). §8-1 |
| `layer-check` 훅이 위반 5종을 exit 2로 차단한다 (위반 8개 테스트) | pass | §4 |
| 슬라이스 내부 경로 직접 import 0건 | pass | `grep -rE 'from "@/(entities\|features\|widgets\|pages)/[a-z-]+/'` → 0 |
| `entities/*/api`에 mutation 0건, `entities/*/ui`에 mutation 호출 0건 | pass | §3 |
| `features` 슬라이스 이름이 전부 동사를 포함한다 | pass | `sign-in` · `add-goal` |
| 문자열 리터럴 union 열거값 0건, `any` 0건 | pass | §3 |
| 레지스트리 표에 없는 슬라이스 0건 | pass | 훅·lint가 강제한다. `sign-in`은 `fsd-features.md` 표에 추가했다 |
| 사용자 노출 문구가 한 곳에 모여 있다 | **조정 후 pass** | `shared/i18n` + 슬라이스 `model/messages.ts`. 컴포넌트 한글 리터럴 **0건**. 규칙 변경 근거는 §7 |
| 이관 전/후 렌더가 3뷰포트에서 동일하다 | pass | 4경로 × 3뷰포트. §6 |
| re-export 껍데기 0건 | pass | 껍데기를 쓰지 않고 한 커밋으로 이관했다. §8-4 |
| `pnpm build`·`lint`·`check-types` 통과 | pass | §0 |

## 2. 루트 라우팅 파일 (FR-11~FR-15)

| 파일 | 줄 수 | 내용 |
|---|---|---|
| `web/app/page.tsx` | 5 | `export { LoginPage as default } from "@/pages/login"` (+주석) |
| `web/app/home/page.tsx` | 1 | re-export |
| `web/app/investments/page.tsx` | 1 | re-export |
| `web/app/goals/addgoals/page.tsx` | 1 | re-export |
| `web/app/streaming-probe/page.tsx` | 1 | re-export (`dynamic` 포함) |
| `web/app/layout.tsx` | 31 | `<html>`·`<body>` 껍데기 + `@/app`의 `AppProviders`·`AppShell` |
| `web-tax/app/tax/page.tsx` | 1 | re-export |
| `web-tax/app/layout.tsx` | 24 | 껍데기 |

`streaming-probe`는 **이관 전 라우팅 파일에 131줄의 로직이 있었다.** `src/pages/streaming-probe`
슬라이스로 내렸다 — FR-12가 잡아낸 유일한 실제 위반이다.

`middleware.ts`·`instrumentation.ts`는 **둘 다 없다**(FR-15는 "있으면 루트에 둔다"이므로 위반 아님).

## 3. 레이어 규칙 grep (측정값)

| 검사 | 명령 | 결과 |
|---|---|---|
| 상위 레이어 import | `grep -rE 'from "@/(features\|widgets\|pages\|app)' src/entities src/shared` | **0** |
| 〃 (features) | `grep -rE 'from "@/(widgets\|pages\|app)' src/features` | **0** |
| 〃 (widgets) | `grep -rE 'from "@/(pages\|app)' src/widgets` | **0** |
| cross-slice | `grep -rn 'from "@/entities' src/entities` | **0** |
| 슬라이스 내부 경로 | `grep -rE 'from "@/(entities\|features\|widgets\|pages)/[a-z-]+/'` | **0** |
| 레거시 alias 잔존 | `grep -rE '"@/(components?\|constants\|hooks\|store\|utils\|libs\|api\|service\|types\|styles\|mock)/'` | **0** |
| `any` | `grep -rnw any src` | **0** |
| 리터럴 union 열거값 | `grep -rE '= *"[^"]*" *\| *"'` | **0** |
| `entities`의 mutation | `grep -rn 'useMutation\|method: "POST\|PUT\|DELETE"' src/entities` | **0** |
| 서버 컴포넌트의 브라우저 API | `"use client"` 없는 파일에서 `window.`·`localStorage`·`navigator.` | **0** |
| 컴포넌트 한글 리터럴 | JSX 텍스트·`alt`/`placeholder`/`title`/`aria-label` 속성 | **0** |

### enum으로 바꾼 리터럴 union (FR-40)

`Timeframe` · `WSMessageType` · `MarketSort` · `MarketOrder` · `MarketPeriod` · `GoalCategory` ·
`Theme` · `NotificationType`.

`SentimentInfo.sentimentLabel`은 **`string`으로 남겼다.** upstream이 `bullish`·`bearish`·
`neutral` 외의 값을 보내고 계약을 좁힌 적이 없다 — enum으로 좁히면 거짓 안전이 된다.

## 4. `layer-check` 훅 (FR-20~FR-26)

`pnpm test:layer-check`가 훅을 **실제로 실행**한다(stdin JSON → exit code). 판정 함수만
부르면 훅이 stdin을 못 읽거나 exit code를 잘못 내는 것을 못 잡는다.

| # | 위반 | 규칙 | 결과 |
|---|---|---|---|
| 1 | `entities` → `features` | `upper-layer` | 차단 |
| 2 | `entities/invoice` → `entities/market` | `cross-slice` | 차단 |
| 3 | `@/entities/market/model/types` | `slice-internal` | 차단 |
| 4 | `@/shared/lib/formatPrice` | `segment-internal` | 차단 |
| 5 | `web-tax` → `../../../../../web/src/shared/ui` | `cross-app` | 차단 |
| 6 | `apps/mobile` → `@repo/ui/button` | `rn-web-cross` | 차단 |
| 7 | 루트 `app/home/page.tsx`에서 `@/entities/goal` | `routing-shell` | 차단 |
| 8 | `entities/crypto-wallet/` 생성 | `registry` | 차단 |

**과차단을 잡기 위해 통과해야 하는 5건도 본다:** features→entities barrel · 같은 슬라이스
상대 경로 · `@/shared/ui/tokens.css` · 루트 라우팅의 `@/pages` re-export · 검사 대상 밖 파일.

훅은 루트 `.claude/settings.json`의 `hooks.PreToolUse`에 등록했다.

## 5. 번들 (NFR — 증가분 0 목표)

`next build` 출력(gzip). 이관 전은 `main` 워크트리에서 같은 명령으로 빌드했다.

| 경로 | 이관 전 First Load | 이관 후 | Δ |
|---|---|---|---|
| `/` | 125 kB | 125 kB | **0** |
| `/home` | 148 kB | 134 kB | **−14 kB** |
| `/investments` | 117 kB | 124 kB | +7 kB |
| `/goals/addgoals` | 123 kB | 124 kB | +1 kB |
| `/streaming-probe` | 105 kB | 105 kB | **0** |
| 공통 청크 | 103 kB | 103 kB | **0** |
| web-tax `/tax` | 102 kB | 102 kB | **0** |

### barrel이 코드 분할을 두 번 무효화했다

측정하지 않았으면 **`/investments`가 117 → 180 kB로 나간 채 머지됐을 것이다.**

1. `widgets/market-board` barrel이 `RealtimeMarketTable`(=`next/dynamic` 대상)을 export →
   페이지가 정적으로 끌어옴. barrel에서 뺐다.
2. `entities/market` barrel의 `TradingViewChart`가 `lightweight-charts`를 정적으로 끌었다.
   barrel에서 뺐다(현재 사용처 0).
3. `sideEffects: ["**/*.css.ts", "**/*.css"]`를 두 앱에 선언 → 쓰지 않는 barrel 멤버가
   실제로 떨어진다. 선언 전 `/goals/addgoals` +12 kB → 선언 후 +1 kB.

`/investments` +7 kB는 `@/entities/auth`·`@/shared/ui` barrel이 페이지에 붙은 몫이다.
F006(`FE-REQ-030`)이 이 화면을 `assets`로 다시 만들 때 함께 본다. §8-3.

## 6. 렌더 동일성 (FR-36)

`apps/web/scripts/compare-render.mjs` — 이관 전(`main` 워크트리, :3100)과 이관 후(:3200)를
같은 브라우저로 찍어 대조한다.

**픽셀이 아니라 DOM을 본다.** vanilla-extract 클래스 이름은 파일 경로에서 나오므로 이관하면
HTML이 바뀌고(`Goals_Wrapper__1a2b` → `GoalRow_Wrapper__3c4d`), 반대로 그래프 transition(1s)·
blink(2s)·원격 이미지 때문에 픽셀은 타이밍에 흔들린다. 그래서 **클래스·스타일·RSC 페이로드·
캐시버스터를 지운 DOM과 `innerText`**를 대조한다.

| 경로 | 375 | 390 | 1440 |
|---|---|---|---|
| `/` | 동일 | 동일 | 동일 |
| `/home` | 동일 | 동일 | 동일 |
| `/investments` | 동일(트리) | 동일(트리) | 동일(트리) |
| `/goals/addgoals` | 동일 | 동일 | 동일 |

`/investments`는 **실시간 시세가 흐른다** — 두 번 찍으면 값과 행 순서가 다르다. 그래서
텍스트·속성을 지운 **엘리먼트 트리 모양**만 대조한다. 값 자체의 동일성은 MSW로 고정된
`/home`·`/goals/addgoals`가 본다. 이 한계는 §8-2에 남긴다.

스크린샷 PNG는 같은 실행에서 3뷰포트 × 4경로 × 2버전 = 24장 남긴다(`OUT_DIR`).

### 변경 금지 목록 확인

홈 4블록 · 실시간 테이블 5컬럼 · 필터 3그룹 · 2컬럼 레이아웃 · **변동률 blink 2초** ·
색 토큰(`#FF2E55`/`#1677EE`/`#007AFF`/`#F2F4F6`) — 전부 DOM 대조에 포함됐고 차이가 없다.
blink 2초는 `RealtimeMarketTable`의 `setTimeout(..., 2000)`으로 그대로 옮겨졌다.

## 7. 규칙을 바꾼 것 (계약 변경)

| 문서 | 변경 | 왜 |
|---|---|---|
| `fsd-shared.md` | i18n 범위를 **도메인 무관 문구로 한정**하고 슬라이스 문구는 `{slice}/model/messages.ts`로 | AC를 문자 그대로 하면 `shared`가 도메인을 알게 된다 — 같은 문서 첫 줄과 충돌한다. 검수는 "한 파일"이 아니라 "컴포넌트 밖"이면 성립한다 |
| `fsd-features.md` | `sign-in` 추가 | 기존 로그인이 이미 mutation을 갖고 있어 갈 곳이 필요했다 |
| `fsd-app.md` | `ui/`·`mock/`·`store.ts` 추가 | `AppShell`은 라우팅 파일이 import할 수 있는 유일한 자리다. MSW는 API 클라이언트가 아니라 dev 부팅이다 |
| `fsd-pages.md` | 현재 페이지 목록, barrel이 named+default 둘 다 내는 이유 | |
| `fsd-entities.md` | 슬라이스 셀렉터·`"use client"` 규칙 | |
| `layered-architecture.md` | 규칙 표 위치, `*.css` 예외, 상대 경로 이탈 금지 | |

## 8. 미충족 · 범위 밖

### 8-A. 이 REQ의 미달 2건 — 수용 기준은 아니지만 요구사항을 덜 지켰다

| # | 항목 | 사유 | 언제 닫히나 |
|---|---|---|---|
| A-1 | **FR-37 슬라이스 단위 커밋 (Must)** 미준수 | FR-37은 FR-38(re-export 껍데기)을 전제하는데 AC는 "껍데기 0건"을 요구한다 — **둘이 서로를 막는다.** 껍데기 없이 슬라이스별로 자르면 중간 커밋이 빌드되지 않는다. pr-convention §4("되돌리기 비용이 큰 변경은 단일 커밋으로 가둔다")를 따라 revert 지점을 하나(`6217b03`)로 만들었다 | **닫지 않는다 — 의도적 선택.** REQ 본문의 FR-37/FR-38 충돌은 다음 ARCH REQ 작성 시 반영한다 |
| A-2 | NFR "클라이언트 JS 증가분 0" 미달 — `/investments` **+7 kB** | `@/entities/auth`·`@/shared/ui` barrel이 페이지에 정적으로 붙는 몫이다. 공통 청크는 0, 전체 합은 **−6 kB**(`/home` −14) | F006 `FE-REQ-030` (`assets` 재작성 시 같은 방법으로 재측정) |

### 8-B. 범위 밖 5건 — 다른 REQ가 닫는다

| # | 항목 | 사유 | 언제 닫히나 |
|---|---|---|---|
| B-1 | `src/app/api-routes/` (FR-14) — **AC 대상 없음** | Route Handler가 0개다. `fsd-app.md`가 정한 "만들 정당한 이유" 둘 다 아직 없다 | `FE-REQ-013` (F000 API, 세션 쿠키) |
| B-2 | `/investments` **값 단위** 동일성 | 실시간 시세라 두 번 찍으면 값과 행 순서가 다르다. 엘리먼트 트리 모양만 대조했다(§6) | 시세를 BFF 뷰모델로 고정하는 `FE-REQ-024` |
| B-3 | `apps/mobile` FSD (REQ Summary의 세 번째 앱) | 앱이 아직 없다. 훅·lint 규칙은 RN 경로를 **이미** 검사한다(테스트 6번) | `RN-REQ-001` |
| B-4 | `packages/core` 공유 범위 (Open Question) | RN이 React Query를 쓰는지에 달렸다 | `RN-REQ-001` |
| B-5 | 죽은 코드 7건 | `Overlay`·`ButtonWrapper`·`BankAccountValid`·`TradingViewChart`·`GoalsBlockWrapper`·`uiStore`·`settingsTypes`를 슬라이스로 옮기기만 했다. 삭제는 F000의 범위다 | F000 `FE-REQ-011` |
