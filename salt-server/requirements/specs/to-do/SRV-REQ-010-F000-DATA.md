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
│                    HoldingPresenceAdapter(portfolio ACL — 개정 2026-09-21, 옛 LedgerPresenceAdapter) · PlanPresenceAdapter(plan ACL)
└── presentation/    auth.routes · auth.controller · dto/

src/market/
├── domain/          Watchlist · MarketAsset VO · WatchlistStore · MarketAssetProjection · CandleProbe
├── application/     AddToWatchlist · RemoveFromWatchlist · ListWatchlist · GetMarketOverview · GetCandles
├── infrastructure/  PrismaWatchlistStore · PrismaMarketAssetProjection · UpbitCandleClient · HoldingProbeAdapter(portfolio ACL, 2026-09-21)
│                    KisQuoteClient(스켈레톤 — 보류 Q2)
└── presentation/    market.routes(기존 investment.routes 이관) · controller · dto/

src/news/            domain/application/infrastructure/presentation (기존 modules/news 이관)
src/notification/    domain(NotificationKind 1종 · policy/kindGate) · application · infrastructure · presentation   ← 개정 2026-09-21 (ADR-002)
src/portfolio/       기존 modules/portfolio 이관 + summary Projection
```

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | 위 5개 컨텍스트를 만든다. 기존 `modules/{auth,investment,news,investment-notification,portfolio}`를 이관한다 | Must |
| FR-2 | `domain`이 `@prisma/client`·`express`·`axios`를 import하지 않는다 | Must |
| FR-3 | `auth`가 ~~`ledger`~~ **`portfolio`** · `plan`의 온보딩 완료 여부를 **ACL 어댑터**로 받는다. Prisma를 직접 읽지 않는다. **개정 2026-09-21** — `ledger` 컨텍스트는 ADR-002 로 생기지 않는다. 2단계는 "첫 보유 기록"(감사 문서 B12) | Must |
| FR-4 | ACL 이름에 컨텍스트를 쓰지 않고 **무엇을 가져오는지**를 쓴다(`HoldingPresenceAdapter` · `HoldingProbeAdapter`) | Must |
| FR-7 | `market` 이 추적 판정(`isHeld`)과 목표 수량 진행률이 보유를 **`portfolio` 공개 API 경유 ACL**(`HoldingProbeAdapter`)로 읽는다. `market`·`goals` 가 `PortfolioHolding` 을 Prisma 로 직접 읽지 않는다 (2026-09-21, D8 · 기본안 B5) | Must |
| FR-5 | **HTTP 경로를 이관 중 유지한다.** `/api/investment/*`가 `market` 컨텍스트로 옮겨져도 경로는 같다 | Must |
| FR-6 | `infrastructure/index.ts`가 Store 클래스를 export하지 않는다 | Must |

## KIS 조회 전용 클라이언트 — 자리만 잡는다

FEATURE-000 FR-35: *"`external/kis/` 조회 전용 클라이언트 스켈레톤. 실제 import는 FEATURE-001."*

> **개정 2026-09-21 — 이 절 전체 보류(열린 질문 Q2).** FEATURE-001 이 ADR-002 로 삭제됐고, 계좌 연동은 영구 Non-Goal(감사 문서 B12)이다. 남을 수 있는 것은 **국내 · 미국 시세 조회**(`KisQuoteClient`)뿐이고, 그것도 Q2(자산군 3종 유지)가 정해진 뒤다. `ledger/infrastructure/KisClient`(잔고 · 체결 GET)는 **만들지 않는다.** FR-15 의 CSV import 도 없다.

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
| `price-history.worker` | 유지 | ~~F001이 일봉을 쓴다~~ F004 관찰 구간 · 적중률(감사 문서 D2 · B9)과 기간 변동률이 일봉을 쓴다 (개정 2026-09-21) |
| `technical-indicator.worker` | 유지 | 코치가 지표를 쓴다 |
| `investment-insight.worker` | 유지 | 코치 생성 |
| `news-crawler.worker` | **유지** | 뉴스 실데이터 연결이 필요하다 |
| `notification-cleanup.worker` | 유지 | 알림 1종에도 필요 (개정 2026-09-21) |
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
- [ ] `auth`가 `portfolio`·`plan`을 ACL로 부른다 (개정 2026-09-21)
- [ ] `market`·`goals` 가 보유를 `HoldingProbeAdapter` 로만 읽는다 (`grep -rn "portfolioHolding" src/market src/modules/goals` = 0)
- [ ] ACL 이름에 컨텍스트 이름이 0건이다
- [ ] **기존 HTTP 경로가 그대로 동작한다** (스냅샷 테스트)
- [ ] ~~`KisQuoteClient`·`KisClient` 스켈레톤 · KIS 조회 1건~~ **개정 2026-09-21 — Q2 결정 전 확인하지 않는다.** 대신: `ledger/infrastructure/KisClient` 가 0건이고, KIS 관련 코드가 생기더라도 **주문·출금 메서드가 0건이다**
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
- ~~**후속:** `SRV-REQ-012`(F001)가 KIS 스켈레톤을 채운다~~ — 개정 2026-09-21: SRV-REQ-012 는 ADR-002 로 삭제. KIS 는 Q2 에 달렸다
- **정리 항목의 소유:** 레거시 모델 · 중복 worker · 동면 410 · `AssetType` 은 `SRV-REQ-007`(결정)과 이 REQ(실행)가 가진다. `FEATURE-000` 은 여기를 가리킨다(감사 문서 §4 `scope` 행 — 코드 미완)
- **규칙:** `ddd-infrastructure.md` · `workers-external.md`

## Open Questions

- **Q2(감사 문서)** — 자산군 3종 유지 여부. KIS 절 전체가 이 결정을 기다린다.
- **KIS 오픈API 인증 방식과 조회 한도.** 앱키·앱시크릿·접근토큰 갱신 주기를 확인해야 스켈레톤을 만들 수 있다.
- 종합계좌와 모의계좌 중 어느 것으로 개발할지. **모의계좌로 시작**이 안전하다.
- 이관 중 경로 유지(FR-5)를 위해 `app.ts`가 새 컨텍스트의 라우터를 옛 경로에 마운트해야 한다. 그것이 지저분하면 **경로 변경을 프론트와 함께** 하는 것도 방법이다.

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-09-21 | **스토리보드 갭 감사 + ADR-002 반영.** 추가: FR-7(`HoldingProbeAdapter` — 추적 판정 · 수량 목표가 보유를 ACL 로 읽는다, D8 · B5). 개정: FR-3 · 4 `ledger` ACL → `portfolio`(B12) · KIS 절 전체 **보류(Q2)**, `ledger/KisClient` 만들지 않음 · 알림 2종 → 1종 · `price-history.worker` 유지 근거 F001 → F004 · 삭제된 SRV-REQ-012 후속 제거. 정리 항목(레거시 모델 · 중복 worker · 동면 410 · `AssetType`)은 **본문 그대로** — FEATURE-000 이 이 REQ 를 가리킨다. 근거: `pm/requirements/reports/feature-audits/2026-09-21-storyboard-gap.md` |
