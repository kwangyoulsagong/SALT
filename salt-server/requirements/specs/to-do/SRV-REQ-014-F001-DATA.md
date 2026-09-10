---
id: SRV-REQ-014
feature: F001
area: srv
kind: DATA
title: "F001 개입 청구서 — 컨텍스트·워커·외부 연동 정의"
priority: critical
labels: [ddd, infrastructure, worker, external, upbit, kis, fx]
created: 2026-09-09
---

## Summary

`ledger` · `invoice` · `fx` 컨텍스트의 구조, Port 구현, 외부 클라이언트, 워커를 정의한다.

## 컨텍스트 구조

```
src/ledger/
├── domain/         Transaction · CashFlow · ExchangeKey · TransactionStore · CashFlowStore
│                   PriceProbe · ExchangeProbe · HoldingProjection · policy/sourceRef
├── application/    ImportUpbitCsv · ImportKisTrades · SyncExchangeOrders · RegisterExchangeKey
│                   CheckLedgerHealth · BackfillDailyCloses · api/{LedgerQuery,TransactionView}
├── infrastructure/ PrismaTransactionStore · PrismaCashFlowStore · PrismaExchangeKeyStore
│                   UpbitCsvParser · KisCsvParser · UpbitClient · KisClient
│                   PriceProbeAdapter · mappers/
└── presentation/   ledger.routes · ledger.controller · dto/

src/invoice/
├── domain/         InvoiceSnapshot · TradeAttributionEntry · SnapshotStore · AttributionStore
│                   CostBasisSource(Port) · BiasLabelSource(Port)
│                   policy/{counterfactual,attribution,reconciliation,biasLabel}
├── application/    RecomputeInvoiceSnapshot · GetInvoice · ListTradeAttributions
├── infrastructure/ PrismaSnapshotStore · PrismaAttributionStore
│                   BiasLabelAdapter(coach ACL) · FeeProjection · GeminiNarrativeClient
└── presentation/   invoice.routes · invoice.controller · dto/

src/fx/
├── domain/         FxRate VO · FxRateStore · FxRateProbe
├── application/    CollectFxRates · GetSettlementRate · api/{FxRateQuery,FxRateView}
├── infrastructure/ PrismaFxRateStore · FxSourceClient
└── presentation/   fx.routes · fx.controller
```

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | 위 구조로 만든다. `domain`은 `@prisma/client`·`express`·`axios`를 import하지 않는다 | Must |
| FR-2 | `invoice`가 `ledger`의 데이터를 쓰지만 **`ledger/application/api`를 통해서만** 부른다. Prisma를 직접 읽지 않는다 | Must |
| FR-3 | 편향 라벨은 `coach/application/api`를 `BiasLabelAdapter`(ACL)로 감싼다. **ACL 이름에 컨텍스트를 쓰지 않는다** — 무엇을 가져오는지를 쓴다 | Must |
| FR-4 | 취득가액이 필요하면 `tax/application/api`를 `CostBasisAdapter`로 감싼다(F002 이후) | Should |
| FR-5 | `infrastructure/index.ts`에서 Store 클래스를 export하지 않는다. DI 등록 함수만 | Must |

## 외부 클라이언트

| 클라이언트 | 컨텍스트 | 용도 | 제약 |
|---|---|---|---|
| `UpbitClient` | `ledger` | 일봉 candles 백필 · **accounts 조회** · **orders 조회** | **조회 전용.** 주문·출금 메서드를 만들지 않는다. rate limit 준수 |
| `KisClient` | `ledger` | 국내·미국 주식 **잔고·체결내역 GET** | 동일. 무료 오픈API. 조회 전용 사용 |
| `FxSourceClient` | `fx` | 결제일 기준환율 | 소스 미확정 (Open Question) |
| `GeminiNarrativeClient` | `invoice` | 청구서 3문장 | **숫자 주입, 문장만 생성** |

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | **`ExchangeProbe` Port에 주문·출금 메서드가 없다.** 클라이언트에도 그 엔드포인트를 호출하는 코드가 없다 | Must |
| FR-11 | 외부 호출에 타임아웃과 재시도 상한(지수 백오프 3회)을 준다 | Must |
| FR-12 | 업비트 rate limit을 준수한다. 초과 시 백오프하고 실패를 사용자에게 알린다 | Must |
| FR-13 | **모든 외부 호출은 트랜잭션 밖**이다. Port Javadoc/주석에 명시한다 | Must |
| FR-14 | KIS는 **조회 전용으로 사용**한다. 종합/모의계좌 선택을 설정으로 노출한다 | Must |
| FR-15 | CSV import를 **1순위 경로로 유지**한다. API는 편의 기능이다 — KIS 정책·한도가 바뀔 수 있다 | Must |

## 매핑

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | `mappers/`에서 Prisma row ↔ 도메인 변환을 한다 | Must |
| FR-21 | **`Float` 컬럼을 읽을 때 `Decimal`로 승격**한다. `DB-REQ-007` M9 이전까지 이 승격이 계산 정확도를 지키는 유일한 장치다 | Must |
| FR-22 | `settlementDate`가 null인 레거시 row는 `transactionDate`로 대체한다. **그 규칙을 매퍼 한 곳에만** 둔다 | Must |
| FR-23 | 외화 거래는 `priceCurrency × fxRate`로 원화를 만들고, `fxRate`가 없으면 **그 거래를 계산에서 제외**하고 `degraded`에 표시한다 | Must |

## Projection

| Projection | 쿼리 | 대체하는 것 |
|---|---|---|
| `FeeProjection.sumInRange` | `SUM(fee), COUNT(*)` | 거래 5,000건 로드 후 reduce |
| `BiasBreakdownProjection.groupByLabel` | `GROUP BY` | 귀속 5,000건 로드 후 그룹핑 |
| `AttributionProjection.topByPnl` | `ORDER BY attributedPnl LIMIT 3` | 전체 정렬 후 slice |
| `HoldingProjection.summary` | `PortfolioHolding` 조회 | 거래 전부 로드 |

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | 위 4개를 **`domain`에 Port로 선언**하고 `infrastructure`가 구현한다. `application`이 `infrastructure` 인터페이스를 import하면 훅이 막는다 | Must |
| FR-31 | 반환 타입은 `domain`이 소유하는 읽기 전용 타입이다 | Must |

## 워커

| 워커 | 주기 | 하는 일 | 멱등 | 락 |
|---|---|---|---|---|
| `counterfactual.worker` | **월 09:00 KST** | 전 window 스냅샷 생성 | `(userId, window, computedAt)` upsert | **userId advisory lock** |
| `fx-rate.worker` | 일 1회 | 결제일 기준환율 수집·백필 | `(base, quote, rateDate, kind)` upsert | — |
| `price-history.worker` | 기존 | **일봉 결측 감지 시 백필 트리거 추가** | 기존 유니크 | — |

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-40 | 워커는 **스케줄과 락만** 담당하고 `application`의 유스케이스를 부른다 | Must |
| FR-41 | `counterfactual.worker`는 `pg_try_advisory_xact_lock(hashtext('counterfactual:' || userId))`을 잡는다 | Must |
| FR-42 | 실패는 **지수 백오프 3회**. 최종 실패 시 **마지막 스냅샷을 유지**하고 알림 | Must |
| FR-43 | **LLM을 부르는 워커(`counterfactual`)와 DB만 훑는 워커를 같은 큐에 넣지 않는다.** 앞의 것이 수십 초를 잡으면 뒤의 것이 아무 일도 못 하고 기다린다 | Must |
| FR-44 | `fx-rate.worker` 실패 시 해당 날짜를 `missingDates`로 남기고 다음 실행에서 백필한다. **추정 환율을 채우지 않는다** | Must |
| FR-45 | 워커 등록은 `shared/infrastructure`의 스케줄러가 한다. `app.ts`에 직접 `new Worker().start()`를 늘리지 않는다 | Must |

## Acceptance Criteria

- [ ] 세 컨텍스트가 4층 구조로 존재한다
- [ ] `grep -rn "@prisma/client\|express\|axios" src/{ledger,invoice,fx}/domain` = 0
- [ ] `invoice`가 `ledger`의 Prisma 모델을 직접 읽지 않는다 (`application/api` 경유)
- [ ] ACL 이름에 컨텍스트 이름이 쓰이지 않는다
- [ ] `infrastructure/index.ts`가 Store 클래스를 export하지 않는다
- [ ] `ExchangeProbe`와 클라이언트에 주문·출금 메서드가 0건이다
- [ ] 외부 호출 전부에 타임아웃과 재시도 상한이 있다
- [ ] 트랜잭션 안에서 외부 HTTP를 부르는 코드가 0건이다
- [ ] 매퍼가 `Float`을 `Decimal`로 승격한다
- [ ] `settlementDate` null 대체가 매퍼 1곳에만 있다
- [ ] 환율 결측 거래가 계산에서 제외되고 `degraded`에 표시된다
- [ ] Projection 4개가 `domain` Port로 선언되어 있다
- [ ] 청구서 화면 1회 렌더 쿼리 수가 20개 이하다
- [ ] `counterfactual.worker`를 같은 사용자에 2회 동시 실행해도 계산이 1회만 돈다
- [ ] `counterfactual.worker`를 3회 실행해도 스냅샷 row가 1건이다
- [ ] `fx-rate.worker` 실패 시 추정 환율이 채워지지 않는다
- [ ] LLM 워커와 DB 워커가 다른 큐에 있다
- [ ] 워커 등록이 `shared/infrastructure` 스케줄러 경유다

## Dependencies

- **선행:** `SRV-REQ-006`(DDD) · `SRV-REQ-012`(도메인 로직) · `DB-REQ-005`~`008`
- **공유:** `fx` 컨텍스트와 `fx-rate.worker`를 F002가 그대로 쓴다
- **규칙:** `ddd-infrastructure.md` · `workers-external.md` · `performance-server.md`

## Open Questions

- **결제일 기준환율 소스를 무엇으로 할지.** 세금 계산 정확도의 핵심이고 아직 미확정이다. 국세청 예규는 "결제일 기준환율"을 요구하는데 그 값을 어디서 받을지(한국은행 API? 서울외국환중개?) 확인 필요 — **F002의 선행이다.**
- 업비트 rate limit 실제 수치와 백필 시 소요 시간.
- KIS 오픈API 인증 방식(앱키·앱시크릿·접근토큰 갱신 주기)과 조회 한도.
- `counterfactual.worker`의 LLM 호출을 스냅샷 생성과 분리할지. 분리하면 스냅샷은 빨라지고 narrative는 나중에 채워진다.
