---
id: DB-REQ-003
feature: F000
area: db
kind: MIGRATION
title: "F000 정리·편집 — 마이그레이션 정의 (5단계 · 백필 · 롤백)"
priority: high
labels: [db, migration, rollback, backfill]
created: 2026-09-09
source: FEATURE-000 FR-1/FR-34, DB-REQ-001, DB-REQ-002 FR-60~62
---

## Summary

DB-REQ-001의 스키마 변경을 **독립 롤백 가능한 5단계**로 쪼갠다. enum 값 제거는 Postgres에서 되돌리기 어려우므로 별도 릴리스로 분리한다. drop 전에 `pg_dump` 스냅샷과 grep 감사를 강제한다.

## Background

- Postgres enum은 값 **추가는 하위호환**이지만 **제거는 타입 교체**가 필요하다(새 타입 생성 → 컬럼 7개 교체 → 구타입 drop). 이걸 데이터 이관과 같은 트랜잭션에 넣으면 실패 시 되돌릴 지점이 없다.
- `AssetType`은 모델 7종이 참조한다. 그중 `PriceHistory`는 일봉·분봉이 누적되는 테이블이라 `ALTER TYPE`의 락 시간이 문제가 될 수 있다.
- FEATURE-000은 "삭제는 되돌릴 수 있어야 한다"를 정책으로 못 박았다. `pg_dump` 스냅샷 + FR 단위 커밋 + 복원 테스트 1회.

## Requirements

### 마이그레이션 순서

| 단계 | 이름 | 내용 | 롤백 방법 | 릴리스 |
|---|---|---|---|---|
| M1 | `20260909_asset_type_expand` | `AssetType`에 `kr_stock`, `us_stock` **추가** (`stock` 유지) | 값 추가는 하위호환. 롤백 불필요 | R1 |
| M2 | `20260909_asset_type_backfill` | `stock` → `kr_stock` UPDATE. 영향 row 수 로그 | 역방향 UPDATE | R1 |
| M3 | `20260909_invite_code` | `InviteCode` 테이블 생성 + `User` 역참조 | 테이블 drop | R1 |
| M4 | `20260909_drop_ai_analysis` | `ai_analyses`, `ai_analysis_sessions` 테이블 drop + `AnalysisStatus`·`PredictionType` enum drop | `pg_dump` 복원 | R1 |
| M5 | `20260909_asset_type_narrow` | `AssetType`에서 `stock` 제거 (새 타입 + 컬럼 7개 교체 + 구타입 drop) | 구타입 재생성 + 컬럼 역교체 | **R2 (별도)** |

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | M1~M4를 릴리스 R1에, M5를 릴리스 R2에 배포한다. R1 안정화 없이 M5를 실행하지 않는다 | Must |
| FR-2 | M5 실행 전 `grep -rn '"stock"' salt-server/src bff/src salt-microFe/apps --include="*.ts" --include="*.tsx"` = 0을 확인한다. 리터럴이 남아 있으면 런타임에서 터진다 | Must |
| FR-3 | M2는 SQL로 작성하고 `UPDATE ... RETURNING`으로 영향 row 수를 남긴다. 0건이면 그 사실을 기록한다 | Must |
| FR-4 | M4 실행 전 `grep -rn "AIAnalysis\|AnalysisStatus\|PredictionType" salt-server/src bff/src --include="*.ts"` = 0을 확인하고 결과를 커밋 메시지에 붙인다 | Must |
| FR-5 | M4 실행 전 `pg_dump -Fc` 스냅샷을 남기고 **복원 테스트를 1회** 수행한다. 경로를 커밋 메시지에 기록한다 | Must |

### 백필

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | M2의 대상 테이블은 `AssetType`을 가진 7종 전부다: `investment_watchlist`, `portfolio_transactions`, `portfolio_holdings`, `market_assets`, `price_history`, `technical_indicators`, `investment_insights` | Must |
| FR-11 | 백필 전 `SELECT asset_type, count(*) FROM <각 테이블> GROUP BY 1`을 실행해 **사전 분포를 기록**한다. 사후 분포와 대조한다 | Must |
| FR-12 | `stock` row가 0건이면 M2는 no-op이고, 그 사실을 근거로 M5를 R1에 합칠 수 있다. **합칠지 여부는 실측 후 결정** | Should |

### 락과 성능

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | M5 실행 전 `price_history`·`technical_indicators` row 수를 측정한다 | Must |
| FR-21 | M5의 `ALTER TABLE ... TYPE` 락 시간이 **10초를 넘을 것으로 예상되면** 컬럼 교체 방식(새 컬럼 추가 → 배치 백필 → 컬럼 교체)으로 전환한다 | Must |
| FR-22 | 마이그레이션은 서비스 중단 창(사용자 ≤10명이므로 심야 5분)에 실행한다. 무중단을 목표로 하지 않는다 | Should |

### 검증 게이트

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | 각 단계 후 `npx prisma migrate status`가 clean이다 | Must |
| FR-31 | R1 전체 후 `npx prisma generate` → `npm run build` 통과 | Must |
| FR-32 | 원장 3종 `count(*)`를 M1 전과 M5 후에 비교해 동일함을 확인한다 | Must |
| FR-33 | 보존 모델 16종이 `\dt`에 남아 있음을 확인한다 | Must |
| FR-34 | 되살리기 테스트: 동면 route를 1개 재등록해 200이 나오는지 1회 확인한다(모델이 살아 있음을 증명) | Should |

## Acceptance Criteria

- [ ] M1~M5가 각각 독립된 마이그레이션 파일이다
- [ ] M4 커밋 메시지에 grep 결과(0건)와 `pg_dump` 경로가 있다
- [ ] `pg_dump` 복원 테스트 기록이 `requirements/reports/checklists/DB-REQ-003.md`에 있다
- [ ] M2 전후 `asset_type` 분포가 기록되고, 사후에 `stock`이 0건이다
- [ ] M5 전 `"stock"` 리터럴 grep이 0건이다
- [ ] 원장 3종 row 수가 M1 전 = M5 후
- [ ] 보존 모델 16종이 `\dt`에 있다
- [ ] `prisma migrate status` clean + `npm run build` 통과
- [ ] `price_history` row 수와 M5 락 소요 시간이 기록되어 있다

## Trace

| FR | 산출물 | 검증 |
|---|---|---|
| FR-1~5 | `prisma/migrations/20260909_*` 5개 | `migrate status` |
| FR-10~12 | M2 SQL + 분포 로그 | `group by` 대조 |
| FR-20~22 | M5 실행 계획 | 락 시간 측정값 |
| FR-30~34 | checklist 리포트 | 되살리기 1회 |

## Dependencies

- 선행: `DB-REQ-001`(스키마), `DB-REQ-002`(정책 FR-60~62), **`SRV-REQ-006`(서버 정리 코드가 먼저 배포되어야 M4가 안전하다)**
- 후속: `DB-REQ-006`/`009`/`012`/`015`/`018`/`021`의 마이그레이션이 이 순서 뒤에 붙는다

## Open Questions

- `asset_type = 'stock'` 실제 row 수 (FR-12 결정에 필요)
- `price_history` row 수 (FR-21 결정에 필요)
- 마이그레이션 실행 환경. 현재 로컬 Postgres 단일인지, 배포 환경이 별도인지 확인 필요. 배포 환경이 있으면 스냅샷 위치와 복원 권한을 먼저 정해야 한다.
