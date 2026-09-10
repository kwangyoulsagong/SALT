---
id: DB-REQ-006
feature: F001
area: db
kind: FUNC
title: "F001 개입 청구서 — 데이터 불변식 정의 (멱등 import · 항등식 · 원장 대조)"
priority: critical
labels: [db, invariant, idempotency, reconciliation]
created: 2026-09-09
---

## Summary

원장에 걸리는 **불변식**을 정의한다. 이 불변식이 깨지면 청구서 금액이 거짓이 되고, 그 위에 올라간 세금·적립·코치가 전부 거짓이 된다.

## 불변식 목록

| ID | 불변식 | 지키는 장치 | 깨지면 |
|---|---|---|---|
| INV-1 | 같은 외부 거래가 원장에 두 번 들어가지 않는다 | `@@unique([userId, source, sourceRef])` | 수량·평단이 부풀고 반사실이 틀린다 |
| INV-2 | `sourceRef`가 재업로드 시에도 같은 값이다 | 파서 규칙 (§2) | INV-1이 무력화된다 |
| INV-3 | 계산된 홀딩 수량 == 거래소 실제 잔고 (오차 ≤ 0.5%) | `ledger/health` 대조 | 모든 금액이 틀린다 |
| INV-4 | 항등식 잔차 절대값 ≤ 100원 | `CounterfactualSnapshot.residual` + 검증 | 청구서 금액을 신뢰할 수 없다 |
| INV-5 | 외화 거래의 `price`가 원화 환산값이다 | 매퍼 + 파서 | 3자산군 합산이 통화를 섞는다 |
| INV-6 | `settlementDate`가 null이 아니다 | 파서 기본값 (크립토는 `transactionDate`) | 세금 귀속연도 계산에 분기가 생긴다 |
| INV-7 | 거래소 키에 주문·출금 스코프가 없다 | 등록 시 스코프 검사 후 거부 | 제품의 법적 포지셔닝이 무너진다 |
| INV-8 | `secretCipher`에 평문이 없다 | 암호화 저장 + 응답 제외 | 키 유출 |
| INV-9 | 일봉 결측이 전체의 5% 이하 | `PriceHistory` coverage 검사 | 반사실이 carry-forward로 왜곡된다 |
| INV-10 | 원장 3종 row 수가 마이그레이션 전후 동일 | `count(*)` 비교 | 데이터 손실 |

## Requirements

### A. 멱등 import (INV-1, INV-2)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | 같은 CSV를 2회 업로드하면 `inserted = 0, duplicated = N`이다 | Must |
| FR-2 | `sourceRef` 생성 규칙: ① 거래소가 주문 UUID를 주면 그것 ② 없으면 `sha256(체결시각 + 심볼 + 수량 + 단가 + 방향)`. **CSV 행 번호를 섞지 않는다** — 섞으면 재업로드 시 값이 달라져 INV-1이 무력화된다 | Must |
| FR-3 | 같은 초에 동일 체결이 2건 있을 수 있다(부분체결). 그 경우 해시가 충돌한다 → **거래소가 순번을 주면 포함하고, 안 주면 그 2건을 하나로 합산**한다. 합산 사실을 import 결과에 표시한다 | Must |
| FR-4 | `sourceRef`가 없는 import를 허용하지 않는다. Postgres의 nullable 유니크는 NULL 중복을 허용하므로 **제약이 아무것도 막지 않는다** | Must |
| FR-5 | 수동 입력(`source = "manual"`)은 `sourceRef = null`을 허용한다. 사용자가 직접 넣은 것은 중복 판정 대상이 아니다 | Must |

### B. 원장 대조 (INV-3)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | import 후 계산된 홀딩 수량과 사용자가 입력(또는 API로 조회)한 실제 잔고를 비교해 **심볼별 오차율**을 낸다 | Must |
| FR-11 | 최대 오차율이 **0.5%를 넘으면** 청구서·세금 화면에 `degraded` 배너를 노출한다 | Must |
| FR-12 | 오차를 **자동 보정하지 않는다.** 보정하면 원장이 거래 기록이 아니라 추정이 된다 | Must |

### C. 항등식 (INV-4)

```
Σ_k [Δq_k × (p_T − p_k) − fee_k]  −  Σ_j [d_j × (p_T/p_j − 1)]  ≡  interventionPnl
```

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | 좌변 각 항이 확정 과거값이므로 **잔차는 0이어야 한다.** 0이 아니면 원장·가격 결측 문제다 | Must |
| FR-21 | 잔차를 `CounterfactualSnapshot.residual` **컬럼**에 저장한다. 숨기지 않는다 | Must |
| FR-22 | `|residual| > 100원`이면 **500을 반환하지 않고** `degraded: true`와 함께 반환하고 화면에 경고를 노출한다 | Must |
| FR-23 | 편향별 집계 합계가 `Σ attributedPnl`과 일치한다(라벨 `none` 포함). **라벨링이 거래를 누락하거나 중복 계산하지 않는다는 검증**이다 | Must |
| FR-24 | 무작위 거래·입출금·가격 시퀀스 **300케이스**에 대해 잔차 = 0을 property test로 검증한다 | Must |

### D. 통화와 결제일 (INV-5, INV-6)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | 외화 거래는 `priceCurrency`(체결 통화 단가)와 `fxRate`(결제일 기준환율)를 저장하고, `price`에 **원화 환산값**을 넣는다 | Must |
| FR-31 | `fxRate`가 없으면(환율 결측) `price`를 **추정으로 채우지 않는다.** 그 거래를 `degraded`로 표시하고 계산에서 제외한다 | Must |
| FR-32 | 크립토 row의 `settlementDate = transactionDate`. **null을 남기지 않는다** | Must |
| FR-33 | 미국주식은 T+1이다. 결제일 계산은 **영업일 캘린더**를 따른다(F002 `SettlementCalendar`) | Must |

### E. 키 보안 (INV-7, INV-8)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-40 | 키 등록 시 **권한 스코프를 조회**하고 주문·출금 권한이 있으면 **`403 SCOPE_NOT_ALLOWED`로 거부**한다. DB에 아무것도 저장하지 않는다 | Must |
| FR-41 | `secretCipher`는 애플리케이션 레벨 암호화 결과만 저장한다. 평문 컬럼을 만들지 않는다 | Must |
| FR-42 | 응답·로그 어디에도 secret 평문이 없다 | Must |
| FR-43 | `scopesJson`에 조회한 스코프를 기록한다. 나중에 거래소가 권한을 바꿀 수 있으므로 **동기화 시 재검사**한다 | Should |

### F. 가격 결측 (INV-9)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-50 | 반사실 구간의 일봉이 없으면 **선형보간하지 않고 직전 종가 carry-forward** 한다 | Must |
| FR-51 | carry-forward한 날짜를 `interpolatedDays[]`로 노출한다 | Must |
| FR-52 | 결측이 전체의 **5%를 넘으면** `degraded: true` | Must |
| FR-53 | 백필은 거래 최초일 −1일부터 오늘까지 `timeframe = d1` 무결성을 검사한다 | Must |

## Acceptance Criteria

- [ ] 같은 CSV 2회 업로드 → `inserted = 0, duplicated = N`
- [ ] `sourceRef` 생성에 CSV 행 번호가 쓰이지 않는다 (코드 검사)
- [ ] 부분체결 2건이 순번 없이 들어오면 합산되고 그 사실이 결과에 표시된다
- [ ] `source != "manual"`인 row에 `sourceRef = null`이 0건이다
- [ ] 홀딩 대조 최대 오차율 ≤ 0.5%
- [ ] 오차 > 0.5%에서 `degraded` 배너가 노출된다
- [ ] 오차를 자동 보정하는 코드가 0건이다
- [ ] **무작위 300케이스 property test에서 잔차 절대값 ≤ 100원 (전 케이스)**
- [ ] 편향별 집계 합계 == `Σ attributedPnl`
- [ ] `residual`이 컬럼에 저장되고 응답에 항상 포함된다
- [ ] 잔차 초과 시 500이 아니라 `degraded: true`로 응답한다
- [ ] 외화 거래의 `price`가 원화이고 `priceCurrency`·`fxRate`가 채워져 있다
- [ ] 환율 결측 거래가 계산에서 제외되고 `degraded`에 표시된다
- [ ] `settlementDate`가 null인 row가 0건이다
- [ ] 주문·출금 권한 키 등록 시 403이고 DB에 저장이 0건이다
- [ ] 응답·로그에 secret 평문이 0건이다 (grep)
- [ ] 일봉 결측 5% 초과 시 `degraded: true`
- [ ] carry-forward 날짜가 `interpolatedDays[]`에 노출된다
- [ ] 원장 3종 row 수가 마이그레이션 전후 동일하다

## Trace

| INV | 장치 | 검증 |
|---|---|---|
| INV-1·2 | `@@unique` + 파서 | CSV 2회 업로드 |
| INV-3 | `ledger/health` | 실계좌 대조 |
| INV-4 | `residual` + property test | 300케이스 |
| INV-5·6 | 매퍼 + 파서 | 컬럼 null 검사 |
| INV-7·8 | 스코프 검사 + 암호화 | 403 테스트 + grep |
| INV-9 | coverage 검사 | 결측률 쿼리 |
| INV-10 | `count(*)` | 마이그레이션 전후 |

## Dependencies

- **선행:** `DB-REQ-005`(스키마) · `DB-REQ-002`(공통 정책)
- **구현:** `SRV-REQ-012`(F001 FUNC — 엔진과 파서)
- **공유:** INV-5·6은 F002(세금)가 그대로 쓴다

## Open Questions

- 업비트 CSV의 정확한 컬럼과 **부분체결 표기 방식**. FR-3의 구현이 여기서 갈린다. 실제 파일 1건 필요 — **착수 전 선결.**
- `t0` 이전 보유분 처리. `t0` 잔고를 `d_0` 입금으로 편입하면 do-nothing이 왜곡된다. **기본안: window의 `t0`를 최초 거래일로 고정하고 기간 선택은 표시 구간만 잘라낸다.**
- Mechanical DCA의 주기(주/월)와 시작 정렬. 기본안 주 단위 월요일.
- 오차율 임계 0.5%가 적절한가. 수수료·소수점 절사로 자연 발생하는 오차 크기를 실측해야 한다.
