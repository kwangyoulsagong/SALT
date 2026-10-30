# 마이크로프론트엔드 — Next.js Multi-Zones · zone = 도메인

> **개정 2026-10-30 (`ADR-005`, `FE-REQ-052` FR-1).** zone 경계를 **도메인**으로 긋는다 — 셸 + 투자 · 저축 · 가계부 · 금융 팁.
> 9월의 zone 판정("세 조건을 모두 만족" · "탭 경계로 자르지 않는다")은 ADR-005 §1 · §4 가 대체했다.
> **2026-09-09 개정** — `@module-federation/nextjs-mf` 를 버리고 Multi-Zones 로(`ADR-001`). 그 이유(App Router 미지원 · 지원 종료)는 그대로다.

## 0. 지금 코드 상태 — 규칙과 다른 곳

| 항목 | 규칙(목표) | 지금 코드 | 닫는 곳 |
|---|---|---|---|
| zone 앱 | 5개(§1) | `apps/web` · `apps/web-tax`(90줄 자리표시자) | `FE-REQ-052` FR-2 · 6 · 7 |
| 레지스트리 · rewrites | `@repo/core/zones` 에서 생성 | 셸 `next.config.js` 에 `/tax` 손으로 | `FE-REQ-052` FR-2 · 3 |
| lint · 훅 도메인 축 | §3 | 레이어 축만 · `/tax` 하드코딩 | `FE-REQ-052` FR-4 · 5 |
| 화면 코드 위치 | `packages/domain-*` | `apps/web/src/**`(FSD) | `FE-REQ-053`(투자) · F012~F014 |

**강제는 코드다**(`layer-rules.cjs` · `eslint-plugin-zone` · `registry.ts`). 이 표의 행이 남아 있는 동안 새 화면은 지금 위치에 쓰되
§3 의 도메인 격리를 **지금부터** 지킨다 — 옮길 때 끊을 import 를 새로 만들지 않는다. 행이 닫히면 이 절에서 지운다.

## 1. zone = 도메인 (`ADR-005` §1)

| zone 앱 | 도메인 | 경로 | 화면 코드 | 포트 · assetPrefix |
|---|---|---|---|---|
| `apps/web` | 셸(default) | `/` `/home` `/login` `/onboarding` · 설정 | 셸 전용 | 3000 · — |
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
6. **하단 탭 · 헤더는 `@repo/ui` `AppChrome` 하나.** 공용 패키지(`ui` · `core` · `tokens`)를 바꾸면 영향 zone 을 **동시 배포**
7. **경로 prefix · assetPrefix 는 zone 간 유일.** 셸 rewrites 는 레지스트리에서 생성 — 손으로 쓰지 않는다

패키지 안 구조는 FSD 그대로(`layered-architecture.md`) — `domain-*` 안에 `entities` · `features` · `widgets` · `pages`.

## 3. 설정

```js
// apps/web-<domain>/next.config.js — basePath 없음, assetPrefix 만
const nextConfig = { assetPrefix: '/<domain>-static' };

// apps/web/next.config.js — 셸이 로컬 · 폴백 프록시. 규칙은 레지스트리에서 생성
async rewrites() { return zoneRewrites(ZONES, process.env); }   // ZONE_<NAME>_ORIGIN
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

- zone 판정은 레지스트리. `@repo/zone/no-cross-zone-link` 가 레지스트리 전체를 본다(지금은 `/tax` 만 — §0)

## 5. 대가와 완화 — hard navigation (`ADR-005` §3 · `FE-REQ-054`)

zone 을 넘는 이동은 문서 이동이다. 하단 탭이 가장 잦은 zone 간 이동이 된다.

| 장치 | 효과 | 한계 |
|---|---|---|
| Speculation Rules prerender(`eagerness: moderate`, 탭 4개 첫 화면만 · 로그아웃이면 끔) | 누르기 전에 다음 zone 첫 화면을 렌더 | Chromium 계열만 |
| 문서 간 View Transitions(`@view-transition { navigation: auto; }` · 탭 · 헤더 같은 `view-transition-name`) | 크롬 제자리 · 본문만 전환 | 같은 origin 만 · 줄인 모션이면 끔 |
| 첫 화면 숫자 서버 렌더 | 캐시가 비어도 숫자가 HTML 에 — 가격 깜빡임 금지 유지 | — |
| 공용 청크 같은 해시(`packages/config-next` 프리셋 하나) | React · 디자인 시스템 캐시 공유 | zone 별 설정이 같아야 |

- 셸 → 도메인 탭 전환 시간 · prerender 적중률을 브라우저별로 잰다(`FE-REQ-054` FR-6)

## 6. Server Actions

한 도메인이 여러 앱을 서비스하므로 origin 을 명시한다: `experimental.serverActions.allowedOrigins`.

## 7. 코드 공유

Multi-Zones 는 코드 공유 수단이 없다. **workspace 패키지로만** 공유한다.

- `apps/web-*` 가 다른 앱의 `src/**` 를 import 하면 **훅이 차단**한다
- 공유: `packages/tokens` · `ui` · `core` · `domain-*`(자기 zone 만 소비)
- zone 별 릴리스가 어긋날 수 있으므로 **zone 을 넘나드는 기능은 기능 플래그로 동시 활성화**한다

## 8. 하지 않는 것

- **`@module-federation/nextjs-mf` 를 다시 넣지 않는다.** 지원 종료 · App Router 미지원(`ADR-001`)
- **`packages/message-event-bus` 를 쓰지 않는다.** zone 간 통신은 URL 파라미터와 서버 상태로
- 도메인 사이 클라이언트 상태 공유 · 셸이 도메인 화면 코드 품기 · 탭(화면) 단위 zone
- **런타임 번들 조립(Module Federation)을 다시 도입하기 전에** `next-rspack` 안정 선언과 `@module-federation/enhanced` 의 App Router 공식 지원을 확인한다. 그때도 zone 하나를 실험 대상으로 삼고 ADR 로 남긴다 — Multi-Zones 가 그 실험을 zone 단위로 격리해 준다
