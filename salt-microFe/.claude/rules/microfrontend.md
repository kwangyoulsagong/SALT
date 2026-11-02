# 마이크로프론트엔드 — Next.js Multi-Zones · zone = 도메인

> **개정 2026-10-30 (`ADR-005`, `FE-REQ-052` FR-1).** zone 경계를 **도메인**으로 긋는다 — 셸 + 투자 · 저축 · 가계부 · 금융 팁.
> 9월의 zone 판정("세 조건을 모두 만족" · "탭 경계로 자르지 않는다")은 ADR-005 §1 · §4 가 대체했다.
> **2026-09-09 개정** — `@module-federation/nextjs-mf` 를 버리고 Multi-Zones 로(`ADR-001`). 그 이유(App Router 미지원 · 지원 종료)는 그대로다.

## 0. 지금 코드 상태 — 규칙과 다른 곳

2026-11-02 `FE-REQ-052` 로 zone 앱 5개 · 레지스트리 · rewrites 생성 · lint/훅 도메인 축이 코드가 됐고, 같은 날 `FE-REQ-053` 으로
**투자 화면이 `packages/domain-invest` + `apps/web-investment` 로 옮겨 갔다**(레지스트리 `invest.hostedIn = "web-investment"`).

| 항목 | 규칙(목표) | 지금 코드 | 닫는 곳 |
|---|---|---|---|
| 화면 코드 위치 | `packages/domain-*` | 저축 화면이 `apps/web/src/**` — `savings.hostedIn: "web"`. 가계부 · 팁은 빈 zone | `FE-REQ-056`(저축) |
| 완화 장치 — 공용 청크 캐시 공유 | §5 넷째 줄 | 프리셋 하나(`@repo/config-next`)로 해시는 같다. URL prefix(`/_next` · `/investment-static/_next`)가 달라 캐시는 따로 | `OPS-001`(한 origin 라우팅) |

**옮기기 전 상태는 레지스트리 `hostedIn` 이 적는다.** cross-zone 판정(lint · `CrossZoneLink`)은 `hostedIn` 기준이라 셸에 남은
저축 화면 사이는 지금도 `<Link>` 다. 셸 rewrites 는 경로를 `fallback` 으로 걸어 셸에 화면이 있으면 셸이 받는다 — 화면을 옮기는
REQ 는 셸 라우트를 지우고 `hostedIn` 을 자기 앱으로 바꾸는 것까지 한 커밋으로. 행이 닫히면 이 절에서 지운다.

## 1. zone = 도메인 (`ADR-005` §1)

| zone 앱 | 도메인 | 경로 | 화면 코드 | 포트 · assetPrefix |
|---|---|---|---|---|
| `apps/web` | 셸(default) | `/` `/home` `/login` `/onboarding` `/settings`(도메인별 설정 링크) | 셸 전용 | 3000 · — |
| `apps/web-investment` | 투자 `invest` | `/investments` `/coach` `/search` | `packages/domain-invest` | 3002 · `/investment-static` |
| `apps/web-savings` | 저축 `savings` | `/goals` | `packages/domain-savings` | 3003 · `/savings-static` |
| `apps/web-household` | 가계부 `household` | `/household` | `packages/domain-household` | 3004 · `/household-static` |
| `apps/web-tips` | 금융 팁 `tips` | `/tips`(공개 · ISR) | `packages/domain-tips` | 3005 · `/tips-static` |

- 도메인 이름은 프론트 패키지 · BFF 경로 · 서버 서비스(`ADR-006`) · RN 서비스 번들(`RN-REQ-032`)이 **같다**
- `apps/web-tax` 는 삭제한다(`ADR-002` 로 기능이 없다). 가계부는 `household` — 지운 `ledger` 와 섞지 않는다
- 투자는 **동결** — 기획된 것까지만(`ADR-005` §5)
- **새 zone 은 새 도메인일 때만**, `ADR-005` 표 개정이 먼저다. 화면 · 탭 · 기능 단위로 zone 을 만들지 않는다 — 도메인 안의 잦은 이동(목록 → 상세 → 리포트)이 hard navigation 이 된다

## 2. 경계 규칙 (`ADR-005` §2)

1. **zone 하나 = 도메인 하나.** 목록은 `@repo/core/zones` 레지스트리 한 곳 — 앱에 경로 상수를 복사하지 않는다
2. **셸은 인증 · 온보딩 · 홈 · 공용 크롬만.** `domain-*` 를 import 하지 않는다. 홈은 BFF 의 `HomeSummaryCard[]`(서버 계산 값)로만 받는다
3. **`domain-*` 끼리 import 금지.** 도메인 사이는 URL 링크와 BFF 응답으로만 — 저축 화면이 투자 보유를 쓰고 싶으면 BFF 가 서버 값으로 준다
4. **zone 앱은 얇다** — `app/` 라우트 · 레이아웃 · `next.config.js` 만. `apps/web-*/src/{entities,features,widgets}` 금지(화면은 `domain-*`)
5. **zone 을 넘는 링크는 `CrossZoneLink`(`<a>`)**, `next/link` 는 같은 zone 안에서만(lint)
6. **하단 탭 · 머리는 `@repo/ui` `AppNavigation` 하나**(2026-11-03 `FE-REQ-054` — ADR 의 옛 이름 `AppChrome`). zone 은 `@repo/web-shared/layout` `AppShell` 로 붙인다(레지스트리 판정 · prerender · 전환 · 계측이 거기 있다). 공용 패키지(`ui` · `core` · `tokens`)를 바꾸면 영향 zone 을 **동시 배포**
7. **경로 prefix · assetPrefix 는 zone 간 유일.** 셸 rewrites 는 레지스트리에서 생성 — 손으로 쓰지 않는다

패키지 안 구조는 FSD 그대로(`layered-architecture.md`) — `domain-*` 안에 `entities` · `features` · `widgets` · `pages`.

## 3. 설정

```js
// apps/web-<domain>/next.config.js — basePath 없음, assetPrefix 는 레지스트리 값
const { ZONES } = require("@repo/core/zones/node");
const nextConfig = { assetPrefix: ZONES.<id>.assetPrefix };

// apps/web/next.config.js — 셸이 로컬 · 폴백 프록시. 규칙은 레지스트리에서 생성
const { zoneRewrites } = require("@repo/core/zones/node");
async rewrites() { return zoneRewrites(process.env); }   // ZONE_<ID>_ORIGIN · 경로는 fallback
```

- 셸은 `assetPrefix` 를 갖지 않는다. Next 15+ 에서 정적 자산용 추가 rewrite 는 불필요 — 그 우회를 남기지 않는다
- 운영 진입은 CDN + L7 한 origin 경로 라우팅이 zone 에 직접 보낸다(`ADR-008`). 셸 rewrites 는 로컬 · 폴백
- **같은 origin 이 전제다** — §5 의 prerender · 문서 간 전환이 같은 origin 에서만 동작한다

## 4. zone 간 링크는 `<a>`다

`<Link>` 는 상대 경로를 prefetch · soft navigate 하려 하고 **zone 을 넘으면 동작하지 않는다.**

```tsx
<CrossZoneLink href="/goals">저축</CrossZoneLink>   // ✅ zone 을 넘는다
<Link href="/goals">저축</Link>                       // ❌ 깨진다 — lint 실패
```

- zone 판정은 레지스트리(`registry.json` 한 곳 — TS `registry.ts` · CommonJS `registry.cjs` 가 읽고 `registry.test.ts` 가 대조). `@repo/zone/no-cross-zone-link` 는 파일이 놓인 앱(`packages/domain-<x>` 는 그 zone 앱)을 보고 레지스트리 전체로 판정한다 — 앱 설정에 경로를 복사하지 않는다
- 공용 코드(`@repo/web-shared`)는 여러 zone 에 들어가므로 **실행 중인 앱 기준**으로 판정한다 — 각 zone `next.config.js` 가 `env.NEXT_PUBLIC_ZONE_APP` 을 넣는다. 경로가 서버에서 오거나(홈 카드 `href`) 옮겨 가는 중이면 `ZoneLink`, 코드 이동은 `useZoneNavigate`(다른 zone 이면 `location.assign`)

## 5. 대가와 완화 — hard navigation (`ADR-005` §3 · `FE-REQ-054`)

zone 을 넘는 이동은 문서 이동이다. 하단 탭이 가장 잦은 zone 간 이동이 된다.

| 장치 | 효과 | 한계 |
|---|---|---|
| Speculation Rules prerender(`eagerness: moderate`, 탭 4개 첫 화면만 · 로그아웃이면 끔) | 누르기 전에 다음 zone 첫 화면을 렌더 | Chromium 계열만 |
| 문서 간 View Transitions(`@view-transition { navigation: auto; }` · 탭 · 헤더 같은 `view-transition-name`) | 크롬 제자리 · 본문만 전환 | 같은 origin 만 · 줄인 모션이면 끔 |
| 첫 화면 숫자 서버 렌더 | 캐시가 비어도 숫자가 HTML 에 — 가격 깜빡임 금지 유지 | — |
| 공용 청크 같은 해시(`packages/config-next` 프리셋 하나) | React · 디자인 시스템 캐시 공유 | zone 별 설정이 같아야 · **URL 이 같아야 캐시가 겹친다** — 지금은 assetPrefix 가 달라 따로(2026-11-03 실측: 같은 해시 9개) |

- 셸 → 도메인 탭 전환 시간 · prerender 적중률을 브라우저별로 잰다(`FE-REQ-054` FR-6) — `performance.mark("salt:zone-nav")`. **prerender 는 자동화 브라우저(DevTools 프로토콜이 붙은 Chrome)에서 꺼진다** — 적중은 사람이 평소 Chrome 에서 본다
- 첫 화면이 없는 도메인 탭은 보이되 눌리지 않는다(`@repo/core/navigation` `readyBy`) — 없는 경로로 보내 404 를 보이지 않는다

## 6. Server Actions

한 도메인이 여러 앱을 서비스하므로 origin 을 명시한다: `experimental.serverActions.allowedOrigins`.

## 7. 코드 공유

Multi-Zones 는 코드 공유 수단이 없다. **workspace 패키지로만** 공유한다.

- `apps/web-*` 가 다른 앱의 `src/**` 를 import 하면 **훅이 차단**한다
- 공유: `packages/tokens` · `ui` · `core` · `web-shared`(웹 shared 레이어 + zone 공용 레이아웃) · `domain-*`(자기 zone 만 소비)
- 도메인 패키지는 안에서 레이어 alias(`@/entities` …)를 그대로 쓰고, 그 zone 앱 `tsconfig` `paths` 가 패키지 `src` 로 푼다 — 셸은 `domain-*` 를 import 하지 않으므로 한 빌드에 두 `@/` 가 섞이지 않는다
- zone 별 릴리스가 어긋날 수 있으므로 **zone 을 넘나드는 기능은 기능 플래그로 동시 활성화**한다

## 8. 하지 않는 것

- **`@module-federation/nextjs-mf` 를 다시 넣지 않는다.** 지원 종료 · App Router 미지원(`ADR-001`)
- **`packages/message-event-bus` 를 쓰지 않는다.** zone 간 통신은 URL 파라미터와 서버 상태로
- 도메인 사이 클라이언트 상태 공유 · 셸이 도메인 화면 코드 품기 · 탭(화면) 단위 zone
- **런타임 번들 조립(Module Federation)을 다시 도입하기 전에** `next-rspack` 안정 선언과 `@module-federation/enhanced` 의 App Router 공식 지원을 확인한다. 그때도 zone 하나를 실험 대상으로 삼고 ADR 로 남긴다 — Multi-Zones 가 그 실험을 zone 단위로 격리해 준다
