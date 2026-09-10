---
id: DB-REQ-010
feature: F002
area: db
kind: FUNC
title: "F002 세금 마감 콕핏 — 데이터 불변식 정의 (lot 소진 · 시가 스냅샷 불변 · 결제일 귀속)"
priority: critical
labels: [db, invariant, tax, immutable, settlement]
created: 2026-09-09
---

## Summary

세금 계산에 걸리는 **불변식**을 정의한다. 이 중 하나(`YearEndPriceSnapshot` 불변)는 **1회성이고 되돌릴 수 없다** — 2027-01-01 00:10 KST에 한 번 수집하고 그 값이 이후 모든 크립토 과세의 기준이 된다.

## 불변식 목록

| ID | 불변식 | 지키는 장치 | 깨지면 |
|---|---|---|---|
| INV-1 | lot 소진량 합 ≤ 취득 수량 | `CostBasisLot.remainingQuantity` ≥ 0 CHECK | 취득가액이 음수가 되고 세금이 과소 계산된다 |
| INV-2 | lot 잔량 합 == `PortfolioHolding.totalQuantity` | 재계산 후 대조 | 취득가액과 보유량이 어긋난다 |
| INV-3 | **`YearEndPriceSnapshot`은 수정·삭제 불가** | 애플리케이션 거부 + 감사 로그 | **되돌릴 수 없다.** 크립토 스텝업 기준이 바뀐다 |
| INV-4 | 결제일이 과세연도 경계를 넘으면 다음 연도 귀속 | `policy/settlementYear` | 12/31 매도가 올해로 집계되어 250만원 공제를 잘못 쓴다 |
| INV-5 | 원화 환산은 **매수·매도 각 결제일 기준환율** | `FxRate` 조회 + 매퍼 | 달러 손실인데 원화 이익인 케이스를 놓친다 |
| INV-6 | 솔버 매도 수량 ≤ 보유 수량 | `policy/harvest` | 실행 불가능한 조합을 제안한다 |
| INV-7 | 법령 파라미터가 코드 상수가 아니다 | `TaxLawConfig` 조회 | 시행일 변경 시 재배포가 필요하다 |
| INV-8 | 증빙은 암호화 저장되고 서명 URL은 5분 만료 | `cipherMeta` + URL 발급 | 자산 정보 유출 |
| INV-9 | 국내주식 양도차익은 계산 대상이 아니다 | `assetClass = kr_stock`에서 `capitalGainTaxable = false` | 비과세인데 세금을 계산해 보여준다 |

## Requirements

### A. lot 무결성 (INV-1, INV-2)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | `remainingQuantity >= 0` CHECK 제약을 둔다 | Must |
| FR-2 | `remainingQuantity <= quantity` CHECK 제약을 둔다 | Must |
| FR-3 | lot 재계산 후 **심볼별 잔량 합 == `PortfolioHolding.totalQuantity`** 를 검증한다. 불일치 시 `degraded` + `lot_mismatch` | Must |
| FR-4 | lot은 **원장 import 시 전량 재계산**한다. 증분 갱신하지 않는다 — 과거 거래가 늦게 들어올 수 있고(CSV 재업로드) 그러면 FIFO 순서가 바뀐다 | Must |
| FR-5 | 재계산은 `method`별로 각각 수행한다. 두 방식의 잔량 합은 같아야 한다 | Must |

### B. 시가 스냅샷 불변 (INV-3) — 이 REQ의 가장 중요한 항목

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | `YearEndPriceSnapshot`에 대한 **UPDATE·DELETE를 애플리케이션에서 거부**한다. 시도 시 `403 SNAPSHOT_IMMUTABLE` + **감사 로그** | Must |
| FR-11 | 수집 실패 시에만 `isManual = true`로 **수동 입력을 허용**한다. 그 경우 `auditNote`에 사유와 입력자를 남긴다 | Must |
| FR-12 | 수동 입력도 **한 번만** 가능하다. 이미 행이 있으면 거부한다 | Must |
| FR-13 | **12월 중 드라이런으로 검증한다.** 임의 날짜로 수집을 리허설하고 결과를 폐기한다. 리허설 데이터는 `snapshotDate`가 다르므로 유니크가 충돌하지 않는다 | Must |
| FR-14 | 수집은 **2027-01-01 00:10 KST 단발**이다. 10분 간격 6회 재시도, 전부 실패 시 즉시 알림 + 수동 입력 폼 노출 | Must |
| FR-15 | 원화마켓 취급 자산은 **2027-01-01 공시가 평균**으로 산정한다. 그 산정 방식을 `source`에 기록한다 | Must |

### C. 결제일 귀속 (INV-4)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | 과세연도 판정은 **`settlementDate` 기준**이다. `transactionDate`로 판정하지 않는다 | Must |
| FR-21 | 결제일은 `SettlementCalendar`의 영업일을 따라 `settlementLagDays`(T+N)만큼 뒤로 밀린다 | Must |
| FR-22 | **12/31 매도는 결제가 다음 해로 넘어가 다음 연도 귀속**이다. 이 케이스를 테스트로 고정한다 | Must |
| FR-23 | 2026년 귀속 마지막 매도일 = `lastTradeDate`, 실무 권고일 = `lastTradeDate − recommendedBufferDays`. **둘 다 계산해서 보여준다** | Must |
| FR-24 | 크립토는 **양도일 기준**이다(결제 개념이 없다). `settlementDate = transactionDate` | Must |

### D. 환율 (INV-5)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | 원화 환산은 **매수 결제일 환율**과 **매도 결제일 환율**을 각각 쓴다. 실제 환전 여부·환전일과 무관하다 | Must |
| FR-31 | 환율이 없으면 **추정하지 않는다.** 해당 종목만 `degraded` + `fx_missing`으로 분리하고 나머지는 계산한다 | Must |
| FR-32 | **달러 손익 부호 ≠ 원화 손익 부호**인 종목을 탐지한다. 양방향 모두(달러손실/원화이익, 달러이익/원화손실) | Must |
| FR-33 | 미래 매도 시나리오의 환율은 **가정값**이고 그 사실을 응답에 표시한다(`fxAssumedRate`) | Must |

### E. 솔버 (INV-6)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-40 | 솔버가 제안하는 각 종목 매도 수량이 **보유 수량을 초과하지 않는다** | Must |
| FR-41 | 솔버는 **원화 손익 기준**으로 계산한다. 달러 손익 기준이면 환율 함정을 무시한다 | Must |
| FR-42 | 마감일이 지난 종목(결제 불가)을 후보에서 제외한다 | Must |
| FR-43 | 부분 매도 수량까지 산출한다. `exact_deduction` 후보는 목표 과세표준을 **±1원**으로 맞춘다 | Must |

### F. 법령 파라미터 (INV-7)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-50 | 세율·공제·시행일·기준일·T+N·권고버퍼가 **전부 `TaxLawConfig`에서 온다.** 코드 상수 0건 | Must |
| FR-51 | 크립토 시행일을 2029-01-01로 바꾸면 **D-Day와 3열 시나리오가 전부 재계산**된다 | Must |
| FR-52 | `status`(`enforced`/`under_review`/`deferred`/`repealed`)를 **자동 판정하지 않는다.** 사용자가 수동 갱신한다 — 잘못된 "폐지됐습니다" 표시가 계산 오류보다 위험하다 | Must |
| FR-53 | `status = deferred`/`repealed`여도 **계산기를 끄지 않는다.** "시행일이 변경되어 D-Day를 재설정했습니다"로 표시한다 | Must |

### G. 증빙과 국내주식 (INV-8, INV-9)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-60 | 증빙은 애플리케이션 레벨 암호화. 다운로드는 **5분 만료 서명 URL** | Must |
| FR-61 | **세금 금액을 애플리케이션 로그에 남기지 않는다** | Must |
| FR-62 | `kr_stock`은 `capitalGainTaxable = false`다. **양도차익을 계산하지 않는다.** 거래세·배당·금융소득 경계만 표시 | Must |
| FR-63 | 대주주 기준(종목당 50억) 초과 여부를 보유금액으로 자체 점검해 경고한다. **판정하지 않고 경고만** | Must |
| FR-64 | 스테이킹·렌딩 소득 · NFT · 해외 배당 외국납부세액공제 · 파생상품은 1차 범위 밖이다. `unsupported[]`로 노출한다 | Must |

## Acceptance Criteria

- [ ] `remainingQuantity` CHECK 제약 2개가 있다
- [ ] lot 잔량 합 == `PortfolioHolding.totalQuantity` (재계산 후 검증)
- [ ] 두 `method`의 잔량 합이 같다
- [ ] CSV 재업로드 후 lot이 전량 재계산된다
- [ ] **`YearEndPriceSnapshot` UPDATE·DELETE 시도가 403이고 감사 로그가 남는다**
- [ ] 수동 입력이 한 번만 가능하다 (2회 시도 시 거부)
- [ ] **12월 드라이런이 수행되고 결과가 기록되어 있다**
- [ ] 12/31 매도가 다음 과세연도로 집계된다 (테스트 고정)
- [ ] 2026년 마지막 매도일과 권고일이 둘 다 계산된다
- [ ] 크립토의 `settlementDate == transactionDate`다
- [ ] 환율 결측 종목만 `degraded`이고 나머지가 계산된다
- [ ] **달러 손실 / 원화 이익 케이스가 탐지된다** (합성 케이스 포함)
- [ ] 미래 시나리오의 환율이 `fxAssumedRate`로 표시된다
- [ ] 솔버 매도 수량이 보유 수량을 초과하지 않는다
- [ ] 솔버가 원화 손익 기준으로 계산한다
- [ ] `exact_deduction` 후보가 목표 과세표준을 ±1원으로 맞춘다
- [ ] **크립토 시행일을 2029-01-01로 바꾸면 D-Day와 시나리오가 재계산된다** (하드코딩 0건)
- [ ] `status`를 자동 변경하는 코드가 0건이다
- [ ] `status = deferred`에서도 계산기가 동작한다
- [ ] 증빙 다운로드 URL이 5분 후 만료된다
- [ ] 애플리케이션 로그에 세금 금액이 0건이다
- [ ] `kr_stock`에서 양도차익 계산이 0건이다
- [ ] `unsupported[]`에 5종이 노출된다

## Dependencies

- **선행:** `DB-REQ-009`(스키마) · `DB-REQ-006`(F001 INV-5·6 공유)
- **구현:** `SRV-REQ-016`(F002 FUNC)
- **연동:** `DB-REQ-025`(F007)의 `NotificationDelivery`가 D-Day 알림 중복 방지를 담당

## Open Questions

- **2027-01-01 00:10 KST 수집이 1회성이고 되돌릴 수 없다.** 드라이런 일정을 12월 언제로 잡을지 — **12월 첫 주가 기본안**(실패 시 수정 시간 확보).
- 원화마켓 "공시가 평균"의 정확한 산정 방식. 거래소 몇 곳의 평균인지 국세청 고시를 확인해야 한다.
- lot 전량 재계산 비용. 거래 5,000건 × method 2 = 10,000 lot이면 재계산 시간을 측정해야 한다.
- 대주주 기준 판정에 **평가금액 기준일**이 언제인지(연말? 매도일?). 경고만 하므로 위험은 낮지만 문구가 달라진다.
