---
id: SRV-REQ-010
feature: F000
area: srv
kind: DATA
title: "F000 정리·편집 — 컨텍스트·워커·외부 연동 정의 (KIS 스켈레톤 · 동면 처리)"
priority: high
labels: [ddd, infrastructure, worker, kis, dormant]
created: 2026-09-09
---

## Summary

F000의 데이터 계층 작업은 **① 기존 모듈을 컨텍스트로 옮기고 ② 동면 모듈을 그대로 두고 ③ KIS 조회 전용 클라이언트 자리를 잡는 것**이다.

## 컨텍스트 구조

```
src/auth/
├── domain/          InviteCode · Session · InviteCodeStore · UserCountProbe · policy/{inviteAcceptance,onboardingProgress}
├── application/     AcceptInviteCode · Login · RefreshSession · GetOnboardingStatus · api/{SessionQuery,SessionView}
├── infrastructure/  PrismaInviteCodeStore · PrismaUserCountProbe · JwtIssuer · PasswordHasher
│                    LedgerPresenceAdapter(ledger ACL) · PlanPresenceAdapter(plan ACL)
└── presentation/    auth.routes · auth.controller · dto/

src/market/
├── domain/          Watchlist · MarketAsset VO · WatchlistStore · MarketAssetProjection · CandleProbe
├── application/     AddToWatchlist · RemoveFromWatchlist · ListWatchlist · GetMarketOverview · GetCandles
├── infrastructure/  PrismaWatchlistStore · PrismaMarketAssetProjection · UpbitCandleClient · KisQuoteClient(스켈레톤)
└── presentation/    market.routes(기존 investment.routes 이관) · controller · dto/

src/news/            domain/application/infrastructure/presentation (기존 modules/news 이관)
src/notification/    domain(NotificationKind 2종 · policy/kindGate) · application · infrastructure · presentation
src/portfolio/       기존 modules/portfolio 이관 + summary Projection
```

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | 위 5개 컨텍스트를 만든다. 기존 `modules/{auth,investment,news,investment-notification,portfolio}`를 이관한다 | Must |
| FR-2 | `domain`이 `@prisma/client`·`express`·`axios`를 import하지 않는다 | Must |
| FR-3 | `auth`가 `ledger`·`plan`의 온보딩 완료 여부를 **ACL 어댑터**로 받는다. Prisma를 직접 읽지 않는다 | Must |
| FR-4 | ACL 이름에 컨텍스트를 쓰지 않고 **무엇을 가져오는지**를 쓴다(`LedgerPresenceAdapter`) | Must |
| FR-5 | **HTTP 경로를 이관 중 유지한다.** `/api/investment/*`가 `market` 컨텍스트로 옮겨져도 경로는 같다 | Must |
| FR-6 | `infrastructure/index.ts`가 Store 클래스를 export하지 않는다 | Must |

## KIS 조회 전용 클라이언트 — 자리만 잡는다

FEATURE-000 FR-35: *"`external/kis/` 조회 전용 클라이언트 스켈레톤. 실제 import는 FEATURE-001."*

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | `market/infrastructure/KisQuoteClient`와 `ledger/infrastructure/KisClient`를 **스켈레톤으로** 만든다 | Must |
| FR-11 | **조회 메서드만** 정의한다: 계좌 잔고 GET · 체결내역 GET · 국내/해외 시세 GET | Must |
| FR-12 | **주문·출금 메서드를 정의하지 않는다.** Port에 그 시그니처가 없다 | Must |
| FR-13 | 인증(앱키·앱시크릿·접근토큰 갱신)을 구현한다. 토큰 갱신 주기를 확인해야 한다 | Must |
| FR-14 | 조회 API 1건 호출 성공을 수용 기준으로 한다. **전체 연동은 F001** | Must |
| FR-15 | **CSV import를 1순위 경로로 유지**한다. KIS API는 편의 기능이다 — 정책·한도가 바뀔 수 있다 | Must |
| FR-16 | 종합/모의계좌 선택을 설정으로 노출한다 | Should |

## 동면 처리

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | `modules/mission` · `modules/feed` · `modules/dashboard` · `insight-ranking.controller`를 **DDD로 옮기지 않는다.** `src/modules/` 아래 그대로 둔다 | Must |
| FR-21 | `app.ts`에서 그 route 등록을 제거한다. **파일은 삭제하지 않는다** | Must |
| FR-22 | 동면 경로에 **410 Gone 핸들러**를 등록한다. 경로 목록을 상수로 관리한다 | Must |
| FR-23 | 410 로그를 1주간 수집한다. 잔여 호출이 있으면 프론트를 고친다 | Must |
| FR-24 | 되살리기 테스트: route 재등록 → 200 → 되돌림. **1회 수행하고 기록한다** | Must |
| FR-25 | 센티먼트·고래 알림 **생성 worker 호출을 끊는다.** worker 파일은 남긴다 | Must |
| FR-26 | `MarketSentiment`·`WhaleTransaction` **조회 경로는 유지**한다(`market-intelligence`) | Must |

## 워커 정리

| 워커 | 조치 | 근거 |
|---|---|---|
| `market-price-updater.worker` (서버) | **삭제** | BFF `price-updater.worker`와 이중 갱신 |
| `market-sync.worker` | 유지 | `limit=100` 유지이므로 필요 |
| `price-history.worker` | 유지 | F001이 일봉을 쓴다 |
| `technical-indicator.worker` | 유지 | 코치가 지표를 쓴다 |
| `investment-insight.worker` | 유지 | 코치 생성 |
| `news-crawler.worker` | **유지** | 뉴스 실데이터 연결이 필요하다 |
| `notification-cleanup.worker` | 유지 | 알림 2종에도 필요 |
| 센티먼트·고래 알림 생성 | **호출 끊기** | 동면 |

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | `market-price-updater.worker`를 삭제하고 `app.ts`에서 `marketPriceUpdater.start()`를 제거한다 | Must |
| FR-31 | 워커 등록을 **`shared/infrastructure`의 스케줄러**로 옮긴다. `app.ts`에 `new Worker().start()`를 늘리지 않는다 | Must |
| FR-32 | 워커는 스케줄과 락만 담당하고 `application` 유스케이스를 부른다 | Must |
| FR-33 | 정리 전/후 **기동 워커 수와 상시 DB 커넥션 수**를 측정해 기록한다 | Must |
| FR-34 | `MarketAsset` 갱신이 **BFF worker 단일 경로**로 유지됨을 확인한다 | Must |

## 빌드 산출물 제거

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-40 | 커밋된 `src/**/*.js` · `*.d.ts` · `*.js.map` **24개 파일**을 제거한다 | Must |
| FR-41 | `.gitignore`에 패턴을 추가한다 | Must |
| FR-42 | `git ls-files 'salt-server/src/**/*.js'` = 0을 확인한다 | Must |

## Acceptance Criteria

- [ ] 5개 컨텍스트가 4층 구조로 존재한다
- [ ] `grep -rn "@prisma/client\|express\|axios" src/{auth,market,news,notification,portfolio}/domain` = 0
- [ ] `auth`가 `ledger`·`plan`을 ACL로 부른다
- [ ] ACL 이름에 컨텍스트 이름이 0건이다
- [ ] **기존 HTTP 경로가 그대로 동작한다** (스냅샷 테스트)
- [ ] `KisQuoteClient`·`KisClient` 스켈레톤이 있고 **주문·출금 메서드가 0건이다**
- [ ] KIS 조회 API 1건 호출이 성공한다
- [ ] 동면 모듈 4종의 코드 파일이 `src/modules/`에 남아 있다
- [ ] `app.ts`에 동면 route 등록이 0건이다
- [ ] 동면 경로가 **410 Gone**이고 1회 로그를 남긴다
- [ ] **되살리기 테스트 1회가 수행되고 기록되어 있다**
- [ ] 센티먼트·고래 알림 생성 호출이 0건이고 worker 파일은 남아 있다
- [ ] `MarketSentiment`·`WhaleTransaction` 조회가 동작한다
- [ ] `market-price-updater.worker`가 없고 `app.ts`에 참조가 0건이다
- [ ] 워커 등록이 `shared/infrastructure` 스케줄러 경유다
- [ ] **정리 전/후 워커 수와 상시 커넥션 수가 기록되어 있다**
- [ ] `MarketAsset` 갱신이 BFF 단일 경로다
- [ ] `git ls-files 'salt-server/src/**/*.js' 'salt-server/src/**/*.d.ts' 'salt-server/src/**/*.js.map'` = 0
- [ ] `.gitignore`에 빌드 산출물 패턴이 있다
- [ ] `npm run build` 통과

## Dependencies

- **선행:** `SRV-REQ-006`(DDD) · `SRV-REQ-007`(정리 결정) · `SRV-REQ-008`(도메인)
- **후속:** `SRV-REQ-012`(F001)가 KIS 스켈레톤을 채운다
- **규칙:** `ddd-infrastructure.md` · `workers-external.md`

## Open Questions

- **KIS 오픈API 인증 방식과 조회 한도.** 앱키·앱시크릿·접근토큰 갱신 주기를 확인해야 스켈레톤을 만들 수 있다.
- 종합계좌와 모의계좌 중 어느 것으로 개발할지. **모의계좌로 시작**이 안전하다.
- 이관 중 경로 유지(FR-5)를 위해 `app.ts`가 새 컨텍스트의 라우터를 옛 경로에 마운트해야 한다. 그것이 지저분하면 **경로 변경을 프론트와 함께** 하는 것도 방법이다.
