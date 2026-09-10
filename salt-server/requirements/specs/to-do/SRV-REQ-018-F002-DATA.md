---
id: SRV-REQ-018
feature: F002
area: srv
kind: DATA
title: "F002 세금 마감 콕핏 — 컨텍스트·워커·외부 연동 정의"
priority: critical
labels: [ddd, infrastructure, worker, snapshot, fx, archive]
created: 2026-09-09
---

## Summary

`tax` 컨텍스트의 구조와 **워커 3종**. 그중 `year-end-snapshot.worker`는 **1회성이고 되돌릴 수 없다** — 2027-01-01 00:10 KST에 실패하면 크립토 스텝업 기준을 잃는다.

## 컨텍스트 구조

```
src/tax/
├── domain/          §SRV-REQ-016 의 policy 8종 + Port 8종
├── application/
│   ├── GetTaxCockpit · GetTaxDeadlines · SolveHarvestCandidates
│   ├── SimulateCryptoScenario · DetectFxTrap · GetCostBasis
│   ├── RecomputeCostBasisLots · UpdateLawConfig
│   ├── CollectYearEndSnapshot · AcceptManualSnapshot
│   ├── ArchiveEvidence · IssueArchiveDownloadUrl
│   └── api/{CostBasisQuery, CostBasisView, TaxDeadlineQuery, TaxDeadlineView}
├── infrastructure/
│   ├── PrismaLotStore · PrismaLawConfigStore · PrismaCalendarStore
│   ├── PrismaSnapshotStore(**수정·삭제 거부**) · PrismaArchiveStore
│   ├── FxRateAdapter(fx ACL) · HoldingAdapter(portfolio ACL) · TransactionAdapter(ledger ACL)
│   ├── PriceSnapshotClient(업비트 공시가) · ObjectStorageClient(증빙)
│   ├── UsStockTaxProjection · LotSummaryProjection
│   └── mappers/
└── presentation/    tax.routes · tax.controller · dto/
```

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | `tax`가 `fx` · `portfolio` · `ledger`를 **`application/api` 경유 ACL로만** 부른다. Prisma를 직접 읽지 않는다 | Must |
| FR-2 | ACL 이름에 컨텍스트를 쓰지 않고 **무엇을 가져오는지**를 쓴다(`FxRateAdapter` · `HoldingAdapter`) | Must |
| FR-3 | `tax`가 `application/api`로 `CostBasisQuery`와 `TaxDeadlineQuery`를 공개한다. `invoice`(취득가액)와 `homebriefing`(D-Day)이 소비한다 | Must |
| FR-4 | `PrismaSnapshotStore`가 **UPDATE·DELETE 메서드를 제공하지 않는다.** Port에 그 시그니처가 없다 | Must |
| FR-5 | `infrastructure/index.ts`가 Store 클래스를 export하지 않는다 | Must |

## 외부 클라이언트

| 클라이언트 | 용도 | 제약 |
|---|---|---|
| `PriceSnapshotClient` | 2026-12-31 크립토 시가 (원화마켓 공시가 평균) | **1회성.** 실패 시 6회 재시도 후 수동 입력 |
| `ObjectStorageClient` | 증빙 저장·서명 URL 발급 | 애플리케이션 레벨 암호화. **5분 만료 URL** |
| `FxRateAdapter` → `fx` | 결제일 기준환율 | F001의 `fx` 컨텍스트 재사용 |

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | 증빙은 **애플리케이션 레벨 암호화** 후 저장한다. `cipherMeta`에 알고리즘·키 버전만 기록 | Must |
| FR-11 | 다운로드는 **5분 만료 서명 URL**이다. 파일을 응답 본문으로 내보내지 않는다 | Must |
| FR-12 | 원본 CSV는 파싱 후 삭제하지 않고 **증빙으로 보관**한다(F001 파서와 조율). 세금 신고에 필요하다 | Must |
| FR-13 | 외부 호출은 **트랜잭션 밖**이다 | Must |
| FR-14 | **주문·출금 API를 부르지 않는다** | Must |

## 워커 3종

### 1. `fx-rate.worker` — F001과 공유

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | 일 1회 결제일 기준환율을 수집·백필한다 | Must |
| FR-21 | 실패한 날짜를 `missingDates`로 남기고 다음 실행에서 백필한다. **추정 환율을 채우지 않는다** | Must |
| FR-22 | `(base, quote, rateDate, kind)` upsert로 멱등 | Must |

### 2. `tax-deadline-notify.worker`

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | 일 1회 **09:00 KST** 실행 | Must |
| FR-31 | 자산군별 **D-30 / D-14 / D-7 / D-3 / D-1에 각 1회** 발송 | Must |
| FR-32 | `NotificationDelivery` 발송 기록으로 **중복 방지**한다. 같은 날 3회 실행해도 발송 1건 | Must |
| FR-33 | 발송은 `device` 컨텍스트(F007)의 공개 API를 부른다. 웹만 있으면 `InvestmentNotification`만 만든다 | Must |
| FR-34 | **알림에 금액을 담지 않는다.** "미국주식 손실 수확 D-14" 까지만 | Must |
| FR-35 | **압박 문구를 만들지 않는다.** 서버는 코드만 주고 문구는 프론트가 만든다 | Must |
| FR-36 | `status = deferred`/`repealed`면 해당 자산군 알림을 보내지 않는다 | Must |

### 3. `year-end-snapshot.worker` — **1회성, 되돌릴 수 없다**

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-40 | **2027-01-01 00:10 KST 단발** 실행 | Must |
| FR-41 | 대상은 **보유 크립토 심볼 전부**. 보유 0이면 수집하지 않는다 | Must |
| FR-42 | 실패 시 **10분 간격 6회 재시도** | Must |
| FR-43 | 전부 실패하면 **즉시 알림 + 수동 입력 폼 노출**. 조용히 실패하지 않는다 | Must |
| FR-44 | 수집값은 `@@unique([symbol, snapshotDate])` upsert이지만 **이미 행이 있으면 덮지 않는다** | Must |
| FR-45 | **12월 중 드라이런**을 수행한다(`dryRun: true`, 임의 `snapshotDate`). 결과 확인 후 폐기 | Must |
| FR-46 | 실행 결과(성공 심볼 수 · 실패 · 소스 · 수집 시각 · 산정 방식)를 checklist에 남긴다 | Must |
| FR-47 | 이 워커를 **LLM·반사실 워커와 같은 큐에 넣지 않는다.** 앞의 것이 수십 초를 잡으면 00:10 실행이 밀린다 | Must |
| FR-48 | 워커 실행 전 **서버가 살아 있는지** 확인하는 장치가 필요하다. 00:10에 서버가 내려가 있으면 아무 일도 일어나지 않는다 → 헬스체크 + 알림 | Must |

## Projection

| Projection | 쿼리 |
|---|---|
| `UsStockTaxProjection.realizedByYear` | 결제일 기준 실현손익 집계 + 환율 조인 |
| `LotSummaryProjection.byMethod` | method별 취득가액 집계 (lot 개별 row를 로드하지 않는다) |
| `HoldingLossProjection.unrealizedLosses` | 평가손실 종목만 (솔버 입력) |

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-50 | 위 3개를 `domain`에 Port로 선언하고 `infrastructure`가 구현한다 | Must |
| FR-51 | 환율을 **N+1로 조회하지 않는다.** 결제일을 모아 `IN (...)` 한 번 | Must |
| FR-52 | 솔버 입력은 **평가손실 종목만** 조회한다 | Must |

## lot 재계산

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-60 | 원장 import 완료 이벤트(`LedgerImportedEvent`)를 수신해 **비동기 전량 재계산**을 띄운다 | Must |
| FR-61 | 재계산 중에는 콕핏이 `degraded` + `cost_basis_recomputing`으로 응답한다 | Must |
| FR-62 | 심볼별로 나눠 처리한다. 전체를 한 트랜잭션에 넣지 않는다 | Must |
| FR-63 | `deleteMany` + `createMany` **배치** | Must |
| FR-64 | **advisory lock**으로 같은 사용자 재계산 중복을 막는다 | Must |

## Acceptance Criteria

- [ ] `tax`가 4층 구조로 존재한다
- [ ] `grep -rn "@prisma/client\|express\|axios" src/tax/domain` = 0
- [ ] `tax`가 `fx`·`portfolio`·`ledger`를 `application/api` 경유로만 부른다
- [ ] ACL 이름에 컨텍스트 이름이 0건이다
- [ ] `tax/application/api`에 `CostBasisQuery`·`TaxDeadlineQuery`가 있다
- [ ] `SnapshotStore` Port에 UPDATE·DELETE 시그니처가 0건이다
- [ ] 증빙이 암호화 저장되고 다운로드 URL이 5분 만료다
- [ ] 원본 CSV가 증빙으로 보관된다
- [ ] 트랜잭션 안에서 외부 HTTP 호출이 0건이다
- [ ] `fx-rate.worker`가 멱등이고 추정 환율을 채우지 않는다
- [ ] **`tax-deadline-notify.worker`를 같은 날 3회 실행해도 발송이 1건이다**
- [ ] 알림 본문에 금액이 0건이다
- [ ] 서버 응답의 알림 문구가 코드이고 압박 표현이 0건이다
- [ ] `status = deferred`에서 해당 자산군 알림이 발송되지 않는다
- [ ] **12월 드라이런이 수행되고 결과가 checklist에 있다**
- [ ] `year-end-snapshot.worker` 실패 주입 시 10분 간격 6회 재시도한다
- [ ] 전부 실패 시 알림이 발송되고 수동 입력 폼이 노출된다
- [ ] 이미 행이 있으면 덮지 않는다
- [ ] 스냅샷 워커가 LLM·반사실 워커와 다른 큐에 있다
- [ ] **00:10 실행 전 헬스체크 장치가 있다**
- [ ] Projection 3개가 `domain` Port로 선언되어 있다
- [ ] 환율 조회 N+1이 0건이다 (쿼리 로그)
- [ ] 솔버 입력이 평가손실 종목만 조회한다
- [ ] lot 재계산이 비동기이고 배치이고 advisory lock을 잡는다
- [ ] 재계산 중 콕핏이 `degraded`로 응답한다

## Dependencies

- **선행:** `SRV-REQ-016`(도메인) · `SRV-REQ-014`(F001 `fx` 컨텍스트) · `DB-REQ-009`~`012`
- **연동:** `SRV-REQ-032`(F007 `device`)가 푸시 발송을 담당
- **일정:** **FR-45 드라이런은 2026-12 첫 주.** FR-40은 2027-01-01 00:10 KST

## Open Questions

- **결제일 기준환율 소스** — 미확정. 이 기능 정확도의 핵심이다.
- **원화마켓 공시가 평균 산정 방식** — 국세청 고시 확인 필요. `PriceSnapshotClient`가 무엇을 부를지가 여기서 결정된다.
- 증빙 저장 위치(로컬 vs 오브젝트 스토리지). 5분 서명 URL 요구사항이 후자를 가리킨다.
- **00:10 단발 실행의 신뢰성.** 서버가 그 시각에 살아 있어야 한다. 사용자 ≤10명 개인 서버라면 **cron이 아니라 "다음 기동 시 미수집 감지 후 즉시 수집"** 이 더 안전할 수 있다 — 단 그러면 시가가 당일 시가가 아니게 된다. **결정 필요.**
- lot 재계산이 3s 안에 되는가(`DB-REQ-012` Open Question과 동일).
