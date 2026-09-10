---
id: DB-REQ-011
feature: F002
area: db
kind: MIGRATION
title: "F002 세금 마감 콕핏 — 마이그레이션 정의 (시드 · 캘린더 · 1회성 스냅샷)"
priority: critical
labels: [db, migration, seed, calendar, immutable]
created: 2026-09-09
---

## Summary

F002는 신규 테이블 5종이라 마이그레이션 위험이 낮다. **위험은 마이그레이션이 아니라 시드**에 있다 — 법령 파라미터와 결제 캘린더가 틀리면 D-Day가 틀리고, D-Day가 틀리면 사용자가 마감을 놓친다.

## 마이그레이션 순서

| 단계 | 이름 | 내용 | 롤백 |
|---|---|---|---|
| M1 | `20260909_tax_law_config` | `TaxLawConfig` 신설 + `User` 역참조 | 테이블 drop |
| M2 | `20260909_settlement_calendar` | `SettlementCalendar` 신설 | 동일 |
| M3 | `20260909_cost_basis_lot` | `CostBasisLot` 신설 + CHECK 제약 2개 | 동일 |
| M4 | `20260909_year_end_snapshot` | `YearEndPriceSnapshot` 신설 | 동일 |
| M5 | `20260909_evidence_archive` | `EvidenceArchive` 신설 | 동일 |

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | M1~M5는 **신규 테이블만** 만든다. 기존 데이터를 건드리지 않으므로 한 릴리스에 나갈 수 있다 | Must |
| FR-2 | M3의 CHECK 제약을 마이그레이션에 포함한다: `remaining_quantity >= 0`, `remaining_quantity <= quantity` | Must |
| FR-3 | `FxRate`는 F001 M1이 이미 만든다. **다시 만들지 않는다** | Must |
| FR-4 | 선행: `DB-REQ-007`(F001 원장 확장)이 먼저다. `CostBasisLot`이 `settlementDate`·`fxRate`를 참조한다 | Must |

## 시드 1 — 법령 파라미터 (여기가 실제 위험이다)

사용자 생성 시 `TaxLawConfig` 3행을 만든다. 값이 틀리면 D-Day가 틀린다.

| 자산군 | 값 | 근거 |
|---|---|---|
| `crypto` | `status: enforced` · `effectiveFrom: 2027-01-01` · `taxRate: 0.20` · `localTaxRate: 0.02` · `basicDeduction: 2,500,000` · `deemedCostBasisDate: 2026-12-31` · `taxFreeDeadline: 2026-12-31T23:59:59+09:00` · `settlementLagDays: 0` · `costBasisMethod: moving_average` | 현행 소득세법. 2026-08-03 정부 세제개편안에 유예 미포함 |
| `us_stock` | `status: enforced` · `taxRate: 0.20` · `localTaxRate: 0.02` · `basicDeduction: 2,500,000` · `settlementLagDays: 1` (T+1) · `recommendedBufferDays: 1` | 2024-05부터 T+1 |
| `kr_stock` | `status: enforced` · `capitalGainTaxable: false`(계산 대상 아님) · `transactionTaxRate: 0.0020` · `dividendWithholdingRate: 0.154` · `financialIncomeThreshold: 20,000,000` · `majorShareholderThreshold: 5,000,000,000` | 소액주주 비과세. 2026년 거래세 0.15%→0.20% 예정 |

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | 시드 스크립트를 `prisma/seed/tax-law-config.ts`에 둔다 | Must |
| FR-11 | **각 값에 `sourceUrl`과 `basisNote`를 함께 넣는다.** 값만 있으면 나중에 왜 그 값인지 알 수 없다 | Must |
| FR-12 | `crypto`의 `basisNote`에 "2026-08-03 세제개편안에 유예 미포함, 국회 재유예·폐지 가능"을 적는다. 이 기능은 **법령 상태를 감시해야 하는 기능**이다 | Must |
| FR-13 | 시드 값을 **화면에 그대로 노출**한다(`lawConfigShown`). 사용자가 전제를 확인할 수 있어야 한다 | Must |
| FR-14 | 시드는 **멱등**이다. `@@unique([userId, assetClass])` upsert | Must |
| FR-15 | 기존 사용자에게도 시드를 적용하는 백필을 넣는다 | Must |

## 시드 2 — 결제 캘린더

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | 미국 시장(`market: "US"`) 2026~2027 휴장일을 시드한다. **12월 말이 가장 중요하다** | Must |
| FR-21 | 국내(`market: "KR"`) 결제 처리일을 시드한다 | Must |
| FR-22 | **2026-12-28 ~ 2027-01-05 구간을 손으로 검증한다.** 이 구간이 D-Day 계산의 전부다 | Must |
| FR-23 | 캘린더는 **연 1회 갱신**한다. 갱신 절차를 문서에 남긴다 | Must |
| FR-24 | 시드는 `@@unique([market, date])` upsert로 멱등 | Must |
| FR-25 | 캘린더가 없는 날짜는 **영업일로 가정하지 않는다.** 조회 실패 시 `degraded` + `calendar_missing` | Must |

## 시드 3 — 지표 실패 이력은 F003이 담당

`IndicatorTrackRecord`는 `DB-REQ-013`(F003)이 만든다. F002는 쓰지 않는다.

## 1회성 이벤트 — 2027-01-01 00:10 KST

**마이그레이션이 아니지만 이 문서에 적는다.** 되돌릴 수 없고 일정이 고정되어 있다.

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | `year-end-snapshot.worker`가 2027-01-01 00:10 KST에 단발 실행된다 | Must |
| FR-31 | **12월 중 드라이런**을 수행한다. 임의 `snapshotDate`로 리허설하고 결과를 확인 후 폐기한다 | Must |
| FR-32 | 실패 시 **10분 간격 6회 재시도**. 전부 실패하면 즉시 알림 + 수동 입력 폼 | Must |
| FR-33 | 수집 대상은 **보유 크립토 심볼 전부**다. 보유가 0이면 수집하지 않는다 | Must |
| FR-34 | 수집값은 `@@unique([symbol, snapshotDate])`로 멱등이고 **이후 수정 불가**다(`DB-REQ-010` INV-3) | Must |
| FR-35 | 실행 결과(성공 심볼 수, 실패, 소스, 수집 시각)를 `requirements/reports/checklists/`에 남긴다 | Must |

## Acceptance Criteria

- [ ] M1~M5가 각각 독립 마이그레이션 파일이다
- [ ] `CostBasisLot`에 CHECK 제약 2개가 있다 (음수·초과 insert 시도 시 실패)
- [ ] `FxRate`가 중복 생성되지 않았다
- [ ] `TaxLawConfig` 시드가 자산군 3행을 만들고 각 행에 `sourceUrl`·`basisNote`가 있다
- [ ] 시드를 2회 실행해도 row가 3행이다 (멱등)
- [ ] 기존 사용자에게도 시드가 적용된다
- [ ] `lawConfigShown`이 화면에 노출된다
- [ ] `SettlementCalendar`에 US·KR 2026~2027이 시드되어 있다
- [ ] **2026-12-28 ~ 2027-01-05 구간이 손으로 검증되고 기록되어 있다**
- [ ] 캘린더 없는 날짜 조회 시 `degraded` + `calendar_missing`이다 (영업일 가정 0건)
- [ ] **12월 드라이런이 수행되고 결과가 checklist에 있다**
- [ ] 스냅샷 워커가 10분 간격 6회 재시도한다 (실패 주입 테스트)
- [ ] 스냅샷 재실행 시 row가 늘지 않는다
- [ ] `prisma migrate status` clean + `npm run build` 통과

## Dependencies

- **선행:** `DB-REQ-009`(스키마) · `DB-REQ-007`(F001 원장 확장)
- **구현:** `SRV-REQ-018`(F002 DATA — 워커)
- **일정:** **FR-31 드라이런은 2026-12 첫 주.** 하드 마감이다

## Open Questions

- **미국 시장 2026~2027 휴장일 데이터 소스.** 수동 입력이면 누가 검증하는지, API면 어느 것인지.
- 국내 결제 처리일이 실제로 D-Day 계산에 필요한가. 국내주식은 양도차익 비과세라 계산 대상이 아니다 — **`market: "KR"` 시드가 정말 필요한지** 재검토.
- 크립토 시행일이 국회에서 바뀌면 시드를 어떻게 갱신할지. 사용자별 설정이므로 **일괄 갱신 스크립트**가 필요할 수 있다.
