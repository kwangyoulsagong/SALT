---
id: DB-REQ-015
feature: F003
area: db
kind: MIGRATION
title: "F003 밸류에이션 밴드 적립 — 마이그레이션 정의 (실패 이력 시드가 핵심)"
priority: high
labels: [db, migration, seed, track-record, gin-index]
created: 2026-09-09
---

## Summary

신규 테이블 4개라 마이그레이션 위험이 낮다. **위험은 `IndicatorTrackRecord` 시드**에 있다 — 그 데이터가 없으면 **F003의 배수 카드도 F004의 추천 카드도 렌더되지 않는다.**

## 마이그레이션 순서

| 단계 | 이름 | 내용 | 롤백 |
|---|---|---|---|
| M1 | `20260909_indicator_snapshot` | `IndicatorSnapshot` 신설 | 테이블 drop |
| M2 | `20260909_indicator_track_record` | `IndicatorTrackRecord` 신설 + **GIN 인덱스** | 테이블 drop |
| M3 | `20260909_plan_settings` | `PlanSettings` 신설 + `User` 역참조 | 테이블 drop |
| M4 | `20260909_weekly_plan_execution` | `WeeklyPlanExecution` 신설 + 배수 CHECK (`matchedTransactionId` 없음 · `bandPresetVersion` 포함 — 2026-09-21) | 테이블 drop |
| M5 | `20260921_band_preset` | `BandPreset` 신설 + 시드 2행 (2026-09-21 — D9) | 테이블 drop |

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | M1~M5는 신규 테이블만. 한 릴리스에 배포 가능. 아직 배포 전이므로 M3·M4는 **개정된 스키마로 처음부터** 만든다(`bandConfigJson`·`matchedTransactionId`를 만들었다 지우는 마이그레이션을 두지 않는다) | Must |
| FR-2 | M2의 **GIN 인덱스**(`signalTypes` 배열)는 `CREATE INDEX CONCURRENTLY`가 필요 없다(신규 테이블이라 비어 있다) | Must |
| FR-3 | M4의 배수 CHECK: `multiplier >= 0 AND multiplier <= 3` | Must |
| FR-4 | drop이 없으므로 `pg_dump`는 필수가 아니다 | Must |
| FR-5 | **M2는 F004보다 먼저**여야 한다. F004의 게이트가 이 모델을 읽는다 | Must |

## 시드 1 — `IndicatorTrackRecord` (이 REQ의 핵심)

**이 데이터가 없으면 카드가 렌더되지 않는다.** 게이트가 정상 동작하는 것이지만, 시드가 비면 제품이 비어 보인다.

| indicator | hits | misses | signalTypes |
|---|---|---|---|
| `mvrv_z` | 2011-11 바닥 · 2015-01 바닥 · 2018-12 바닥 · 2022-11 바닥 (**4/4**) | **2025-10 사이클 톱 미검출 (이후 −52%)** | `["ai_coach", "scalp", "long_term", "buy"]` |
| `puell` | (보조 지표. hits 확인 필요) | 동일 톱 미검출 | `[]` (배수 결정에 안 쓴다) |
| `cape` | (장기 수익률 역상관 사례) | (단기 타이밍 실패 사례) | `["long_term"]` |
| `kimchi_premium` | 2022-06 마이너스 프리미엄이 바닥과 겹침 | (프리미엄 지속이 톱을 못 잡은 사례) | `[]` |

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | 시드 스크립트를 `prisma/seed/indicator-track-records.ts`에 둔다 | Must |
| FR-11 | **`mvrv_z`의 `hitsJson`에 4개 바닥, `missesJson`에 2025-10 톱 미검출**을 반드시 넣는다 | Must |
| FR-12 | 각 항목에 **날짜·사건·결과**를 담는다. `{ date, event, outcome }` | Must |
| FR-13 | **출처를 `summary`에 적는다.** 나중에 왜 그 데이터인지 알 수 있어야 한다 | Must |
| FR-14 | `signalTypes`를 채운다. **F004 게이트의 매핑**이다(`DB-REQ-019` FR-21과 같은 데이터) | Must |
| FR-15 | 시드는 **멱등**이다(`indicator @unique` upsert) | Must |
| FR-16 | **시드가 불완전해도 시스템이 깨지지 않는다.** 매핑 없는 지표는 게이트가 차단할 뿐이다 | Must |
| FR-17 | `puell`·`cape`·`kimchi_premium`의 hits/misses는 **확인 후 채운다.** 근거 없이 만들지 않는다 | Must |

## 시드 2 — `BandPreset`(전역) · `PlanSettings` 기본 배분

**개정 2026-09-21 — D9.** 밴드는 사용자 행이 아니라 전역 `BandPreset` 2행이다.

| `BandPreset.indicator` | 대상 심볼 | 밴드 (읽기 전용) |
|---|---|---|
| `mvrv_z` | `KRW-BTC` | MVRV Z 5밴드: `Z<0` 3.0x / `0≤Z<2` 2.0x / `2≤Z<5` 1.0x / `5≤Z<7` 0.5x / `Z≥7` **0.0x** |
| `cape_percentile` | `US-VOO` | CAPE 백분위 5밴드: `<20p` 3.0x / `20~50p` 2.0x / `50~80p` 1.0x / `80~95p` 0.5x / `≥95p` **0.25x** |

| 심볼 | `monthlyBaseKrw` | 기본 배분 |
|---|---|---|
| `KRW-BTC` | 사용자 입력(온보딩 3단계) × 배분 | 서버 설정값(프리셋). 스토리보드 예시는 125,000 : 200,000 |
| `US-VOO` | 동일 | 동일 |

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | 온보딩 3단계에서 **월 적립액 하나만** 묻고 주간 기본액을 자동 계산한다. **저장은 `PATCH /api/plan/settings` 첫 호출**이다(`SRV-REQ-021` FR-20 — 기본안 — 감사 문서 B12). 사용자 `PlanSettings` 행은 시드가 아니라 **이 첫 저장이 만든다** | Must |
| FR-21 | 밴드 임계값·배수는 `BandPreset`으로 시드한다. **사용자가 바꿀 수 없다.** **개정 2026-09-21** — D9: 과거 적중률·실패 이력이 기본 밴드 기준이다 | Must |
| FR-22 | **CAPE 최저 배수가 0.25x**다. 0x로 만들지 않는다 | Must |
| FR-23 | 시드는 멱등(`BandPreset.indicator @unique` upsert). 사용자 행 생성도 `@@unique([userId, symbol])` upsert | Must |
| FR-25 | **2026-09-21 추가.** `BandPreset` 시드 값을 바꾸면 `version`을 올린다. 적중률·실패 이력 재집계 대상이 된다는 표시다 | Must |
| FR-24 | **국내주식은 밴드 적립 대상이 아니다.** `PlanSettings`를 만들지 않고 `excluded`로 표시한다 | Must |

## 시드 3 — 지표 백필

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | 첫 실행 시 지표를 **최근 N일 백필**한다(기본 90일). 그래야 `staleDays`가 의미를 갖는다 | Should |
| FR-31 | 백필은 배치로. 소스의 호출 한도를 지킨다 | Must |
| FR-32 | 백필 실패한 날짜는 **비워 둔다.** 추정값을 만들지 않는다 | Must |

## Acceptance Criteria

- [ ] M1~M4가 각각 독립 마이그레이션이다
- [ ] GIN 인덱스가 `signalTypes`에 있다
- [ ] 배수 CHECK 제약이 있다 (범위 밖 insert 실패)
- [ ] **M2가 F004 마이그레이션보다 먼저 배포된다**
- [ ] **`mvrv_z` 시드에 바닥 4건과 2025-10 톱 미검출이 있다**
- [ ] 각 항목에 날짜·사건·결과가 있다
- [ ] `summary`에 출처가 있다
- [ ] `signalTypes`가 채워지고 F004 매핑과 일치한다
- [ ] 시드를 2회 실행해도 멱등이다
- [ ] **근거 없이 만든 hits/misses가 0건이다**
- [ ] `BandPreset` 2행이 시드되고 **사용자가 바꿀 경로가 0건이다** (D9)
- [ ] 온보딩 첫 저장이 사용자 `PlanSettings` 행을 만든다 (B12)
- [ ] **CAPE 최저 배수가 0.25x이고 0x가 0건이다**
- [ ] 국내주식 `PlanSettings`가 0건이고 `excluded`로 표시된다
- [ ] 지표 백필이 배치이고 실패 날짜가 비어 있다 (추정값 0건)
- [ ] `prisma migrate status` clean + `npm run build` 통과

## Dependencies

- **선행:** `DB-REQ-013`(스키마)
- **후속:** **`DB-REQ-019`(F004 마이그레이션)가 `signalTypes` 매핑에 의존한다**
- **구현:** `SRV-REQ-022`(F003 DATA — 워커)

## Open Questions

- **`puell`·`cape`·`kimchi_premium`의 hits/misses를 어디서 확인할지.** 근거 없이 만들면 그 자체가 거짓말이다 → **확인될 때까지 그 지표는 배수 카드를 렌더하지 않는다**(게이트가 정상 동작).
- 지표 데이터 소스 미확정(`DB-REQ-013` Open Question). 소스가 정해져야 백필도 가능하다.
- 기본 배분 비율(BTC : S&P500 ETF)을 몇으로 둘지. 스토리보드 예시(125,000 : 200,000 ≈ 38 : 62)는 근거가 없다 — 사용자 확인 필요. 배분을 사용자가 바꿀 수 있게 할지도 미정(`SRV-REQ-021` Open Question).
- 백필 90일이 적절한가. `staleDays` 판정에는 최근 며칠이면 충분하지만, 백테스트 참고 계산(FEATURE-003 검증 계획 7번)에는 더 필요하다.

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-09-21 | `pm/requirements/reports/feature-audits/2026-09-21-storyboard-gap.md` 반영. M5(`BandPreset`) 추가, FR-1·FR-20·FR-21 개정(D9 · B12), FR-25 추가. M4에서 `matchedTransactionId` 제거(ADR-002) |
