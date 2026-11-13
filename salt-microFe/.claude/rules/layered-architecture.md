# 아키텍처 개요 — 네 서피스, 하나의 원칙

SALT는 **네 서피스**로 구성된다. 같은 원칙을 쓰고 각자의 언어를 쓴다.

| 서피스 | 경로 | 방법론 | 레이어 |
|---|---|---|---|
| 웹 (default zone) | `apps/web` | **FSD** | `shared` → `entities` → `features` → `widgets` → `pages` → `app` |
| 웹 (도메인 zone 4) | `apps/web-{investment,savings,household,tips}` — 얇은 앱, 화면은 `packages/domain-*`(`ADR-005` · `microfrontend.md`) | **FSD**(패키지 안) | 동일 |
| 모바일 | `apps/mobile` | **FSD** | 동일 (`pages` = 화면 셸) |
| BFF | `bff/src` | 레이어드 | `routes` → `controllers` → `services` |
| 서버 | `salt-server/src` | **DDD** | `{context}/{domain · application · infrastructure · presentation}` |

FSD는 프론트엔드 방법론이다. `widgets`·`pages`는 Express 서버에서 뜻이 없다. **이름을 통일하지 않는 이유**는 이름이 뜻을 잃으면 규칙이 번역표가 되고, 번역표는 지켜지지 않기 때문이다.

교차 locality는 레이어 이름이 아니라 **슬라이스 이름**이 만든다.

```
코치 기능을 찾을 때:
  apps/web/src/entities/coach/...           (웹 — 표시)
  apps/mobile/src/entities/coach/...        (모바일 — 표시)
  bff/src/services/app-ai-coach.service.ts  (BFF — 뷰모델)
  salt-server/src/coach/...                 (서버 — Bounded Context)
```

## 1. 의존은 한 방향으로만 흐른다

```
웹·모바일  shared(0) → entities(1) → features(2) → widgets(3) → pages(4) → app(5)
BFF        routes → controllers → services
서버       presentation → application → domain ← infrastructure
```

서버만 선형이 아니다. `application`과 `infrastructure`는 **둘 다 `domain`에 의존하고 서로에게는 의존하지 않는다** — 의존 역전이다(`salt-server/.claude/rules/ddd-domain.md` §3).

## 2. 같은 레이어의 다른 슬라이스를 직접 import하지 않는다

공통이 필요하면 **아래 레이어로 내린다.** 두 feature가 같은 것을 필요로 하면 그것은 사실 entity거나 shared다.

우리 기능들은 데이터를 공유한다 — 코치는 지표·성적표·실패이력·보유를, 적립은 지표·김프를, 포지션은 보유·가격을 쓴다. **cross-slice import로 해결하면 몇 달 뒤 전부 서로를 부른다.**

## 3. 위반은 쓰기 시점에 막힌다

`.claude/hooks/layer-check.mjs`가 Edit/Write 직전에 검사하고 exit 2로 차단한다.
ESLint `@repo/fsd/layers`가 같은 것을 에디터·CI에서 보여준다. 겹치는 것은 의도적이고
**피드백 시점이 다르다** — lint는 파일이 쓰인 다음에 보고, 그 사이에 위반 위에 위반이 쌓인다.

**규칙 표는 `packages/eslint-plugin-fsd/layer-rules.cjs` 한 곳**이고 둘이 같은 파일을 읽는다.
미러가 아니다. 위반 케이스 16개(레이어 8 + 도메인 4 + 패키지 안 4, `FE-REQ-052` · `053`)는 `pnpm test:layer-check`가 훅을 실제로 실행해 검증한다.

**훅이 막으면 우회하지 말고 구조를 고친다.**

| 금지 | 왜 |
|---|---|
| 상위 레이어 import | 의존 방향 |
| 같은 레이어의 다른 슬라이스 | §2 |
| 슬라이스 내부 경로 직접 참조 (`@/entities/tax/model/types`) | barrel의 유일한 목적이 내부 구조 변경 차단이다 |
| 슬라이스를 벗어나는 상대 경로 | alias 없이 경계를 넘는 우회로다 |
| `apps/web-*` → 다른 앱 `src/**` | zone은 독립 배포 단위다 |
| `domain-*` → 다른 `domain-*` · 셸 → `domain-*` · zone 앱 → 남의 `domain-*` | 도메인 사이는 URL 링크와 BFF 응답으로만(`ADR-005` §2, `FE-REQ-052`) |
| `apps/web-*/src/{entities,features,widgets}` | zone 앱은 얇다 — 화면은 `domain-*` |
| `packages/domain-*/src/{shared,app}` · `web-shared` 에서 `@/…` | shared 는 `@repo/web-shared`, app 은 zone 앱 — shared 는 위를 모른다 |
| `apps/mobile` → `packages/ui` | vanilla-extract는 RN에서 동작하지 않는다 |
| 루트 `app/**`·`pages/**`에서 `@/pages`·`@/app` 외의 import | 라우팅 파일은 연결만 한다 |
| 레지스트리에 없는 슬라이스 생성 | §4 |

**예외 하나 — `*.css` 토큰 모듈.** `@repo/web-shared/ui/tokens.css`는 세그먼트 내부 경로지만 허용한다.
`.css.ts`는 빌드 타임에 node에서 평가되므로 barrel로 가져오면 React 컴포넌트가
vanilla-extract 그래프에 들어와 빌드가 깨진다.

## 4. 슬라이스 레지스트리

새 슬라이스는 **이 표에 먼저 추가**한다. 웹·모바일은 하이픈 허용, 서버 컨텍스트는 하이픈 없이.

| 슬라이스 | 책임 | 서버 컨텍스트 | 도메인 패키지(`ADR-005`) |
|---|---|---|---|
| `auth` | 초대 코드 검증 · 세션 · 토큰 갱신 | `auth` | 셸 |
| `home` | 홈 요약 카드 조회 · 표시(`HomeSummaryCard`, BFF 계약) — 도메인을 모른다(`FE-REQ-055`) | — (BFF 조립) | 셸 |
| `portfolio` | 보유 · 포지션 · 평가금액 · 3자산군 합산 | `portfolio` | `invest` |
| `market` | 시세 · 실시간 구독 · 차트 · 관심 종목 | `market` | `invest` |
| `coach` | 추천 · 점수 · 근거 3종 · 대화 · 성적표 · 피드백 | `coach` | `invest` |
| `plan` | 밸류에이션 밴드 · 주간 적립 · 김프 · 실행 기록 | `plan` | `invest` |
| `indicator` | 지표 스냅샷 · **실패 이력**(추천 렌더 게이트의 근거) | `indicator` | `invest` |
| `fx` | 환율 · 김프 (F003 적립) | `fx` | `invest` |
| `goal` | 목표 저축 (변경 금지 목록) | `goal` | `savings` |
| `household` | 가계부 지출 · 봉투 · 착지 구간 · 목표 시계 한 줄(`FE-REQ-057`) | `household` | `household` |
| `tip` | 금융 팁 공개 글 · 메타 다섯 칸 · 확인 필요 · 바뀐 것(`FE-REQ-058`) | `content`(서비스 — 글 하나 = tip) | `tips` |
| `news` | 뉴스 목록 · 프리뷰 | `news` | `invest` |
| `notification` | 도메인별 알림 설정 조회(2026-11-06 `FE-REQ-055` FR-6) · 알림 목록 · 읽음은 F006 | `notification`(Kotlin 서비스) | 셸 |
| `device` | 디바이스 등록 · 푸시 토큰 · 앱 버전 게이트 (모바일만) | `device` | 셸(모바일) |

도메인 패키지 열은 있는 곳이다 — `invest` = `packages/domain-invest`(2026-11-02 `FE-REQ-053`), 셸 = `apps/web`. `savings` = `packages/domain-savings`(2026-11-03 `FE-REQ-056`). `household` = `packages/domain-household`(2026-11-04 `FE-REQ-057`). `tips` = `packages/domain-tips`(2026-11-05 `FE-REQ-058`). shared 레이어는 `packages/web-shared`(`@repo/web-shared/<세그먼트>`).

**실재하는 엔티티는 9개다** — `auth` · `goal` · `home`(셸, 2026-11-02) · `market` · `portfolio` · `coach`(뒤 셋은 `domain-invest`, `goal` 은 2026-11-03 부터 `domain-savings`) · `household`(2026-11-04 `domain-household`) · `tip`(2026-11-05 `domain-tips`) · `notification`(셸, 2026-11-06 — 알림 설정).
나머지는 해당 기능 REQ에서 생긴다. 표에 있다고 폴더가 있는 것은 아니다.

> store 조립은 `app` 레이어가 한다. 슬라이스는 `RootState`를 보지 않고 **자기 가지만 타이핑한
> 셀렉터**를 `model/selectors.ts`에 둔다. 그러지 않으면 모든 슬라이스가 `app`에 의존하게 된다.

### 조합 슬라이스 (`widgets`)

| widget | 엮는 것 |
|---|---|
| `home-briefing` | 셸 홈 — 도메인 요약 카드(`entities/home`) + 목표 목록(임시, `FE-REQ-056` 까지) + 저축 팁. 도메인 엔티티를 읽지 않는다 |
| `coach-console` | coach + market(종목 로고 · 이름) + indicator + portfolio — ~~코치 리포트 맨 위 "내 보유"(2026-11-02 홈에서 옮김)~~ 내 보유 패널은 2026-11-10 포트폴리오 페이지(`/portfolio`, `FE-REQ-069`)가 이 위젯에서 가져다 쓴다 |
| `asset-workspace` | 포지션 / 시장 / 관심 종목 세그먼트 |
| `position-overview` | portfolio (Hero · 평가금 흐름 · 보유 · 리스크 레이더) |
| `coach-panel` · `symbol-analysis` | market + coach + indicator (투자 우측 패널 · 상세 분석) |
| `scenario-panel` | coach(패널 칸 · 해설) + market(원인 칸 · 지난 가격) + `check-trade-odds` — 종목 상세 한 장 패널(F017 v4 `FE-REQ-064` FR-8, 2026-11-13) |
| `judgment-overview` | coach — 투자 화면 머리 아래 **요약 띠**(목표 비중 · 위험 · 판정 성적표 한 줄씩 → 코치 리포트 섹션). 본문은 `coach-console` (F010, 2026-09-29) |
| `app-header` · `alert-list` · `transaction-list` | 공통 헤더(검색 · 알림 진입) · 알림 · 거래 목록 — **2026-11-03: 헤더 틀은 위젯이 아니라 zone 공용 레이아웃(`@repo/ui` `AppNavigation` 머리, `FE-REQ-054`). 검색 진입은 그 머리 칸에 들어갔다(2026-11-09 `FE-REQ-067` `headerSearch` — 2026-11-10 투자 zone 만, 메뉴는 `headerNav` `FE-REQ-069`) · 알림도 같은 자리** |
| `settings-panel` | coach + 코치 설정(`edit-coach-profile`) + 매입가 숨김(`toggle-purchase-price`) — 투자 코치 설정 `/coach/settings` (F004 FR-12 · 2026-11-02 셸 `/settings` 에서 옮김) |
| `market-list` | 모바일 시장 목록 (웹은 `market-board`) |
| `market-board` | market + news + indicator — 자산군(코인 · 국내 주식)은 매개변수, 화면은 하나(요약 띠까지 — `FE-REQ-050`) |
| `asset-search` | market + 검색어 상태(`search-asset`) + ★(`toggle-watchlist`) — 종목 검색 ~~화면~~ **모달**(머리 칸 · `/` · `/search` 는 연 채로 — 2026-11-09 `FE-REQ-066`) (F000 FR-40 · 41, 2026-10-30) |
| `onboarding-flow` | auth + `choose-domains` + `accept-invite` — 초대 → 쓸 것 고르기 → 첫 기록(고른 도메인 zone 화면) → 끝(~~초대 → 첫 보유 기록 → 적립액~~ 2026-11-06 S3a `FE-REQ-055` FR-4) |
| `pc-panel-grid` | `MovableGrid` + 위 widget들 |

## 5. Next.js 라우팅과 FSD의 관계

**라우팅 디렉터리는 프로젝트 루트, FSD는 `src/`.** FSD 공식 Next.js 가이드 방식이며 Pages Router와 App Router 둘 다에 적용된다.

```
apps/web/
├── app/          Next 라우팅 — @/pages/* re-export만
├── pages/        빈 폴더 (App Router에서도 필수). README.md만
├── middleware.ts · instrumentation.ts
└── src/
    ├── app/      FSD app 레이어 — 프로바이더 · 전역 스타일 · api-routes
    ├── pages/    FSD pages 레이어 — 라우트 셸
    ├── widgets/ features/ entities/ shared/
```

```tsx
// app/page.tsx
export { HomePage as default, metadata } from '@/pages/home';
```

> **루트 `app/`은 라우팅이고 `src/app/`은 FSD 초기화다.** 이름이 같으니 매번 확인한다.

## 6. 인터페이스 정의 (TypeScript)

`{slice}/model/types.ts`에 둔다.

- **`interface` 우선** — 데이터 구조, 요청/응답 DTO
- **`enum`** — 열거값은 반드시 enum. 문자열 리터럴 union 금지
- **`type` alias** — 두 개 이상을 union/intersection으로 조합할 때만
- DTO 네이밍: `{Action}{Entity}Request` · `{Action}{Entity}Response`
- `any` 금지 — 불가피하면 `unknown` + 타입 가드
- BFF 뷰모델 타입은 **BFF가 소유한 계약**이다. 프론트가 다시 정의하지 않고 `packages/core`에서 공유한다

```ts
// entities/tax/model/types.ts
export interface TaxDeadline {
  assetClass: AssetClass;
  lastTradeDate: string | null;
  daysRemaining: number | null;
}

export enum AssetClass {
  Crypto = 'crypto',
  KrStock = 'kr_stock',
  UsStock = 'us_stock',
}
```

## 7. Path Alias

| Alias | Target |
|---|---|
| `@/entities` `@/features` `@/widgets` `@/pages` `@/app` | `src/{layer}` — 도메인 zone 앱은 `packages/domain-<x>/src/{layer}` |
| `@repo/web-shared/<세그먼트>` | shared 레이어 패키지(2026-11-02 — `@/shared` 는 없다) |

`tsconfig.json`의 `paths`에 레이어별로 **두 줄씩**(`@/entities`와 `@/entities/*`) 넣는다.
`@/*` 하나만 있으면 alias 목록이 규칙의 근거가 되지 못한다.

- **다른 레이어 참조**: 반드시 alias. `../../shared/api` 금지
- **같은 슬라이스 내부**: 상대 경로. `@/entities/tax/model/types` 금지
- alias는 `tsconfig.json`의 `paths`와 번들러 설정 **양쪽에** 넣는다 — 한쪽만 하면 타입 체크와 빌드 중 하나가 깨진다

## 8. 공유 패키지

| 패키지 | 내용 | 소비자 |
|---|---|---|
| `packages/tokens` | 플랫폼 중립 토큰 객체 (순수 TS, CSS 의존 없음) | web · 도메인 zone · mobile |
| `packages/ui` | 웹 컴포넌트 (vanilla-extract) — 공개 subpath 83 | web · 도메인 zone · `domain-*` |
| `packages/ui-native` | RN 컴포넌트 | mobile |
| `packages/core` | 플랫폼 무관 `model`·`api`·`lib` | 전부 |
| `packages/web-shared` | 웹 shared 레이어(`api` · `config` · `i18n` · `lib` · `model` · `ui`) + zone 공용 레이아웃(`layout`: 프로바이더 · 프레임 · 앱 내비게이션 연결 · 프로필 메뉴 · 404 · 글꼴 · prerender · 문서 간 전환) | web · 도메인 zone · `domain-*` |
| `packages/config-next` | zone 공용 Next 설정 프리셋 `zoneNextConfig(zoneId)` — zone 몫은 레지스트리 값(`FE-REQ-054` FR-5). 운영 빌드는 공용 `/_next`(정적 파일 합치기 `pnpm static:merge`) | zone 앱 5 `next.config.js` |
| `packages/domain-*` | 도메인 화면(FSD `entities`~`pages`) — `domain-invest` · `domain-savings`(2026-11-03) | 자기 zone 앱만 |
| `packages/eslint-config` `packages/typescript-config` | 툴링 | 전부 |

## 9. 레이어별 규칙 문서

`fsd-shared.md` · `fsd-entities.md` · `fsd-features.md` · `fsd-widgets.md` · `fsd-pages.md` · `fsd-app.md`
서피스별: `microfrontend.md` · `streaming-ssr.md` · `rn-architecture.md` · `rn-microfrontend.md`
성능: `performance-frontend.md` · `performance-rn.md`
