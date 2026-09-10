---
id: SRV-REQ-022
feature: F003
area: srv
kind: DATA
title: "F003 밸류에이션 밴드 적립 — 컨텍스트·워커·외부 지표 연동 정의"
priority: high
labels: [ddd, infrastructure, worker, indicator, binance, kimchi]
created: 2026-09-09
---

## Summary

`plan`·`indicator` 컨텍스트 구조와 **외부 지표 소스 연동**. 소스가 미확정이라 **어댑터를 교체 가능하게** 만드는 것이 이 REQ의 설계 요점이다.

## 컨텍스트 구조

```
src/plan/
├── domain/          WeeklyPlan · BandMultiplier VO · PlanSettingsStore · ExecutionStore
│                    IndicatorSource(Port) · TrackRecordSource(Port) · TransactionSource(Port)
│                    policy/{band,weekBoundary,execution}
├── application/     GetWeeklyPlan · CreateWeeklyPlans · CompleteWeeklyPlan
│                    UpdatePlanSettings · MatchExecutions · GetKimchiPremium
│                    api/{WeeklyPlanQuery, WeeklyPlanView}
├── infrastructure/  PrismaPlanSettingsStore · PrismaExecutionStore
│                    IndicatorAdapter(indicator ACL) · TrackRecordAdapter(indicator ACL)
│                    TransactionAdapter(ledger ACL) · KimchiPremiumCalculator
│                    UpbitPriceClient · BinancePriceClient · FxRateAdapter(fx ACL)
└── presentation/    plan.routes · controller · dto/

src/indicator/
├── domain/          IndicatorSnapshot VO · IndicatorTrackRecord Aggregate
│                    SnapshotStore · TrackRecordStore · IndicatorProbe(Port)
├── application/     CollectIndicators · GetLatestIndicator · GetTrackRecord
│                    api/{IndicatorSnapshotQuery, IndicatorTrackQuery, IndicatorSnapshotView, TrackRecordView}
├── infrastructure/  PrismaSnapshotStore · PrismaTrackRecordStore
│                    OnchainIndicatorClient · ValuationIndicatorClient
└── presentation/    indicator.routes · controller
```

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | 두 컨텍스트를 만든다. **`indicator`를 별도로 두는 이유는 F004가 실패 이력을 읽기 때문**이다 | Must |
| FR-2 | `domain`이 `@prisma/client`·`express`·`axios`를 import하지 않는다 | Must |
| FR-3 | `plan`이 `indicator`·`ledger`·`fx`를 **ACL로만** 부른다 | Must |
| FR-4 | **`indicator/application/api`로 `IndicatorTrackQuery`를 공개**한다. `coach`(F004)와 `plan`(F003)이 소비한다 | Must |
| FR-5 | ACL 이름에 컨텍스트를 쓰지 않고 무엇을 가져오는지를 쓴다. **`indicator`를 두 번 감싸므로** `IndicatorAdapter`(스냅샷)와 `TrackRecordAdapter`(실패이력)로 구분한다 | Must |
| FR-6 | `infrastructure/index.ts`가 Store 클래스를 export하지 않는다 | Must |

## 외부 지표 소스 — 미확정이므로 교체 가능하게

| 지표 | 후보 소스 | 상태 |
|---|---|---|
| MVRV Z | LookIntoBitcoin · CryptoQuant · Glassnode | **미확정** (무료 API 가용성·라이선스) |
| Puell Multiple | 동일 | 미확정 |
| CAPE | Shiller 데이터 · GuruFocus · multpl | 미확정 |
| 김프 | 업비트 + 바이낸스 + 환율 (자체 계산) | **확정** — 우리가 계산한다 |

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | `IndicatorProbe` Port를 **지표별이 아니라 지표 이름 기반**으로 만든다: `fetch(indicator: string): Promise<IndicatorValue>`. 소스가 바뀌어도 Port가 안 바뀐다 | Must |
| FR-11 | 소스별 클라이언트를 `infrastructure`에 두고 **레지스트리로 매핑**한다. 소스 교체가 파일 하나 | Must |
| FR-12 | API 키는 **서버 환경변수**. 응답에 포함하지 않는다 | Must |
| FR-13 | 타임아웃 + 지수 백오프 3회 | Must |
| FR-14 | 외부 호출은 **트랜잭션 밖** | Must |
| FR-15 | 소스가 유료로만 가능하면 **대체 지표**(200일선 편차, 파워로 배수)로 갈지 결정한다 → Open Question | Must |
| FR-16 | 소스가 없는 지표는 **수집하지 않는다.** 그러면 그 지표의 배수 카드가 게이트로 차단된다(정상 동작) | Must |

## 김프 계산 (`KimchiPremiumCalculator`)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | 업비트 `KRW-BTC` 현재가 + 바이낸스 `BTC-USDT` + USD/KRW 환율로 계산한다 | Must |
| FR-21 | 환율은 `fx` 컨텍스트의 **`kind: 'current'`** 를 쓴다(F006에서 추가) | Must |
| FR-22 | **TTL 30초 인메모리 캐시.** DB에 저장하지 않는다 — 30초 값을 이력으로 남길 이유가 없다 | Must |
| FR-23 | 세 소스 중 하나라도 실패하면 **김프만 `null`** 이고 적립 숫자는 유지된다 | Must |
| FR-24 | **USDT/USD 디페그**를 감지하면 `degraded`로 표시한다. 기준: USDT/USD가 ±1%를 벗어나면 | Should |
| FR-25 | 바이낸스 클라이언트는 **가격 조회만** 한다. 주문 API를 부르지 않는다 | Must |

## Projection

| Projection | 쿼리 |
|---|---|
| `IndicatorLatestProjection.byName` | `(indicator, asOf DESC) LIMIT 1` × N |
| `StreakProjection.recentWeeks` | 최근 12주 `WeeklyPlanExecution` 집계 |
| `ExecutionMatchProjection.candidates` | 주간 윈도우 안 동일 심볼 매수 |

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | 위 3개를 `domain` Port로 선언한다 | Must |
| FR-31 | 지표 최신값을 **지표 이름 목록으로 한 번에** 조회한다. N+1 0건 | Must |
| FR-32 | 연속 주차 계산이 **최근 12주만** 조회한다 | Must |

## 워커

| 워커 | 주기 | 하는 일 | 멱등 |
|---|---|---|---|
| `indicator-sync.worker` | **일 1회 06:00 KST** | MVRV Z · Puell · CAPE 수집 | `@@unique([indicator, asOf])` upsert |
| `weekly-plan.worker` | **주 1회 월 07:00 KST** | 그 주 계획 생성 + 이전 주 미실행 마감 | `@@unique([userId, weekOf, symbol])` upsert |

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-40 | 워커는 **스케줄과 락만** 담당하고 `application` 유스케이스를 부른다 | Must |
| FR-41 | `indicator-sync`를 같은 날 3회 실행해도 스냅샷이 1건이다 | Must |
| FR-42 | 실패는 지수 백오프 3회. 최종 실패 시 **carry-forward**하고 `staleDays`를 센다 | Must |
| FR-43 | `weekly-plan`이 **06:00 이후**에 돈다(07:00). 지표가 먼저 수집되어야 한다 | Must |
| FR-44 | `weekly-plan`이 이전 주 `planned`를 **`skipped`로 배치 마감**한다 | Must |
| FR-45 | 두 워커는 **DB만 훑는다.** LLM 워커와 같은 큐에 넣지 않는다 | Must |
| FR-46 | 워커 등록은 `shared/infrastructure` 스케줄러 경유 | Must |
| FR-47 | 사용자 ≤10명이므로 실행이 짧다. **총 10초 이내** | Must |

## 원장 매칭

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-50 | 원장 import 완료 이벤트(`LedgerImportedEvent`)를 수신해 **주간 매칭**을 돌린다 | Must |
| FR-51 | 주간 윈도우 안 동일 심볼 매수를 찾는다. **여러 건이면 합산** | Must |
| FR-52 | 매칭은 `ledger`의 **공개 API**를 경유한다 | Must |
| FR-53 | 매칭 결과를 `matchedTransactionId`·`executedKrw`·`status: executed`로 기록한다 | Must |

## Acceptance Criteria

- [ ] `plan`·`indicator` 두 컨텍스트가 4층 구조다
- [ ] `grep -rn "@prisma/client\|express\|axios" src/{plan,indicator}/domain` = 0
- [ ] `plan`이 `indicator`·`ledger`·`fx`를 ACL로만 부른다
- [ ] **`indicator/application/api`에 `IndicatorTrackQuery`가 있고 F004가 소비한다**
- [ ] ACL 이름 2개(`IndicatorAdapter`·`TrackRecordAdapter`)가 구분된다
- [ ] `IndicatorProbe`가 **지표 이름 기반**이고 소스 교체가 레지스트리 한 곳이다
- [ ] API 키가 환경변수이고 응답에 0건이다
- [ ] 외부 호출에 타임아웃·백오프가 있고 트랜잭션 밖이다
- [ ] **소스가 없는 지표는 수집되지 않고 게이트가 차단한다**
- [ ] 김프가 3소스로 계산되고 환율이 `kind: 'current'`다
- [ ] 김프가 TTL 30초 인메모리이고 **DB 저장이 0건이다**
- [ ] 김프 실패 시 적립 숫자가 유지된다
- [ ] USDT 디페그 감지 시 `degraded`다
- [ ] **바이낸스 클라이언트에 주문 API가 0건이다**
- [ ] Projection 3개가 `domain` Port다
- [ ] 지표 최신값이 **한 번에** 조회된다 (N+1 0건)
- [ ] 연속 주차가 최근 12주만 조회한다
- [ ] **`indicator-sync`를 3회 실행해도 스냅샷이 1건이다**
- [ ] 수집 실패 시 carry-forward되고 `staleDays`가 센다
- [ ] `weekly-plan`이 06:00 이후(07:00)에 돈다
- [ ] 이전 주 미실행이 배치로 `skipped` 처리된다
- [ ] **두 워커가 LLM 워커와 다른 큐에 있다**
- [ ] 워커 등록이 `shared/infrastructure` 경유다
- [ ] 워커 총 실행이 10초 이내다
- [ ] 원장 import 후 주간 매칭이 돌고 여러 건이면 합산된다
- [ ] 매칭이 `ledger` 공개 API를 경유한다

## Dependencies

- **선행:** `SRV-REQ-006`(DDD) · `SRV-REQ-020`(도메인) · `DB-REQ-013`~`016` · `SRV-REQ-014`(F001 `fx`)
- **공개 소비:** **F004가 `IndicatorTrackQuery`를 쓴다**(`SRV-REQ-026` ACL)
- **규칙:** `ddd-infrastructure.md` · `workers-external.md`

## Open Questions

- **지표 데이터 소스 확정**(`DB-REQ-013` Open Question). 이것이 F003의 최대 미결 사항이다. 무료 API가 없으면 **대체 지표**(200일선 편차 — `PriceHistory`로 자체 계산 가능)로 가는 것이 현실적일 수 있다.
- USDT/USD 디페그 감지 기준 ±1%가 적절한가.
- 원장 매칭이 여러 건일 때 `matchedTransactionId`에 무엇을 넣을지(`DB-REQ-014` Open Question).
- `weekly-plan.worker`가 06:00 지표 수집 실패 시 어떻게 할지. **carry-forward된 값으로 계획을 만들고 `fallback`을 표시**하는 것이 기본안.
