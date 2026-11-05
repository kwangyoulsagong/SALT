# FE-REQ-007 검증 체크리스트 — Module Federation → Next.js Multi-Zones

작성: 2026-09-11
브랜치: `feature/fe-req-007-multi-zones`
상태: **일부 미충족.** 아래 §4에 남은 6건을 실패로 기록한다.

## 0. 실행한 검증 명령

| 명령 | 결과 |
|---|---|
| `pnpm install` | 성공 |
| `pnpm build` | **2/2 성공** (`web`, `web-tax`) |
| `pnpm lint` | **6/6 성공** |
| `pnpm check-types` | **6/6 성공** |
| `pnpm dev` + curl 프록시 검증 | 성공 (§2) |

## 1. Acceptance Criteria

| AC | 결과 | 근거 |
|---|---|---|
| `apps/` 아래에 `web`, `web-tax`, `mobile` 셋만 | **부분** | `web`, `web-tax`만 존재. `shell`·`goals`·`investments` **삭제 완료**. `mobile`은 `RN-REQ-001`에서 생긴다 |
| `grep -rn "nextjs-mf\|NextFederationPlugin"` = 0 | pass | node_modules·lock·문서 제외 **0건** |
| `grep -rn "message-event-bus" apps` = 0 | pass | `apps/web/README.md`의 "제거됨" 서술 1건 외 코드 0건. 패키지 삭제 |
| `/tax`로 접근하면 세금 zone이 응답 | pass | §2-1 |
| 정적 자산이 `/tax-static/_next/...`로 서비스 | pass | §2-2 |
| `/`에서 `/coach`, `/assets` 이동 시 full reload 없음 | **미검증** | 두 경로가 **아직 없다** (F006). §4-1 |
| `/`에서 `/tax` 이동이 hard navigation이고 링크가 `<a>` | pass | §2-3 |
| zone 간 경로 중복 0건 | pass | `@repo/core/zones` 레지스트리 기준. default `["/","/home","/investments","/goals"]`, tax `["/tax"]` — 교집합 없음 |
| `packages/tokens`가 `@vanilla-extract/css`를 import하지 않음 | pass | `packages/tokens/src/index.ts` 순수 TS 객체. grep 0건 (주석 언급 제외) |
| `apps/web-tax`가 `apps/web/src/**`를 import하지 않음 | pass | grep 0건 |
| `pnpm build`가 zone 2개 + `packages/*` 통과 | pass | §3 |
| `pnpm dev`가 두 zone 동시 기동 + `/tax` 로컬 프록시 | pass | web:3000, web-tax:3001. Ready 1.4s |
| zone 목록·근거 표가 `microfrontend.md`에 존재 | pass | §1 표 + §2 세 조건 |

## 2. 런타임 측정 (로컬, `pnpm dev`)

### 2-1. 프록시

```
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/tax        → 200
curl -s http://localhost:3000/tax | grep "세금 마감 콕핏"                  → 매치 (세금 zone 마크업)
```

### 2-2. 정적 자산

```
/tax 응답의 자산 경로: /tax-static/_next/static/chunks/polyfills.js  (외 다수)
curl http://localhost:3000/tax-static/_next/static/chunks/polyfills.js
  → 200, content-type: application/javascript
```

**default zone을 통해 세금 zone의 자산이 서비스된다.** Next 15+이므로 정적 자산용 추가 rewrite 우회를 넣지 않았다(FR-8).

### 2-3. cross-zone 링크

```
curl -s http://localhost:3000/home | grep -o '<a[^>]*href="/tax"[^>]*>'
  → <a href="/tax">
```

`<Link>`가 아니라 `<a>`다. lint 규칙이 이것을 강제한다 — probe 파일로 확인:

| 코드 | 결과 |
|---|---|
| `<Link href="/tax">` | **error** |
| ``<Link href={`/tax/${id}`}>`` | **error** |
| `<Link href="/tax-static/x">` | **error** |
| `<Link href="/taxes">` | pass (prefix가 아니다) |
| `<Link href="/home">` | pass (같은 zone) |
| `<a href="/tax">` | pass |

### 2-4. default zone 경로

| 경로 | 상태 |
|---|---|
| `/` | 200 |
| `/home` | 200 |
| `/investments` | 200 |
| `/goals/addgoals` | 200 |

## 3. 번들 (production build)

### `apps/web` (default zone)

| Route | Size | First Load JS |
|---|---|---|
| `/` | 2 kB | 113 kB |
| `/goals/addgoals` | 3.88 kB | 114 kB |
| `/home` | 29.9 kB | 139 kB |
| `/investments` | 2.51 kB | 112 kB |
| shared by all | | **103 kB** |

### `apps/web-tax` (tax zone)

| Route | Size | First Load JS |
|---|---|---|
| `/tax` | 988 B | 85.9 kB |
| shared by all | | **86.2 kB** |

**두 zone이 번들을 공유하지 않는다.** 세금 zone의 취득가액 lot 엔진·손실수확 솔버(F002에서 추가)가 매일 쓰는
default zone 번들에 실리지 않는다는 것이 이 분리의 목적이고, 지금 그 격리가 성립해 있다.

> **before 수치 없음.** 이전 3앱 구성은 이 브랜치에서 삭제되어 동일 조건 재빌드가 불가능하다.
> 비교가 필요하면 `main`에서 `pnpm build`를 돌려 얻는다.

## 4. 미충족 · 범위 밖 — 숨기지 않고 기록한다

> **2026-09-11 상태.** 6건 중 **2건이 닫혔다**(§4-4 · §4-6). 남은 4건은 전부
> **판정 대상이 아직 존재하지 않아서** 못 한 것이다 — 경로(`/coach`·`/assets`)·배포 인프라·
> zone 넘나드는 기능·스트리밍 전제 화면. 이 REQ 안에서는 닫을 방법이 없고 각각
> 담당 REQ 가 정해져 있다. 그래서 `done/` 으로 옮긴다.

### 4-1. `/coach`, `/assets` soft navigation 미검증

두 경로가 **아직 존재하지 않는다.** 3탭 IA는 F006(`FE-REQ-030`~`033`)에서 만든다.

- 현재 대체 근거: 같은 zone의 라우트는 **한 Next 앱**이고, 인앱 이동은 전부 `router.push`(`AuthGuard`,
  `useAuth`, `GoalsInformationSection`)이므로 구조적으로 client-side 전환이다.
- **Performance 패널 실측은 F006에서 해야 한다.** 그때 이 항목을 닫는다.

### 4-2. 관측성 NFR 미구현

REQ가 요구한 "zone별 첫 페인트 · cross-zone 이동 횟수 · `rewrites` 프록시 지연" 계측을 넣지 않았다.

- 이유: **배포 대상 인프라가 아직 없다.** 어디로 보낼지가 정해지지 않은 계측은 코드만 남는다.
- 남은 일: 배포 환경 확정 시 계측 추가. `FE-REQ-008`의 스트리밍 측정 게이트와 같은 자리에 붙이는 것이 맞다.

### 4-3. FR-24(기능 플래그, Should) 미구현

zone을 넘나드는 기능이 **아직 하나도 없다.** 플래그를 걸 대상이 없어 넣지 않았다.

- 남은 일: F002 세금 콕핏이 default zone(홈 D-Day 블록)과 tax zone에 동시에 걸릴 때 도입한다.

### 4-4. 레이어 위반 0건 — 검사 수단이 아직 없다 → **2026-09-11 닫혔다**

> **닫힘.** `FE-REQ-009`가 `.claude/hooks/layer-check.mjs` + `@repo/fsd/layers`를 만들었다.
> zone 교차(`apps/web-tax` → `apps/web/src/**`)도 grep 이 아니라 **훅이 exit 2 로 차단**한다.
> 위반 케이스 8개 + 통과 케이스 5개가 `pnpm test:layer-check` 로 돈다.
> 근거는 `checklists/FE-REQ-009.md` §4.

전 영역 공통 수용 기준(마스터 인덱스 §6)의 "레이어 위반 0건 (`layer-check` 훅 통과)"을 **확인할 수 없었다.**
`.claude/hooks/layer-check.mjs`가 아직 존재하지 않는다 — `FE-REQ-009`(FSD 전환)의 산출물이다.

- 지금 강제되는 것: **zone 경계**만. `@repo/zone/no-cross-zone-link`(cross-zone `<Link>`)와
  `apps/web-tax` → `apps/web/src/**` grep 0건.
- 강제되지 않는 것: FSD 레이어·슬라이스 규칙. **아직 FSD가 아니므로** 검사할 대상 자체가 없다.
- 남은 일: `FE-REQ-009`에서 훅을 만들 때 이 항목이 닫힌다.

### 4-5. PERF 예산 측정 미수행

공통 수용 기준의 "해당 영역 `PERF` 문서의 예산을 측정값으로 만족한다"를 하지 않았다.

- 이유: `performance-frontend.md`의 예산 대부분(홈 **첫 블록** 페인트 300ms, 홈 전체 완료 1.5s)이
  **스트리밍 SSR을 전제로 한 값**이다. 아직 Pages Router라 "첫 블록"이라는 개념이 없다.
  지금 재면 의미 없는 기준선만 남는다.
- 이 REQ가 예산에서 명시적으로 제외한 것: **zone 전환(`/tax`) 1회의 hard navigation.**
  별도 측정 대상이고, 관측성(§4-2)이 붙어야 잴 수 있다.
- 남은 일: `FE-REQ-008`의 측정 게이트(이관 전/후 첫 블록 페인트 + 총 완료 시간)에서 함께 닫는다.

### 4-6. 확인은 했으나 방법이 curl뿐

§2의 런타임 검증은 전부 `curl`이다. **브라우저에서 화면을 눈으로 확인하지 않았다.**

- 커버된 것: 라우팅·프록시·자산 경로·마크업 도달·링크 태그 종류
- 커버되지 않은 것: 실제 렌더 결과, 하이드레이션 경고, 클라이언트 상호작용(목표 추가 폼, 실시간 테이블)
- 남은 일: 머지 전 작성자가 `pnpm dev`로 4개 라우트를 눈으로 확인한다

> **2026-09-11 — 닫혔다.** `FE-REQ-008`에서 브라우저로 4개 라우트를 확인했다: 4라우트 모두
> 하이드레이션 경고 0건, 홈이 목표·투자·팁까지 실제 렌더, `/home` → `/goals/addgoals`가
> 문서 유지(soft, 87ms), `/home` → `/tax`가 문서 교체(hard) + `/tax-static/_next/...`.
> 근거는 `checklists/FE-REQ-008.md` §4. **단 그 확인은 App Router 이관 후 코드 기준이다** —
> Pages Router 시점의 렌더를 확인한 것이 아니다.

## 5. 배포 대상 결정 (Open Question 해소)

REQ가 "착수 전 확정 필요"로 표시한 항목. **자체 호스팅(FR-21)으로 결정했다.**

| 근거 | |
|---|---|
| 규모 | 비공개·초대제 ≤10명. `@vercel/microfrontends`의 cross-zone prefetch가 사는 값이 트래픽 규모에서 나오는데 그 규모가 없다 |
| 안정성 | FR-20은 Public Beta 기능에 배포 구조를 묶는다. `ADR-001`이 Rspack을 버린 논리("실험적 조합을 감당할 인력이 없다")가 여기에도 걸린다 |
| 대가 | `/tax`는 연말·5월 진입. hard navigation 1회의 대가가 작다 — REQ 이유 4가 이미 계산한 값 |

전환 비용을 한 파일로 가뒀다: `apps/web/src/components/Zone/CrossZoneLink.tsx`.
Vercel로 갈 때 이 파일의 내부 구현만 `@vercel/microfrontends`의 확장 `Link`로 바꾸고 루트에
`PrefetchCrossZoneLinksProvider`를 건다. **호출부는 그대로다.**

## 6. 남은 Open Question

- **Next 14 → 15 업그레이드 실측**: 완료. 깨진 것 1건뿐 — `next-env.d.ts`가 `triple-slash-reference` lint에
  걸린다(Next가 생성하고 "편집 금지"라 표시한 파일). 두 앱의 `.eslintrc.json`에 `ignorePatterns`로 처리.
- **`apps/goals` 이관 여부**: 이관했다. FEATURE-000이 목표 저축 UI를 변경 금지 목록에 넣었으므로 화면을 건드리지 않고
  `apps/web`의 로컬 컴포넌트로만 내렸다.
- **세금 zone의 인증 공유**: **미해결.** 토큰이 `localStorage`(`ACCESS_TOKEN_KEY`)에 있어 zone 간 공유가 안 된다.
  키를 `@repo/core/auth` 한 곳에 모아 이관 지점을 좁혀 두었다. 쿠키 이관은 `FE-REQ-013`(F000 API)에서 한다.
  **현재 `/tax`는 인증이 필요한 화면이 아니므로 지금 막히는 것은 없다.**

## 2026-10-28 — F000 웹 API 에러 정규화 후속 (`f74c34f` · `2ff2ae6` · `3f38160`)

| 항목 | 결과 |
|---|---|
| `packages/core` `"./http"` | `index.ts` 로 — 기존 소비처 3곳(`shared/config/network` · `shared/i18n` · `shared/api`) 무변경 타입 통과 · `web` · `web-tax` 빌드 pass |

미검증: 없음

## 2026-10-29 REQ 전수 조사

- 머리 정정 블록: Open Q `apps/goals` 이관은 닫힘 — `app/goals` 로 이관됨 / 3탭 `/` · `/coach` · `/assets` 는 아직 없다 — 지금 라우트는 `/home` · `/investments` · `/coach/report`

## 2026-11-02 — zone = 도메인 F0 (`FE-REQ-052`)

- 변경: 세금 zone 삭제 · 레지스트리 `registry.json` · rewrites 생성 · zone lint 레지스트리 전체 — 본문 FR-2 · 3 · 33 · 수용 기준 그 자리 정정
- 검증: `pnpm lint` · `check-types` · `test`(core 62 · ui 43) · `test:layer-check`(차단 12 · 통과 7) · `build` 5/5 · 실기동 rewrites — `checklists/FE-REQ-052.md` §2
- 미검증 · 범위 밖: `checklists/FE-REQ-052.md` §4
- 후속: `packages/core/src/http/constants.ts` · `apps/web/src/shared/config/network.ts` 주석 "두 zone" → "모든 zone(셸 + 도메인 zone)" — 값 무변경

## 2026-11-02 — MONEY-F1(`FE-REQ-053`) 투자 zone 분리 · 홈 카드

- MONEY-F1(`FE-REQ-053`) 에서 이 REQ 가 걸렸다 — shared 레이어 → `@repo/web-shared`(import 경로 치환)(`20971abf`) · 공용 레이아웃 폴더 이름 `chrome` → `layout`(`7dbb0c56`) · 투자 코치 설정 `/settings` → `/coach/settings`(셸 `/settings` 는 링크 목록)(`08a3aabf`) · 투자 화면 `apps/web/src` → `packages/domain-invest/src`(내용 무변경) · 투자 zone 조립(`b00b0cea`) · 웹 글꼴 404 → `next/font` 같은 origin · body 기본 글꼴(`9725dd20`) · 로그인 표지 쿠키 + 셸 미들웨어(로그인 상태 `/` → 서버에서 `/home`)(`562adfad`). 파일 6개(경로 이동 내용 무변경 1 · 수정 5 · 추가 0 · 삭제 0). 화면 · 동작이 바뀐 몫은 위 커밋 설명대로
- 확인: 모노레포 check-types · lint · test · zone 5 빌드 · layer-check · 훅 사후 실행(바뀐 TS 전부) · 실화면 — `salt-microFe/requirements/reports/checklists/FE-REQ-053.md` §2

## 2026-11-03 — MONEY-F2(`FE-REQ-054`) 앱 내비게이션

- 셸 `next.config.js` 를 zone 공용 프리셋 `@repo/config-next` 로(`7b8b1110`). assetPrefix 없음 · rewrites 레지스트리 생성 · Server Actions origin · 이미지 허용 값 무변경(프리셋이 같은 값을 낸다 — 앱 디렉터리에서 설정을 불러 대조)
- 확인: 모노레포 check-types · lint · test · zone 5 빌드 · layer-check · 훅 사후 실행 · Storybook · 실화면(5화면 × 5폭 · 앱 웹뷰 · WebKit) — `salt-microFe/requirements/reports/checklists/FE-REQ-054.md` §2

## 2026-11-03 — MONEY-F2(`FE-REQ-054`) 정적 경로

- FR-3 의 zone 별 assetPrefix 가 운영 빌드에서는 공용 `/_next` 로(`5c7218e9`, `ADR-005` 규칙 7 개정). dev · 셸 rewrites 무변경
- 확인: 운영 빌드 5 zone 합치기 충돌 0 · 오류 0 · 404 0(Chromium · WebKit) · dev 는 zone 별 prefix 그대로 — `FE-REQ-054` 체크리스트 §2

## 2026-11-03 — MONEY-F2(`FE-REQ-054`) 커밋 대조

- 커밋 대조 — 이 REQ 가 주인인 파일 둘이 더 걸렸다: `packages/tokens/src/index.ts` 도메인 색 추가(`1c4c3ee9`, 추가만) · `packages/core/src/zones/registry.ts` `assetPrefix` 설명(`28d51ed3`, 주석 — dev 만 쓴다)

## 2026-11-03 — MONEY-F2(`FE-REQ-054`) CrossZoneLink

- `CrossZoneLink` 에 `showPending`(대기 문구만 끄기) · `opensElsewhere`(새 탭 · 수정키 · 가운데 클릭 판정, 대기 상태와 계측이 같이 쓴다)를 더했다 — 앱 탭이 이 컴포넌트를 다시 쓴다(`378d8a1c`). 기존 호출부 동작 무변경(기본 `showPending: true`). 토큰 파일 주석 위치(`378d8a1c`)

## 2026-11-03 — MONEY-S1a 저축 서비스 첫 판 · 저축 zone 첫 화면

- 이 REQ 에 걸린 몫(`c60f5bfb`): 저축 zone 이 실제 화면을 서비스 — zone 앱은 얇다(`app/` re-export · 레이아웃 · `next.config.js` 만). `/goals/addgoals` 는 저축 zone 의 리다이렉트
- 확인: Kotlin `./gradlew check` 56(저축 종단 10 · 경계 8 · 플랫폼 14 · 도메인 15 · 커널 9) · bootJar 로컬 운영 DB 기동 · 서버 build · lint · test 936 · test:layer-check · BFF build · test 351 · 모노레포 check-types · lint · test(core 83 · ui 43) · zone 5 운영 빌드 · 훅 사후 실행 · 실스택(BFF 4001 → Kotlin 4010 → 로컬 DB) · 실화면 3화면 × 4폭(1024 · 1280 · 1440 · 1600) 넘침 0 · 콘솔 오류 0 — 루트 `requirements/reports/checklists/MONEY-S1a-savings-calculator.md`

## 2026-11-03 — 쿠키 세션 1단계 `0ef25f6b`

- `@repo/core/auth` 에 `ACCESS_COOKIE` · `SESSION_ROUTE` — zone 은 셸과 같은 origin 이라 쿠키를 같이 받는다(이 REQ 의 "localStorage 라 zone 간 공유 안 됨" 주의의 첫 해소)
- 실측: `/api/session` POST 204 + HttpOnly · 다른 사이트 403 · 모양 틀림 400 · DELETE 지움 · 셸 경유 `/goals` · `/goals/[id]` HTML 에 목표 이름 · 금액(쿠키 없으면 없음) · 브라우저 첫 진입에 쿠키 채움 · `document.cookie` 에 안 보임 · 수화 오류 0. 모노레포 check-types · lint · test · web · web-savings 빌드 · 훅

## 2026-11-04 — 로고(`FE-REQ-051`) · `25f182f6`

- 파일만 걸침 — 이 REQ 의 동작 · 값 diff 0. 모노레포 check-types · lint · test · zone 5 빌드 · 훅 통과(`checklists/FE-REQ-051.md`)


## 2026-11-05 — FE-REQ-013 FR-80 2단계 쿠키 세션

- 인증 키(FR-32) — 토큰 키를 `LEGACY_*`(이관용)로 · `REFRESH_COOKIE` · `SESSION_REFRESH_ROUTE` 추가(`721063fc`)
- 확인: check-types · lint · test · zone 4 빌드 · 훅 사후 실행 · 실스택 — `salt-microFe/requirements/reports/checklists/FE-REQ-013.md` 2026-11-05

## 2026-11-05 — 금융 팁 S2b(`MONEY-S2b-tips-quiz-diff`) 확인 2회차

- 몫: `@repo/core/auth` 에 `isPublicPath` · `PUBLIC_PATHS` 에 `/tips`(공개 zone) (`cf93acb1`)
- 검증: `@repo/core` 경계표 13(변이 — 정확히 같음 비교로 바꾸면 2 실패) · 모노레포 `check-types` · `lint` · `test`(core 184 · ui 46) · `test:layer-check` · zone 빌드 5(별도 worktree, main 과 나란히 — `/goals` 152 → 153 은 공용 청크 반올림 경계 · 페이지 3.35 kB 같음, 나머지 zone 무변화) · 실화면(만료 세션 → 제자리 · 실패 문구 → 다시 누르면 익명 채점 / 로그인 `/home` · `/goals` 탭 4 · `/login` 0)
- 미검증: 없음(이 몫 안)
