---
id: SRV-REQ-012
feature: F001
area: srv
kind: FUNC
title: "F001 개입 청구서 — 도메인 로직 정의 (반사실 3트랙 · 귀속 · 편향 라벨 · 파서)"
priority: critical
labels: [ddd, domain, counterfactual, ledger, parser]
created: 2026-09-09
---

## Summary

`ledger` · `invoice` · `fx` 세 컨텍스트의 도메인 로직을 정의한다. 반사실 3트랙 계산, 거래별 귀속 손익, 항등식 검증, 편향 라벨링, CSV 파서.

## 컨텍스트 배치

| 컨텍스트 | domain | application (유스케이스) |
|---|---|---|
| `ledger` | `Transaction` · `CashFlow` · `ExchangeKey` Aggregate. `TransactionStore` · `CashFlowStore` · `PriceProbe` · `ExchangeProbe` Port. `policy/sourceRef` | `ImportUpbitCsv` · `ImportKisTrades` · `SyncExchangeOrders` · `RegisterExchangeKey` · `CheckLedgerHealth` · `BackfillDailyCloses` |
| `invoice` | `InvoiceSnapshot` Aggregate. `policy/counterfactual` · `policy/attribution` · `policy/reconciliation` · `policy/biasLabel` | `RecomputeInvoiceSnapshot` · `GetInvoice` · `ListTradeAttributions` |
| `fx` | `FxRate` VO. `FxRateStore` · `FxRateProbe` Port | `CollectFxRates` · `GetSettlementRate` |

## 계산 계약 — 구현이 따라야 하는 정의

기간 `[t0, t1]`, 최종가 `p_T = price(t1)`. 모든 금액은 **원화**이고 `Money` VO를 통과한다.

```
Track Actual      V_actual  = Σ_j d_j + Σ_k [Δq_k × (p_T − p_k)] − Σ_k fee_k
Track Do-Nothing  V_donothing = Σ_j d_j + Σ_j [d_j × (p_T / p_j − 1)]
Track DCA         V_dca     = Σ_j d_j + Σ_w [a_w × (p_T / p_w − 1)]

interventionPnl = V_actual − V_donothing
disciplinePnl   = V_actual − V_dca
attributedPnl_k = Δq_k × (p_T − p_k) − fee_k

항등식: Σ_k attributedPnl_k − Σ_j [d_j × (p_T/p_j − 1)] ≡ interventionPnl
```

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | 세 트랙이 **동일한 KRW 입출금 스케줄**을 입력으로 받는다. 다른 입력을 쓰면 비교가 무의미하다 | Must |
| FR-2 | `Δq_k`는 부호 수량 변화(매수 `+`, 매도 `−`)다 | Must |
| FR-3 | **외화 거래는 `p_k`를 결제일 환율로 환산한 원화 단가로 통일**한다. 3자산군 합산의 전제다 | Must |
| FR-4 | Do-Nothing 기준자산은 `UserInvestmentProfile.benchmarkSymbol`(기본 `KRW-BTC`)이다. **"다 BTC에 넣고 가만히 있었다면"** 이 1인 사용자에게 가장 의미 있는 반사실이다 | Must |
| FR-5 | Mechanical DCA는 총 입금액을 주 단위 `N`회로 균등 분할하고 매주 종가 매수한다. **누적 입금액이 누적 계획 집행액보다 작으면 그 회차는 이연**(원화 보유) | Must |
| FR-6 | Track Actual은 심볼별 합(3자산군 원화 환산 후 합산)이다. Do-Nothing/DCA는 단일 기준자산이다 | Must |
| FR-7 | 심볼별 Do-Nothing은 `?benchmark=perSymbol`로 별도 제공한다 | Should |
| FR-8 | **`policy/counterfactual`은 순수 함수**다. 입력(거래·입출금·가격)을 받아 결과를 낸다. Prisma·HTTP를 모른다 | Must |

## 항등식 검증

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | `policy/reconciliation`이 잔차를 계산해 `InvoiceSnapshot`에 담는다 | Must |
| FR-11 | `|residual| > 100원`이면 **예외를 던지지 않고** `degraded: true` + `degradedReasons`에 `reconciliation_out_of_tolerance`를 넣는다. 화면이 경고를 노출한다 | Must |
| FR-12 | 편향별 집계 합계가 `Σ attributedPnl`과 일치함을 함께 검증한다(라벨 `none` 포함). 라벨링 누락·중복 검출 | Must |
| FR-13 | **무작위 300케이스 property test**로 잔차 = 0을 검증한다 | Must |

## 편향 라벨링

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | 라벨 6종: `panic_sell` · `fomo_buy` · `overtrade` · `revenge_buy` · `disciplined_exit` · `none` | Must |
| FR-21 | **기존 `behavior-coach`의 판정 로직을 거래 단위 라벨러로 추출**한다. `coach` 컨텍스트가 `application/api`로 공개하고 `invoice`가 그것을 ACL로 소비한다 | Must |
| FR-22 | 기존 판정이 **집계 기반이면 거래 단위로 분해되지 않을 수 있다.** 그 경우 라벨러를 새로 쓰고 `behavior-coach`의 기존 응답 계약은 유지한다 | Must |
| FR-23 | **오분류는 라벨을 늘리기보다 `none`으로 보수적 처리**한다. 틀린 라벨이 원화 금액과 붙으면 사용자에게 거짓말이 된다 | Must |
| FR-24 | 라벨은 **인격 평가가 아니라 사실 서술**로만 렌더된다. 도메인은 라벨 코드만 주고 문구는 프론트 `shared/i18n`이 만든다 | Must |
| FR-25 | `sumPnl`이 가장 음수인 라벨을 `mostExpensiveHabit`으로 반환한다 | Must |
| FR-26 | **양수 귀속손익 상위 3건**을 손실 상위 3건과 함께 반환한다. 자책 도구가 되면 안 쓰게 되고, 안 쓰면 0원이다 | Must |

## CSV 파서

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | 업비트 거래내역 CSV + 입출금내역 CSV를 파싱해 `Transaction`·`CashFlow`로 만든다 | Must |
| FR-31 | **헤더 스냅샷 테스트**를 둔다. 거래소가 컬럼을 바꾸면 **명시적 에러로 실패**한다. 조용히 잘못 파싱하는 것이 최악이다 | Must |
| FR-32 | **부분 성공을 허용**한다. 실패한 행 번호와 원인을 최대 10건까지 반환하고 나머지는 적재한다. 실패 행 CSV 다운로드 제공 | Must |
| FR-33 | `sourceRef` 생성은 `policy/sourceRef`가 담당한다. 규칙은 `DB-REQ-006` FR-2 | Must |
| FR-34 | KIS 거래내역(국내·미국)도 같은 경로로 파싱한다. **`settlementDate`를 반드시 채운다** | Must |
| FR-35 | **스테이킹·에어드랍·코인 간 스왑은 이 모델로 표현할 수 없다.** 1차 범위에서 제외하고 `unsupportedTransactions[]`로 노출한다 | Must |
| FR-36 | 파싱은 **트랜잭션 밖**에서 하고 결과만 배치 insert한다 | Must |

## 거래소 키

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-40 | 등록 시 **권한 스코프를 조회**하고 주문·출금 권한이 있으면 `403 SCOPE_NOT_ALLOWED`로 거부한다. **DB에 아무것도 저장하지 않는다** | Must |
| FR-41 | `secretCipher`는 암호문만. 응답·로그에 평문이 없다 | Must |
| FR-42 | **주문·출금 API를 부르는 코드를 만들지 않는다.** `ExchangeProbe` Port에 그 메서드가 없다 | Must |
| FR-43 | 동기화 시 스코프를 재검사한다. 거래소가 권한을 바꿀 수 있다 | Should |
| FR-44 | 업비트 제한을 UI에 안내한다: 계정당 키 10개, 키당 허용 IP 10개 | Should |

## 원장 건강도

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-50 | 계산된 홀딩 수량과 사용자 입력(또는 API 조회) 실제 잔고를 비교해 심볼별 오차율을 낸다 | Must |
| FR-51 | 최대 오차율 > 0.5%면 `degraded` + `ledger_mismatch` | Must |
| FR-52 | **오차를 자동 보정하지 않는다.** 보정하면 원장이 기록이 아니라 추정이 된다 | Must |
| FR-53 | 일봉 결측률을 함께 반환한다. 결측 > 5%면 `missing_candles` | Must |

## LLM 해설

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-60 | 청구서 요약 3문장을 생성한다. **금액은 LLM이 계산하지 않는다** — 계산된 값을 프롬프트에 주입하고 문장만 생성 | Should |
| FR-61 | **스냅샷 생성 시 1회만** 호출하고 `narrativeJson`에 저장한다. 매 요청마다 부르지 않는다 | Must |
| FR-62 | LLM 호출은 **트랜잭션 밖**이다 | Must |
| FR-63 | 실패 시 `narrative: null`이고 화면이 정상 동작한다 | Must |
| FR-64 | 프롬프트에 계좌 식별자·거래소 키를 넣지 않는다. 프롬프트·응답을 원문 로깅하지 않는다 | Must |

## Acceptance Criteria

- [ ] `policy/counterfactual`이 순수 함수이고 Prisma·HTTP를 import하지 않는다
- [ ] 합성 시나리오 5개가 통과한다: (a) 매수 후 무매매 → 개입손익 0 (b) 고점 매도 후 저점 재매수 → 양수 (c) 저점 매도 후 고점 재매수 → 음수 (d) 입금만 하고 매수 안 함 (e) 전량 매도 후 종료
- [ ] **무작위 300케이스에서 잔차 절대값 ≤ 100원**
- [ ] 편향별 집계 합계 == `Σ attributedPnl`
- [ ] 잔차 초과 시 예외가 아니라 `degraded: true`다
- [ ] 라벨 6종이 있고 오분류 시 `none`으로 처리된다
- [ ] `mostExpensiveHabit`과 `topGains` 3건이 함께 반환된다
- [ ] 실제 업비트 CSV 1년치 import 후 행 수가 일치한다
- [ ] 헤더가 바뀐 CSV에서 **명시적 에러로 실패**한다
- [ ] 실패 행이 10건까지 반환되고 나머지가 적재된다
- [ ] 스테이킹·스왑 거래가 `unsupportedTransactions[]`에 노출된다
- [ ] 주문·출금 권한 키 등록 시 403이고 DB 저장이 0건이다
- [ ] `ExchangeProbe` Port에 주문·출금 메서드가 0건이다
- [ ] 응답·로그에 secret 평문이 0건이다
- [ ] 홀딩 오차율 > 0.5%에서 `degraded`가 반환된다
- [ ] 오차를 자동 보정하는 코드가 0건이다
- [ ] LLM 실패 시 `narrative: null`이고 나머지가 정상이다
- [ ] LLM 호출이 트랜잭션 밖이다
- [ ] 프롬프트·응답 원문 로깅이 0건이다

## Dependencies

- **선행:** `SRV-REQ-006`(DDD 전환 — `Money` VO) · `DB-REQ-005`~`008`
- **연동:** `SRV-REQ-020`(F003)이 `?dcaSource=plan`으로 DCA 트랙 스케줄을 대체할 수 있게 한다
- **공유:** `fx` 컨텍스트를 F002가 그대로 쓴다

## Open Questions

- 업비트 CSV의 정확한 컬럼과 부분체결 표기. **FR-30 착수 전 실제 파일 1건 필요.**
- `behavior-coach`의 기존 판정이 집계 기반인지 거래 단위인지. **FR-21 착수 전 코드 확인 필요.**
- `t0` 이전 보유분 처리 (`DB-REQ-006` Open Question과 동일).
- 편향 라벨 골든 케이스 20건을 누가 수동 라벨링할지.
