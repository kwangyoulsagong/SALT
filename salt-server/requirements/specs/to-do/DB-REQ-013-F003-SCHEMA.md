---
id: DB-REQ-013
feature: F003
area: db
kind: SCHEMA
title: "F003 밸류에이션 밴드 적립 — 스키마 정의 (지표 스냅샷 · 실패 이력 · 주간 계획)"
priority: high
labels: [db, prisma, schema, indicator, plan, track-record]
created: 2026-09-09
source: pm/requirements/specs/in-progress/FEATURE-003-valuation-band-accumulation.md
---

## Summary

"이번 주 얼마 넣을지" 한 숫자를 만드는 데이터. 그리고 **`IndicatorTrackRecord`(실패 이력)** — 이것은 F003만의 것이 아니라 **F004의 3종 세트 렌더 게이트가 의존하는 모델**이다.

## Schema

```prisma
model PlanSettings {
  id             String    @id @default(uuid())
  userId         String    @map("user_id")
  symbol         String                                   // "KRW-BTC" | "US-VOO"
  assetType      AssetType @map("asset_type")
  monthlyBaseKrw Decimal   @map("monthly_base_krw") @db.Decimal(38, 10) // 사용자가 입력한 월 적립액 중 이 자산 몫 (개정 2026-09-21)
  weeklyBaseKrw  Decimal   @map("weekly_base_krw") @db.Decimal(38, 10)  // 서버 환산값. monthlyBaseKrw × 12 ÷ 52, 1,000원 반올림
  bandPresetKey  String    @map("band_preset_key")        // BandPreset.indicator. 사용자가 바꾸지 않는다 (개정 2026-09-21 — D9)
  enabled        Boolean   @default(true)
  createdAt      DateTime  @default(now()) @map("created_at")
  updatedAt      DateTime  @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, symbol])
  @@map("plan_settings")
}

// 신규 2026-09-21 — D9. 밴드 임계값·배수는 전역 프리셋이고 읽기 전용이다
model BandPreset {
  id        String   @id @default(uuid())
  indicator String   @unique                              // "mvrv_z" | "cape_percentile"
  version   Int                                           // 적중률·실패 이력이 집계된 밴드 버전
  rowsJson  Json     @map("rows_json")                    // [{ code, lower, upper, multiplier }] 5행
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("band_presets")
}

model IndicatorSnapshot {
  id          String   @id @default(uuid())
  indicator   String                                      // "mvrv_z" | "puell" | "cape" | "kimchi_premium"
  value       Decimal  @db.Decimal(38, 10)
  percentile  Decimal? @db.Decimal(18, 8)
  asOf        DateTime @map("as_of") @db.Date              // 날짜 단위 (일 1회)
  source      String
  collectedAt DateTime @map("collected_at")

  @@unique([indicator, asOf])
  @@index([indicator, asOf(sort: Desc)])
  @@map("indicator_snapshots")
}

model IndicatorTrackRecord {
  id          String   @id @default(uuid())
  indicator   String   @unique
  signalTypes String[] @map("signal_types")               // F004 게이트 매핑 (DB-REQ-019 FR-21)
  hitsJson    Json     @map("hits_json")                  // [{ date, event }]
  missesJson  Json     @map("misses_json")                // [{ date, event, outcome }]
  summary     String
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@index([signalTypes], type: Gin)
  @@map("indicator_track_records")
}

model WeeklyPlanExecution {
  id                  String    @id @default(uuid())
  userId              String    @map("user_id")
  weekOf              DateTime  @map("week_of") @db.Date   // KST 월요일
  symbol              String
  assetType           AssetType @map("asset_type")

  plannedKrw          Decimal   @map("planned_krw") @db.Decimal(38, 10)
  multiplier          Decimal   @db.Decimal(18, 8)
  bandCode            String    @map("band_code")
  bandPresetVersion   Int       @map("band_preset_version") // 신규 2026-09-21 — 그 주 배수가 어느 밴드 버전이었나
  indicatorValue      Decimal?  @map("indicator_value") @db.Decimal(38, 10)
  indicatorAsOf       DateTime? @map("indicator_as_of") @db.Date
  indicatorStaleDays  Int       @default(0) @map("indicator_stale_days")
  indicatorFallback   Boolean   @default(false) @map("indicator_fallback")

  executedKrw         Decimal?  @map("executed_krw") @db.Decimal(38, 10)
  status              String    @default("planned")        // "planned" | "executed" | "skipped"
  recordedAt          DateTime? @map("recorded_at")          // 수동 체크 시각 (원장 매칭 없음 — ADR-002)

  createdAt           DateTime  @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, weekOf, symbol])
  @@index([userId, weekOf(sort: Desc)])
  @@index([userId, status])
  @@map("weekly_plan_executions")
}
```

## Requirements

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | `PlanSettings` 신설. `@@unique([userId, symbol])`. **사용자가 바꾸는 값은 `monthlyBaseKrw` 하나**다. `weeklyBaseKrw`는 서버 환산값, 밴드는 `bandPresetKey`로 전역 프리셋을 가리킨다. **개정 2026-09-21** — D9: 밴드 임계값은 읽기 전용. 과거 적중률·실패 이력이 기본 밴드 기준으로 집계되므로 사용자별 밴드는 그 수치를 거짓으로 만든다 | Must |
| FR-2 | `BandPreset.rowsJson`은 **표시·계산 파라미터**이고 쿼리 조건이 아니다(`DB-REQ-002` FR-30 허용). **개정 2026-09-21** — 사용자별 `bandConfigJson`에서 전역 `BandPreset`으로 옮겼다(D9) | Must |
| FR-3 | `IndicatorSnapshot` 신설. **`@@unique([indicator, asOf])` 로 멱등**. 같은 날 3회 수집해도 1건 | Must |
| FR-4 | `asOf`는 **날짜(`@db.Date`)** 다. 시각까지 저장하면 멱등 유니크가 깨진다 | Must |
| FR-5 | **`IndicatorTrackRecord` 신설.** `indicator @unique`. `hitsJson`·`missesJson`은 **시드로 관리**한다 | Must |
| FR-6 | **`signalTypes String[]`를 둔다.** F004의 게이트가 `signalType` → 실패이력을 찾는 매핑이다(`DB-REQ-019` FR-21) | Must |
| FR-7 | `@@index([signalTypes], type: Gin)` — 배열 역방향 조회 | Must |
| FR-8 | `WeeklyPlanExecution` 신설. `@@unique([userId, weekOf, symbol])` | Must |
| FR-9 | **`weekOf`는 KST 월요일 날짜**다(`DB-REQ-002` FR-22). 일요일 23:59 매수와 월요일 00:01 매수의 귀속 주차가 갈린다 | Must |
| FR-10 | 지표 상태(`indicatorValue`·`asOf`·`staleDays`·`fallback`)를 **계획에 스냅샷**한다. 나중에 "그때 왜 그 배수였는지" 설명할 수 있어야 한다 | Must |
| FR-11 | ~~`matchedTransactionId`로 원장 매칭 결과를 남긴다~~ → **개정 2026-09-21** — 원장이 없다(ADR-002 · 기본안 — 감사 문서 B20). 실행 기록은 **수동 체크만**이고 `executedKrw`·`recordedAt`만 남긴다. `matchedTransactionId` 컬럼을 두지 않는다 | Must |
| FR-12 | `User`에 두 모델 역참조를 추가한다(`IndicatorSnapshot`·`IndicatorTrackRecord`·`BandPreset`은 사용자 무관) | Must |

### 2026-09-21 추가 — 설정 D9 · 이번 달 적립 합계 B20

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-13 | **`BandPreset` 신설.** `indicator @unique`. MVRV Z(0/2/5/7)와 CAPE 백분위(20/50/80/95) 2행을 시드로 둔다. **사용자 API로 쓰는 경로가 없다** — D9 | Must |
| FR-14 | `BandPreset.version`을 `WeeklyPlanExecution.bandPresetVersion`에 스냅샷한다. 프리셋이 운영자에 의해 바뀌어도 과거 계획의 배수 근거가 남는다 | Must |
| FR-15 | `PlanSettings.monthlyBaseKrw`는 **사용자 입력 원값**이다. 설정 화면·온보딩 3단계(B12)가 이 값을 다시 보여 준다. 주간 환산값만 저장하면 사용자가 넣은 숫자가 사라진다 | Must |
| FR-16 | **이번 달 적립 합계**(기본안 — 감사 문서 B20)는 `WeeklyPlanExecution`에서 `status = 'executed'`인 행의 `executedKrw` 합이다. 귀속 달은 **`weekOf`(KST 월요일)의 달**이다. 새 컬럼 없이 `@@index([userId, weekOf])`로 덮는다 | Must |
## 설계 판단

| 판단 | 근거 |
|---|---|
| `IndicatorSnapshot`을 사용자 무관 전역으로 | MVRV Z·CAPE는 모두에게 같다. 사용자별로 두면 값이 갈린다 |
| `IndicatorTrackRecord`를 전역으로 | 실패 이력은 사실이다. 사용자별로 다르지 않다 |
| `BandPreset.rowsJson`을 JSON으로 | 지표마다 밴드 구조가 다르다(MVRV Z는 5구간, CAPE는 백분위 5구간). 정규화하면 테이블이 3개 늘고 쿼리 조건이 아니다 |
| 밴드를 사용자별이 아니라 전역 프리셋으로 (2026-09-21) | **D9.** 과거 적중률·실패 이력은 기본 밴드로 집계된다. 사용자가 임계값을 바꾸면 화면의 적중률이 그 사용자의 밴드와 무관한 숫자가 된다 |
| 월 적립액 원값을 저장 (2026-09-21) | 주간 환산(×12÷52, 1,000원 반올림)은 손실이 있다. 역산하면 사용자가 넣은 숫자와 달라진다 |
| `matchedTransactionId` 제거 (2026-09-21) | ADR-002. 거래 sync 가 없으니 매칭할 대상이 없다 |
| 지표 상태를 계획에 스냅샷 | **"왜 그 배수였나"를 나중에 설명해야 한다.** 지표는 갱신되므로 참조만으로는 재현이 안 된다 |
| `PlanSettings`를 사용자별로 | 기본 적립액과 배수는 개인 설정이다 |
| `signalTypes`를 배열로 | 한 지표가 여러 신호 유형에 대응할 수 있다 |

## Acceptance Criteria

- [ ] `PlanSettings`·`IndicatorSnapshot`·`IndicatorTrackRecord`·`WeeklyPlanExecution`·`BandPreset` 5종이 있다
- [ ] `PlanSettings`에 `bandConfigJson`이 없고 `monthlyBaseKrw`·`bandPresetKey`가 있다 (D9)
- [ ] `WeeklyPlanExecution`에 `matchedTransactionId`가 없고 `bandPresetVersion`이 있다 (ADR-002 · B20)
- [ ] `IndicatorSnapshot`에 `@@unique([indicator, asOf])`가 있고 `asOf`가 `@db.Date`다
- [ ] **`IndicatorTrackRecord`에 `signalTypes String[]`와 GIN 인덱스가 있다**
- [ ] `WeeklyPlanExecution`에 지표 스냅샷 4필드(`value`·`asOf`·`staleDays`·`fallback`)가 있다
- [ ] `@@unique([userId, weekOf, symbol])`가 있다
- [ ] 신규 금액이 `Decimal(38,10)`, 비율이 `Decimal(18,8)`이다
- [ ] `npx prisma validate` · `generate` · `npm run build` 통과

## Dependencies

- **선행:** `DB-REQ-001`(`AssetType`) · `DB-REQ-002`(정책)
- **짝:** `DB-REQ-014`(불변식) · `015`(마이그레이션) · `016`(성능)
- **소비:** `SRV-REQ-020`~`023`(F003) · **`DB-REQ-017`·`SRV-REQ-024`(F004가 `IndicatorTrackRecord`를 읽는다)**

## Open Questions

- **MVRV Z / Puell / CAPE 데이터 소스가 미확정**이다(무료 API 가용성·라이선스·갱신 지연). 유료가 필요하면 대체 지표(200일선 편차, 파워로 배수)로 갈지 결정해야 한다 — **F003 착수 전 선결.**
- `BandPreset.rowsJson` 구조를 지표별로 어떻게 통일할지. 통일하지 않으면 밴드 엔진이 지표마다 분기한다. 기본안: `{ code, lower, upper, multiplier }` 공통 행(CAPE는 백분위를 `lower/upper`로).
- **이번 달 적립 합계의 귀속 달**을 `weekOf` 기준으로 할지 `recordedAt` 기준으로 할지. 기본안은 `weekOf` — 늦게 체크해도 합계가 흔들리지 않는다. 월 경계 주(예: 8/31 월요일)는 전부 앞 달로 간다.
- 국내주식용 밸류에이션 지표(코스피 PBR? 배당수익률 스프레드?)를 정할지 계속 제외할지.
- 김프를 `IndicatorSnapshot`에 넣을지 별도로 둘지. **김프는 실시간(30초 캐시)이고 나머지는 일 1회**라 성질이 다르다 → **별도가 맞을 수 있다.**

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-09-21 | `pm/requirements/reports/feature-audits/2026-09-21-storyboard-gap.md` 반영. FR-1·FR-2·FR-11 개정(D9 · ADR-002 · B20). FR-13~16 추가 — `BandPreset` 전역 읽기 전용 · `monthlyBaseKrw` 원값 · 이번 달 적립 합계 집계 기준 |
