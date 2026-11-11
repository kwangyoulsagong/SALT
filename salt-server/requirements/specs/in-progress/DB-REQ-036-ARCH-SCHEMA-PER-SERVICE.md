---
id: DB-REQ-036
area: db
kind: ARCH
title: "서비스별 스키마 · DB 계정 — 테이블 하나에 주인 하나, Prisma → Flyway 주인 이전"
priority: high
created: 2026-10-30
source: requirements/decisions/ADR-006-server-msa-kotlin.md
---

## Summary

지금은 `public` 하나에 Prisma 모델 ~~42개~~ **41개(정정 2026-11-03, 부록 A)**, `forecast` 스키마(테이블 24 · 뷰 13)가 같은 DB 계정으로 섞여 있다.
MSA(`ADR-006`)의 전제는 **테이블 하나에 주인 하나**다. 물리 DB 는 하나로 두고 **스키마 + 계정**으로 먼저 가른다.

## FR

| FR | 내용 |
|---|---|
| FR-1 | 스키마 9개 — `identity` · `savings` · `household` · `content` · `market` · `portfolio` · `coach` · `notification` · `forecast`. 서비스마다 DB 계정 하나, 자기 스키마만 쓰기 · 다른 스키마 권한 없음 |
| FR-2 | 테이블 → 주인 표를 이 REQ 부록으로 만든다(Prisma 모델 ~~42개~~ **41개 — 정정 2026-11-03**: 10-30 `AIAnalysis*` 2 drop · 11-02 `KrIndexTick` 1 추가. 부록 A) 전부. 주인 없는 테이블 0, 주인 둘 0. 동면 모듈(mission · dashboard · feed) 테이블은 "옮기지 않음"으로 표시 |
| FR-3 | 다른 스키마를 조인하는 쿼리 목록(grep 근거, **부록 B — 2026-11-03**)을 만든다 — 각각 이벤트 · 프로젝션(`SRV-REQ-044`) 또는 export 뷰로 바꾼다. 이전 단계 S 번호를 붙인다 |
| FR-4 | 주인 이전 순서 — 경로가 Kotlin 으로 넘어가는 단계(S1~S6)에 그 테이블의 DDL 주인도 Prisma → Flyway. 한 테이블이 두 도구의 마이그레이션에 동시에 있지 않다 |
| FR-5 | Flyway baseline = 이전 시점 Prisma 마이그레이션 마지막 상태(`prisma migrate diff` 로 SQL 추출). 서비스별 `V1__baseline.sql` |
| FR-6 | `public` → 서비스 스키마 이동은 `ALTER TABLE ... SET SCHEMA` + 옛 이름 호환 뷰(1단계 동안)로. 되돌리기 = 역방향 `SET SCHEMA` |
| FR-7 | export 뷰 — `market.v_daily_close_export` · `market.v_holidays_export` · `market.v_kr_stock_master_export` · `coach.v_judgment_ledger_export` · **`market.v_tracked_symbols_export`(추가 2026-11-03 — 보유 ∪ 관심 국내 종목 코드, 사용자 열 0. 부록 B9)**. forecast 는 이 뷰만 읽는다(`FC-REQ-025`) |
| FR-8 | 판정 원장 불변 트리거(UPDATE 차단)는 스키마 이동 뒤에도 남는다 — 이동 마이그레이션 테스트가 UPDATE 실패를 확인한다 |
| FR-9 | 금액 열은 NUMERIC 정밀도 그대로(Kotlin `BigDecimal`). 이동 중 타입 변경 0 |

## Acceptance Criteria

- [x] 서비스 계정으로 다른 스키마 SELECT 가 권한 오류 — S0 `PlatformEndToEndTest`(svc_ping → `savings.probe` 42501 · `public` CREATE 42501, 2026-11-03)
- [x] 주인 표에 ~~42개~~ **41개**(정정 2026-11-03) 모델 전부 · 이중 주인 0 — 부록 A
- [ ] 판정 원장 UPDATE 가 이동 뒤에도 실패
- [ ] 스키마 이동 마이그레이션 왕복(이동 → 되돌림) 테스트 통과

## 부록 A — 테이블 주인 표 (2026-11-03, `salt-server/prisma/schema.prisma` 모델 41)

근거: Express 코드의 Prisma 호출 위치(`prisma.<model>.` 를 컨텍스트별로 셈, 테스트 제외) · `ADR-006` §1 서비스 표. 한 줄에 주인 하나.

| 서비스(스키마) | 단계 | 모델(테이블) |
|---|---|---|
| `identity` | S3 | `User`(users) · `InviteCode`(invite_codes) · `InviteCodeAttempt`(invite_code_attempts) |
| `savings` | S1 | `Goal`(goals) · `SavingTransaction`(saving_transactions) |
| `notification` | S2 | ~~`InvestmentNotification`(InvestmentNotification — 테이블 이름이 모델 이름 그대로, 이동 때 `notifications` 로 바꿀지 S2 에서)~~ **2026-11-06 S2c 이동 끝** — `notification.notification` · `notification_pref`(Flyway). 옛 표 drop |
| `portfolio` | S4 | `PortfolioTransaction`(portfolio_transactions) · `PortfolioHolding`(portfolio_holdings) |
| `market` | S5 | `InvestmentWatchlist`(investment_watchlist) · `NewsArticle`(news_articles) · `NewsBookmark`(news_bookmarks) · `MarketAsset`(market_assets) · `MarketSentiment`(market_sentiments) · `WhaleTransaction`(whale_transactions) · `PriceHistory`(price_history) · `TechnicalIndicator`(technical_indicators) · `KrStockMaster`(kr_stock_master) · `KrStockQuote`(kr_stock_quotes) · `KrIndexQuote`(kr_index_quotes) · `KrIndexTick`(kr_index_ticks) · `KrStockInvestorFlow`(kr_stock_investor_flows) · `ExternalApiToken`(external_api_tokens) · `MarketHoliday`(market_holidays) · **더함 2026-11-09**(F016 단계 A~C · 기사 본문 — 빠져 있던 것): `kr_vi_event` · `kr_market_action` · `kr_news_title` · `kr_news_title_symbol` · `kr_sector_index_quote` · `kr_sector_index_daily` · `kr_flow_intraday` · `kr_index_name` · `news_article_body`(`DB-REQ-042`) · **더함 2026-11-11**: `MarketUniverseSnapshot`(market_universe_snapshot) · `PriceFillMark`(price_fill_mark)(`DB-REQ-044`) |
| `coach` | S6 | `UserInvestmentProfile`(user_investment_profiles) · `TradePlan`(trade_plans) · `MonthlyReview`(monthly_reviews) · `DecisionOutcome`(decision_outcomes) · `CoachGenerationLog`(coach_generation_logs) · `LlmCallLog`(llm_call_logs) · `InvestmentInsight`(investment_insights) · `CoachRecommendationSnapshot`(coach_recommendation_snapshots) · `SymbolJudgmentSnapshot`(symbol_judgment_snapshots) · `JudgmentLedgerEntry`(judgment_ledger) · `GaugeTrackRecord`(gauge_track_records) |
| 옮기지 않음 — 동면 | — | `DailyMission`(daily_missions) · `UserMissionProgress`(user_mission_progress) · `UserAchievement`(user_achievements) · `PointTransaction`(point_transactions) — `modules/mission` · `modules/user` 의 포인트 · 업적(410) |
| 옮기지 않음 — **사용처 0 · 행 0**(drop 후보) | S2 전 | `SentimentAlert`(sentiment_alerts) · `SmartMoneyAlert`(smart_money_alerts) · `ExecutionLog`(execution_logs) — 코드 호출 0 · 로컬 DB 행 0(2026-11-03). `ExecutionLog`("투자 실행 기록")는 주문 코드 경로 0 원칙과도 맞지 않는다. drop 은 `DB-REQ-003` 과 같은 절차(덤프 · 원장 3종 행 수 대조)로 따로 |

합계: identity 3 · savings 2 · notification 1 · portfolio 2 · market 15 · coach 11 · 동면 4 · drop 후보 3 = **41**. 이중 주인 0.
`forecast` 스키마(테이블 · 뷰)는 이미 따로라 이 표 밖(`salt-forecast` — `ADR-007`). S0 의 `ping` 스키마는 플랫폼 점검용(`SRV-REQ-043` FR-13).

## 부록 B — 주인 경계를 넘는 참조 (2026-11-03, grep 근거)

지금은 전부 `public` 한 스키마라 "다른 스키마 조인"은 없다 — **스키마를 가르는 순간 깨질 참조**를 센다. 각 줄이 그 단계에서 무엇으로 바뀌는지.

| # | 참조 | 근거 | 바꾸는 방식 | 단계 |
|---|---|---|---|---|
| B1 | 모든 서비스 표 → `users.id` FK(`onDelete: Cascade`) — savings 2 · market 2 · portfolio 2 · notification 1 · coach 8 · drop 후보 3 · 동면 3(`daily_missions` 는 FK 없음) | `schema.prisma` `@relation(... references: [id])` | FK 를 끊고 `user_id` 는 그냥 열. 탈퇴 연쇄 삭제는 `identity.UserDeletionRequested` 구독(`SRV-REQ-044` FR-4) | 각 서비스 이전 단계(S1 savings 부터) |
| B2 | `trade_plans` · `decision_outcomes` → `portfolio_transactions` FK | `schema.prisma` | coach 쪽 거래 프로젝션(`portfolio.TransactionRecorded`) | S4 · S6 |
| B3 | `modules/user` → `goal.count` · `savingTransaction` · `investmentWatchlist` · 포인트 · 업적 | `modules/user/user.service.ts` | 프로필 통계는 BFF 병렬 호출로(서버끼리 부르지 않는다) | S1 · S3 |
| B4 | `composition.ts:310` 온보딩 "목표 있음" → `goal.count` | `composition.ts` | `savings` 내부 REST(서비스 토큰) 또는 `savings.GoalCreated` 프로젝션 | S1 · S3 |
| B5 | 코치 워커 → `user.findMany`(사용자 목록) 3곳 | `workers/investment-insight.worker.ts` | coach 의 사용자 프로젝션(`identity.UserRegistered`) | S6 |
| B6 | `modules/investment-insight`(coach) → `portfolioHolding` · `marketAsset` · `marketSentiment` · `priceHistory` · `technicalIndicator` | Prisma 호출 셈 | 보유 = 프로젝션, 시장 = market 내부 REST · export 뷰 | S6 |
| B7 | `notification-cleanup.worker` → `investmentNotification` | `workers/` | notification 서비스 안으로(같은 주인) | S2 |
| B8 | 예측 → `public.price_history` · `market_holidays`(2) · `kr_stock_master`(+ `sector_mid_code` 2026-11-09) · `judgment_ledger` · **`kr_sector_index_daily`(추가 2026-11-09 — F016 β 재료, `FC-REQ-027`)** | `salt-forecast/src/salt_forecast/store/kr_stock.py` · `ops.py` | FR-7 export 뷰 4 | S5 · S6 |
| B9 | **예측 → `public.portfolio_holdings` ∪ `investment_watchlist`(국내 추적 종목 코드)** | `store/kr_stock.py:108` | **FR-7 에 뷰가 없다** — `market.v_tracked_symbols_export`(코드만, 사용자 0) 같은 뷰 하나를 S5 에 더한다. 보유 쪽은 portfolio 주인이라 market 이 프로젝션으로 합친다 | S4 · S5 |
| B10 | 동면 모듈(`dashboard` · `feed` · `mission`) → 보유 · 인사이트 · 알림 · 사용자 | Prisma 호출 셈 | 옮기지 않음 — S7 에 410 을 BFF 로(`BFF-REQ-045` FR-8) 옮기며 코드째 삭제 | S7 |
| B11 | 예측 → `public.market_universe_snapshot`(그날 추적하던 종목 — 과거 검산 표본, `FC-REQ-028` FR-5) | `DB-REQ-044` FR-3 | export 뷰 `market.v_universe_snapshot_export`(사용자 열 0) | S5 |

Express 쪽 raw SQL 로 남의 표를 읽는 곳은 0(같은 grep — `market` 이 자기 표끼리만 조인). 새로 늘리지 않는다(`msa-services.md` §5).

## 계약 영향

- 서버 `SRV-REQ-043`(플랫폼) · `SRV-REQ-049`(투자 이전) · 예측 `FC-REQ-025` · `ADR-007`

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-30 | 신규(to-do) |
| 2026-11-02 | 국내 탭 요약 띠(`feat/kr-market-summary`, 루트 `F011-kr-market-summary-slice.md`): FR-2 주인 표 대상 모델 42 → **43** — `KrIndexTick`(`kr_index_ticks`, 주인 `market`). `KrIndexQuote` 열 3 추가(주인 그대로) |
| 2026-11-03 | **S0**(`feat/srv-req-043-s0-platform`, 루트 `MONEY-S0-platform-slice.md`) — to-do → in-progress. FR-1 첫 판: `salt-platform/db/roles.sql`(스키마 9 + `ping`, 계정 `svc_<service>` · 스키마 주인 = 서비스 계정 · `REVOKE ALL FROM PUBLIC` · 아직 안 옮긴 서비스는 NOLOGIN) — Compose · Testcontainers 에서 실측, **로컬 운영 DB 에는 아직 안 돌림**(S1). FR-2 부록 A(41 — 42 정정) · FR-3 부록 B(10줄, 예측 추적 종목 읽기 B9 는 FR-7 에 뷰가 없던 빈칸). FR-5 서비스별 `V1__baseline.sql` 은 `ping` 에서 형태 확정(아웃박스 · 멱등 · ShedLock 표 셋이 모든 서비스 스키마 공통). FR-4 · 6 · 8 · 9 와 나머지 FR-7 은 각 이전 단계 |
| 2026-11-03 | 되돌리기 `salt-platform/db/roles-rollback.sql`(빈 스키마만 · CASCADE 없음 · 기존 `forecast` 유지) — 버리는 Postgres 14 에서 적용 2회 · 되돌림 왕복 확인. **로컬 운영 DB 적용은 권한 확인에서 막혀 사용자 실행으로**(루트 체크리스트 §4 명령) |
| 2026-11-03 | FR-1 로컬 운영 DB **적용 2026-11-03**(사용자 "너가 다해줘") — 롤 덤프 백업 뒤 `roles.sql`: 서비스 스키마 9 + `ping` · 계정 10(`svc_ping` 만 로그인) · `forecast` 주인 postgres 그대로 · `public` 42 표 그대로 · `svc_ping` 의 `public.users` 읽기 권한 오류 · 서버 · BFF 200 · Prisma 상태 일치 |
| 2026-11-03 | 커밋 대조 — `fafb6a0d`(roles.sql · ping V1) · `405e5683`(되돌리기 · outbox seq · dead_at) · `b308718e`(부록 A · B) · `5281928e`(운영 DB 적용 기록). 수용 기준 2/4(남은 둘은 표 이동 S1~) — in-progress |
| 2026-11-03 | MONEY-S1a — 이 REQ 에 걸린 몫(`e83f7f80`): S1 첫 표 이동 — `roles.sql` `svc_savings` 로그인(로컬 운영 DB 적용, 비밀 `LOCAL_DB_SAVINGS_PASSWORD`) · Flyway V1 savings(업무 3 + 공용 3) · 권한 테스트 표 `savings.probe` → `household.probe` · 옛 `public.goals` · `saving_transactions` 가져오기 SQL. public 원본 · Prisma 모델 삭제는 옛 Express 삭제와 같이 |
| 2026-11-04 | 가계부 S1a(`MONEY-S1-household-entry`) — `svc_household` 로그인을 연다(`db/roles.sql` · `init.sh` · compose — `63146ddf`). **로컬 운영 DB 적용 2026-11-04**(ALTER ROLE · 비밀 `salt-platform/.env` `LOCAL_DB_HOUSEHOLD_PASSWORD`) · household 스키마 표 4 + Flyway 이력 |
| 2026-11-05 | 금융 팁 S2a(`MONEY-S2a-tips-content`, 루트 `requirements/specs/done/MONEY-S2a-tips-content-slice.md`) — 이 REQ 에 걸린 몫: content 스키마가 플랫폼에서 태어나 `svc_content` 로그인을 연다(`roles.sql` · `init.sh` · Compose · 로컬 운영 DB 관리자 적용). 권한 검사 표본을 `content.probe` → `identity.probe`(content 는 Flyway 가 쓴다). Flyway V1 = 공통 세 표 + 글 · 파라미터 · 트리거 · 닫기 · 신호 |
| 2026-11-06 | 서버 S2c(notification, 루트 `requirements/specs/done/MONEY-S2c-notification-slice.md`): 부록 notification 행 — `InvestmentNotification` → Kotlin `notification.notification`(가져오기 1행 대조 · drop) · B7 정리 워커 notification 안으로 · `svc_notification` · `svc_coach`(아웃박스만) 로그인. 테스트 Postgres 연결 상한 300 |
| 2026-11-06 | 서버 S3a identity 셸 설정(`MONEY-S3a-identity-shell`): FR-1 — identity 가 플랫폼에서 로그인(`svc_identity` · `roles.sql` · Compose · 로컬 운영 DB 관리자 적용 2026-11-06). 권한 검사 표본 `identity.probe` → `portfolio.probe`. identity 스키마 표 = `user_domain_pref`(+ 공통 셋) — 부록 A 의 `users` · `invite_codes` · `invite_code_attempts` 이동은 S3b `fc0207cb` |
| 2026-11-09 | 부록 B8 에 예측 읽기 하나 더 — `kr_sector_index_daily`(지수 · 업종 일별) · 마스터 중분류 칸(F016 단계 C). S5 export 뷰 목록에 같이 |
| 2026-11-09 | 부록 A `market` 행에 F016 국내 표 여덟 · `news_article_body` 더함 — 단계 A~C 가 표를 만들고 주인 표에 안 적었다(기사 본문 확인 2회차에서 발견) |
| 2026-11-11 | 부록 A market 행에 `market_universe_snapshot` · `price_fill_mark`(`DB-REQ-044`, F017 단계 1c) · 부록 B 에 B11(예측의 스냅샷 읽기 — S5 export 뷰) |
| 2026-11-11 | `feat/f017-s1c-collection`: 부록 A market 행에 `market_universe_snapshot` · `price_fill_mark` · 부록 B11(예측 스냅샷 읽기 — S5 export 뷰) |
