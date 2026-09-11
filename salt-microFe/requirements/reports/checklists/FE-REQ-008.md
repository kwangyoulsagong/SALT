# FE-REQ-008 검증 체크리스트 — Pages Router → App Router + 스트리밍 SSR

작성: 2026-09-11
브랜치: `feature/fe-req-008-streaming-ssr`
상태: **일부 미충족.** 아래 §6에 남은 7건을 실패로 기록한다.

## 0. 실행한 검증 명령

| 명령 | 결과 |
|---|---|
| `pnpm build` | **2/2 성공** (`web` 7 routes, `web-tax` 2 routes) |
| `pnpm lint` | **6/6 성공** |
| `pnpm check-types` | **6/6 성공** |
| `pnpm dev` + 브라우저 | 성공 (§4) |
| `next start` + `scripts/measure-streaming.mjs` | 성공 (§3) |

## 1. Acceptance Criteria

| AC | 결과 | 근거 |
|---|---|---|
| `apps/web/app/`(루트)이 라우팅이고 `@/pages/*` re-export만 한다 | pass | `app/page.tsx`·`app/home/page.tsx`·`app/investments/page.tsx`·`app/goals/addgoals/page.tsx` 각 1줄. 예외는 `app/layout.tsx`(껍데기)와 `app/streaming-probe/`(측정 전용, §3) |
| `apps/web/pages/`가 빈 폴더로 존재한다 | pass | `pages/README.md`만. `web-tax`도 동일 |
| `apps/web/src/pages/`는 FSD pages 레이어다 | **부분** | Next 라우팅에서 분리됐고 `login`·`home`·`investments`·`goals/addgoals` 슬라이스로 정리했다. `ui/`·`model/` 세그먼트 분할은 `FE-REQ-009`. §6-1 |
| 홈에서 총자산 블록이 청구서 블록보다 먼저 페인트된다 | **대체 확인** | 홈 5블록이 아직 없다. 같은 지연 프로파일의 프로브로 측정: 첫 블록 **31.9ms** vs 청구서 **1537ms** (§3). 홈 실측은 F006. §6-2 |
| 청구서 소스를 강제 실패시키면 그 블록만 에러다 | pass | `?fail=청구서 한 줄` → 4블록 정상 렌더, 실패 블록만 문구. §4-3 |
| 세금 콕핏에서 D-Day 칩이 자산군 카드보다 먼저 보인다 | **미검증** | 세금 콕핏 화면이 없다(F002). §6-3 |
| 인증 토큰이 클라이언트 JS 번들과 `localStorage`에 없다 | **미충족** | 여전히 `localStorage`다. 쿠키 이관은 `FE-REQ-013`. §6-4 |
| `grep -rn "use client" apps/web/src`가 `src/app` 프로바이더와 잎으로 한정된다 | pass | 14개 파일. §2-1 |
| 서버 컴포넌트에서 `window\|localStorage\|navigator` 참조 0건 | pass | §2-2 |
| 클라이언트 JS gzip 증가분 40KB 이하 | pass | 최대 **+16.2 kB**(`/tax`). §5 |
| 홈 첫 블록 페인트 p95 < 300ms | **대체 확인** | 프로브 p95 **31.9ms**. 홈 실측은 F006. §6-2 |
| `pnpm build`·`pnpm lint` 통과, 하이드레이션 경고 0건 | pass | §0, §4-1 |

## 2. 서버·클라이언트 경계

### 2-1. `"use client"` 배치 (FR-10)

`apps/web/src` 14개. **전부 `src/app` 프로바이더이거나 잎이다.**

| 파일 | 왜 클라이언트인가 |
|---|---|
| `app/providers/AppProviders.tsx` | React Query·Redux 컨텍스트 |
| `app/providers/QueryClientProvider.tsx` | 〃 |
| `app/providers/MockServiceWorker.tsx` | MSW 기동(dev 전용) |
| `components/Block/BlockBoundary.tsx` | error boundary 는 클래스 컴포넌트여야 한다 |
| `components/Zone/CrossZoneLink.tsx` | 클릭 대기 상태 |
| `components/Auth/AuthGuard/AuthGuard.tsx` | 인증 상태 → 라우팅 |
| `components/Home/Header/Header.tsx` | 프로필을 Redux 에서 읽는다 |
| `component/GoalsApp/MyGoals/MyGoals.tsx` · `GoalsList/GoalsList.tsx` | React Query 조회 |
| `component/InvestmentsApp/MyInvestments/MyInvestments.tsx` | 〃 |
| `component/Investment/Investment.tsx` | 탭 상태 + `ssr:false` 차트 |
| `component/AddGoals/AddGoalsContent.tsx` | react-hook-form |
| `component/TradingViewChart/TradingViewChart.tsx` | `lightweight-charts` |
| `pages/login/LoginForm.tsx` | 폼 + 로그인 뮤테이션 |

`apps/web-tax/src`는 **0건**이다.

`packages/ui`에서 1건 바뀌었다: `Header.tsx` — `route` 모드가 `router.back()`을 부른다.
이전에는 `next/router`였고 App Router 에서 던진다. `next/navigation` + `"use client"`로 바꿨다.

**페이지 4개 전부 서버 컴포넌트다.** 데이터를 부르는 잎만 클라이언트다.

### 2-2. 서버 컴포넌트의 브라우저 API (FR-14 · NFR)

```
"use client" 없는 .tsx 중 window|localStorage|navigator 참조: 0건
```

`QueryClientProvider`의 `typeof window === "undefined"` 분기는 남아 있지만 그 파일은 `"use client"`이고,
React Query 의 표준 서버/브라우저 인스턴스 분기다.

### 2-3. `next/router` → `next/navigation` (FR-1)

```
grep -rn "next/router" apps packages (node_modules 제외) → 0건
```

바뀐 4곳: `AuthGuard` · `useAuth` · `GoalsInformationSection` · `@repo/ui` `Header`.

### 2-4. 경계에서 실제로 걸린 함정 세 개

| 함정 | 증상 | 해결 |
|---|---|---|
| `msw/browser`의 `exports`에 `"node": null` | 클라이언트 컴포넌트도 SSR 용으로 **서버 컴파일**되므로 `Package path ./browser is not exported`로 빌드·dev 가 깨진다 | `next.config.js`에서 **서버 컴파일에만** `resolve.alias["msw/browser"] = false`. `next/dynamic`의 `ssr:false`로는 **dev 가 안 막힌다**(프로덕션만 NODE_ENV 인라인으로 우연히 통과했다) |
| 서버 컴포넌트의 `next/dynamic({ssr:false})` | App Router 에서 허용되지 않는다 | `/investments` 페이지의 dynamic 호출을 `Investment` 클라이언트 잎 안으로 옮겼다 |
| `web-tax`의 `app/page.tsx` | `/`가 두 zone에 동시에 생겨 `no-html-link-for-pages`가 `<a href="/">`(cross-zone)를 막았다 | 파일을 지웠다. **`/`는 default zone 의 경로다** — zone 경로 유일성(`FE-REQ-007`)이 여기서 다시 걸렸다 |

세 번째는 **lint 캐시 때문에 한 번 오진했다.** `.next/cache/eslint`를 지우기 전까지 수정 후에도 같은 에러가 재생됐다.

## 3. 측정 — 스트리밍 게이트 (FR-30~32)

### 3-1. 무엇을 쟀나

판정 대상 화면(홈 5블록·세금 콕핏·청구서)이 **아직 없다.** 서버에서 기다리는 블록이 하나도 없으면
잴 것이 없으므로, REQ §"자리 1 — 홈"의 블록별 예산을 그대로 옮긴 **합성 프로브**를 만들었다.

`apps/web/app/streaming-probe/page.tsx` — 기본값 **404**, `STREAMING_PROBE=1`일 때만 열린다.

| 쿼리 | 모양 | FR-30 의 무엇 |
|---|---|---|
| `?mode=blocking` | 5블록을 `Promise.all`로 묶어 한 번에 | **이관 전** (`GET /api/app/home` 1콜) |
| (없음) | 블록마다 `Suspense` | **이관 후** (스트리밍) |
| `?fail=<블록>` | 그 블록만 예외 | 부분 실패 격리 (FR-21) |

블록 예산: 총자산 100ms · 이번 주 적립 250ms · AI 추천 400ms · 세금 D-Day 100ms · 청구서 **1500ms**.

### 3-2. 결과 (프로덕션 빌드, `next start`, 7회)

```bash
pnpm --filter web build
cd apps/web && STREAMING_PROBE=1 npx next start -p 3000
node scripts/measure-streaming.mjs "http://localhost:3000/streaming-probe?mode=blocking"
node scripts/measure-streaming.mjs "http://localhost:3000/streaming-probe"
```

| | 첫 chunk median | 첫 chunk **p95** | 마지막 median | 마지막 **p95** | chunk 수 |
|---|---|---|---|---|---|
| **1콜 집계 (전)** | 1533.6ms | **1572.8ms** | 1534.7ms | **1574.6ms** | 7 |
| **스트리밍 (후)** | 21.2ms | **31.9ms** | 1524.4ms | **1547.0ms** | 14 |

chunk 도착 시각(1회): `31.9, 32.0, 32.0, 32.1, 32.1, 126.9, 127.3, 285.5, 288.2, 427.1, 427.2, 1537.4, 1538.5, 1547.0`

**블록 예산과 그대로 맞는다.** 32ms에 셸+스켈레톤, 127ms에 100ms짜리 둘, 286ms에 250ms짜리,
427ms에 400ms짜리, 1537ms에 1500ms짜리. **블록은 문서 순서가 아니라 완료 순서로 나간다.**

### 3-3. FR-31 판정

| 기준 | 값 | 판정 |
|---|---|---|
| 첫 블록 p95 < 300ms | **31.9ms** | 통과 |
| 총 완료 시간 악화 없음 | 1574.6 → **1547.0ms** (−27.6ms) | 통과 |

**첫 블록이 49배 빨라졌고 총 완료는 나빠지지 않았다.** 스트리밍을 유지한다.

> **이 수치는 합성이다.** 홈·세금 콕핏·청구서의 화면 단위 판정은 그 화면이 생길 때
> 같은 방법으로 다시 한다 (§6-2·§6-3).

## 4. 브라우저 실측

Chrome 확장(`claude-in-chrome`)과 Playwright chromium 두 경로로 확인했다.
**`FE-REQ-007` §4-6("확인은 했으나 방법이 curl뿐")이 여기서 닫힌다.**

### 4-1. 하이드레이션 (AC)

`pnpm dev`(React 개발 빌드 — 불일치를 경고로 보고한다) 기준 4개 라우트:

| 라우트 | 하이드레이션 경고 | 렌더 |
|---|---|---|
| `/` | **0건** | 로그인 폼 |
| `/home` | **0건** | 프로필·목표(482,225원)·목표 2건·투자 분석·팁 전부 렌더 |
| `/investments` | **0건** | 투자 분석 + 탭 3종 |
| `/goals/addgoals` | **0건** | 카테고리 6종 + 폼 |

`/home` 콘솔 48건은 **전부 INFO/LOG**(React DevTools 안내 + MSW 로그)다. error·warning 0건.

dev 에서 `msw/lib/browser`발 `TypeError: Cannot read properties of undefined (reading 'url')`가
**여러 탭을 동시에 열 때** 나온다. 단일 탭에서는 재현되지 않고, MSW 내부이며 dev 전용이다.
이관과 무관하다 — 기록만 남긴다.

### 4-2. 내비게이션

| 이동 | 기대 | 결과 |
|---|---|---|
| `/home` → `/goals/addgoals` (같은 zone) | soft — 문서 유지 | **문서 유지, 87ms**, navigation entry 1개 |
| `/home` → `/tax` (zone 넘음) | hard — 문서 교체 | **문서 교체**, `h1` = "세금 마감 콕핏", 자산 `/tax-static/_next/...` |

`FE-REQ-007`의 zone 불변식이 App Router 이관 후에도 유지된다.

### 4-3. 부분 실패 격리 (FR-21)

`?fail=청구서 한 줄` (프로덕션 빌드):

```
정상 렌더 블록: 총자산 · 이번 주 적립 · AI 추천 · 세금 D-Day
상태 문구     : "청구서 한 줄을 불러오지 못했습니다. 잠시 후 다시 시도해주세요."
남은 aria-busy: 0
```

**한 블록이 죽어도 나머지 4블록이 산다.**

관찰 하나: 실패를 주입하면 React 가 그 경계를 클라이언트에서 다시 시도하고, 그 동안
**다른 블록의 스켈레톤이 잠깐 함께 보인다.** 최종 상태는 정상(`aria-busy` 0)이지만 수렴까지
프로덕션 ~수백 ms, dev ~수 초가 걸린다. 홈 5블록을 만들 때 다시 볼 자리다.

### 4-4. `aria-busy` (NFR 접근성)

스켈레톤에 `aria-busy="true"` + 시각적으로 숨긴 "〈블록명〉 불러오는 중" 텍스트를 둔다.
블록이 도착하면 그 트리 전체가 교체되므로 **따로 끄는 코드 없이 해제된다.** 실측 `aria-busy` 잔여 0.

스켈레톤은 `minHeight`로 실제 블록 높이를 맞춘다(목표 320 · 투자 240 · 투자분석 420 · 목표추가 360).

## 5. 번들 (FR NFR — 증가분 40KB 이하)

첫 로드 클라이언트 JS **gzip 합계**. 빌드 매니페스트의 라우트별 chunk 를 gzip 해 합산했다.

| 라우트 | 전 (Pages) | 후 (App) | 증가 |
|---|---|---|---|
| `/` | 110.2 kB | 122.4 kB | **+12.2** |
| `/goals/addgoals` | 112.0 kB | 120.7 kB | **+8.7** |
| `/home` | 136.3 kB | 144.8 kB | **+8.5** |
| `/investments` | 109.5 kB | 114.7 kB | **+5.2** |
| `/tax` (web-tax) | 84.1 kB | 100.3 kB | **+16.2** |

증가분은 **App Router 런타임(RSC 클라이언트 · router)** 이다. 기능 코드가 아니다.
가장 큰 `/tax`(+16.2)도 예산 40KB 안이다.

HTML 크기는 늘었다 — `/home` 3,324 B → 16,742 B. RSC flight payload 가 HTML 에 들어가기 때문이다.
**TTFB 는 그대로다**(프로덕션 5회, 1.7~2.2ms). 두 값 모두 프리렌더된 정적 응답 기준이다.

## 6. 미충족 · 범위 밖 — 숨기지 않고 기록한다

> **2026-09-11 상태.** 7건 중 **2건이 닫혔다**(§6-1 · §6-7). 남은 5건 중 4건은
> 판정 대상 화면이 없어서(홈 5블록 · 세금 콕핏 · `/assets` · 코치 대화) 못 한 것이고,
> **§6-4(인증 토큰이 `localStorage`)만 성격이 다르다** — 명시된 AC 인데 구현하지 않았다.
> 그 사유도 "부를 BFF 가 없다"이고 `FE-REQ-013`이 담당한다. 그래서 `done/` 으로 옮기되
> **§6-4 를 이 REQ 의 실제 미달로 남긴다.**

### 6-1. FSD `pages` 레이어가 아직 세그먼트로 안 쪼개졌다 → **2026-09-11 닫혔다**

> **닫힘.** `FE-REQ-009`가 `src/pages/{login,home,investments,add-goal,streaming-probe}/{ui,model,index.ts}`
> 로 쪼갰다. `goals/addgoals` 중첩도 `pages/add-goal` 슬라이스가 됐고, 루트 라우팅 파일은
> `export { XxxPage as default } from "@/pages/xxx"` 형태다.
> 근거는 `checklists/FE-REQ-009.md` §2.

`src/pages/{login,home,investments,goals/addgoals}`로 슬라이스 이름은 생겼지만
`ui/`·`model/`·`lib/`·`index.ts` 구조가 아니다. `goals/addgoals`는 아직 중첩이다.

- 지금 만족한 것: **Next 라우팅과 화면 코드의 분리**(FR-1·FR-3). 루트 `app/**`는 re-export 만 한다.
- 남은 일: `FE-REQ-009`(FSD 전환)에서 닫힌다. 라우트 파일은 그때 `export { XxxPage as default }` 형태가 된다.

### 6-2. 홈 5블록의 화면 단위 판정 미수행 (FR-30·FR-31)

측정한 것은 **합성 프로브**다. 실제 홈은 아직 5블록이 아니고, 블록별 BFF 엔드포인트도 없다
(`BFF-REQ-027`·`BFF-REQ-028`).

- 지금 홈의 `BlockBoundary` 2개는 **부분 실패 격리만** 실제로 한다. 목표·투자 블록이 여전히
  클라이언트에서 React Query 로 조회하므로 Suspense 가 붙잡을 서버 대기가 없다.
- 남은 일: F006(`FE-REQ-030`~`033`)에서 블록을 서버 컴포넌트 + `await fetch`로 바꾸고
  `scripts/measure-streaming.mjs`를 홈 URL 로 다시 돌린다. 그때 이 항목이 닫힌다.

### 6-3. 세금 콕핏·청구서 경계 미구현 (FR-22·FR-23)

D-Day 칩/자산군 카드/솔버(F002), 스냅샷/현재가 보정(F001) 화면이 없다.
`BlockBoundary`와 측정 방법은 준비됐다. `FE-REQ-018`~`021`·`FE-REQ-014`~`017`에서 닫힌다.

### 6-4. 인증 토큰이 아직 `localStorage`다 (FR-11 · AC)

FR-11("인증 토큰을 클라이언트로 내리지 않는다 — 쿠키에서 읽어 서버에서 BFF를 부른다")을
**구현하지 않았다.**

- 이유: 현재 데이터 소스가 **MSW 목**이고 서버 컴포넌트가 부를 BFF 가 없다. 토큰을 쿠키로 옮겨도
  읽을 주체가 없다.
- `FE-REQ-007`의 Open Question(세금 zone 인증 공유)과 **같은 항목**이다. 키는
  `@repo/core/auth` 한 곳에 모여 있다.
- 남은 일: `FE-REQ-013`(F000 API)에서 httpOnly 쿠키로 옮긴다.

### 6-5. `/investments` → `/assets` 리다이렉트 미구현 (FR-4)

`/assets`가 아직 없다. 지금 리다이렉트를 넣으면 404 로 보낸다.
3탭 IA 와 함께 F006(`FE-REQ-030`)에서 닫힌다.

### 6-6. 코치 대화 첫 페인트 미구현 (FR-24)

코치 화면(F006)과 SSE 계약(`BFF-REQ-006`)이 둘 다 없다. `FE-REQ-032`에서 닫힌다.

### 6-7. `.codex/rules` 미러 누락 — **Codex 하네스를 제거해 닫혔다**

처음 기록한 내용: `FE-REQ-007` 때 생긴 `fsd-*.md` 6개 · `layered-architecture.md` ·
`performance-frontend.md` · `performance-rn.md` · `rn-architecture.md` · `rn-microfrontend.md`가
`.codex/rules/`에 없어, Codex 하네스로 작업하면 FSD·성능·RN 규칙이 없는 구조를 전제했다.

**2026-09-11 — 미러를 맞추는 대신 Codex 하네스를 지웠다.** 사용자 결정("클로드만 쓴다").
`.codex/**` 55개 파일과 `AGENTS.md` 6개를 삭제했다. 삭제 전에 `.codex`의 모든 파일이
`.claude` 대응 파일과 **경로 참조만 다른 순수 미러**임을 확인했다 — `.codex`에만 있는 내용은
없었다. 오히려 `packages/ui`의 `storybook.md`는 `.claude` 쪽이 한 줄 더 최신이었다
(`pnpm --filter @repo/ui test`). **미러가 이미 갈라져 있었다는 증거다.**

영역 규칙은 이제 `.claude/rules/` 한 벌이다. "두 벌을 함께 고친다"를 전제하던
루트 `CLAUDE.md` · `pr-convention.md` §5 · `pull_request_template.md` · `/pr-summary` 스킬도
같이 정리했다.

### 6-8. 관측성·PERF 예산 전면 측정 미수행

`FE-REQ-007` §4-2·§4-5 와 같은 항목이다. 이번에 **스트리밍 게이트(첫 블록 300ms)만** 측정값을
얻었고, `performance-frontend.md` §1 의 나머지 예산(코치 대화·솔버·청구서·실시간 테이블)은
그 화면들이 없어 잴 수 없다. 배포 인프라도 아직 없어 계측을 보낼 곳이 없다.

## 7. Turbopack을 못 쓰게 됐다 (기록)

`next.config.js`에 `webpack` 훅이 생겨 `next dev --turbopack`을 쓸 수 없다.
넣은 이유는 §2-4 의 `msw/browser` 하나뿐이고, **MSW 를 실제 BFF 호출로 바꾸는
`FE-REQ-012`(F000 API) 때 이 훅이 같이 사라진다.**

지금 Turbopack 을 쓰지 않으므로 잃은 것은 없다. 쓰기로 결정하면 그전에 MSW 를 먼저 걷어낸다.
