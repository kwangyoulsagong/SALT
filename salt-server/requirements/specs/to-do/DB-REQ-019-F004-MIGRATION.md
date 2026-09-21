---
id: DB-REQ-019
feature: F004
area: db
kind: MIGRATION
title: "F004 AI 코치 추천 — 마이그레이션 정의 (JSON → 컬럼 백필 · 매핑 시드)"
priority: high
labels: [db, migration, backfill, json-to-column, seed]
created: 2026-09-09
---

## Summary

F004의 마이그레이션 위험은 **`payload` JSON에서 컬럼으로 값을 백필하는 것**이다. JSON 구조가 문서화되어 있지 않아 **실제 데이터를 보고 백필 SQL을 써야 한다.**

## 마이그레이션 순서

| 단계 | 이름 | 내용 | 롤백 |
|---|---|---|---|
| M1 | `20260909_insight_columns` | `InvestmentInsight`에 `kind`·`action`·`score`·`signalType`·`generatedAt` 추가 (전부 nullable) | 컬럼 drop |
| M2 | `20260909_insight_backfill` | `payload`에서 값을 추출해 컬럼에 채운다 | 컬럼 `NULL`로 복귀 |
| M3 | `20260909_insight_indexes` | 인덱스 3개 추가 | 인덱스 drop |
| M4 | `20260909_insight_score_check` | `score` CHECK 제약 (백필 후) | 제약 drop |
| M5 | `20260909_coach_feedback` | `CoachFeedback` 신설 | 테이블 drop |
| M6 | `20260909_coach_generation_log` | `CoachGenerationLog` 신설 | 테이블 drop |
| M7 | `20260909_profile_coach_fields` | `UserInvestmentProfile.defaultMode`·`notificationLevel` 추가 | 컬럼 drop |
| M8 | `20260921_insight_mode_column` | `InvestmentInsight.mode` 추가(nullable) + `(symbol, kind, mode, createdAt DESC)` 인덱스 | 컬럼 · 인덱스 drop |
| M9 | `20260921_gauge_track_record` | `GaugeTrackRecord` 신설 | 테이블 drop |

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | M1의 컬럼은 **전부 nullable**이다. 기존 row를 깨지 않는다 | Must |
| FR-2 | **M4는 M2 이후**여야 한다. 백필 전에 CHECK를 걸면 `null`이 통과하지만, 백필로 범위 밖 값이 들어올 수 있다 | Must |
| FR-3 | M3은 M2 이후여야 한다. 백필 중 인덱스가 있으면 쓰기가 느려진다 | Must |
| FR-4 | M1~M7을 한 릴리스에 배포할 수 있다. **drop이 없다** | Must |
| FR-5 | drop이 없으므로 `pg_dump`는 필수가 아니지만, **M2 백필 전에 스냅샷을 남긴다**(값을 잘못 추출하면 되돌려야 한다) | Must |

## M2 백필 — 이 REQ의 실제 위험

`payload` 구조가 문서화되어 있지 않다. `signal-performance.service.ts`에서 읽는 경로만 알려져 있다:

```
payload.kind
payload.symbol
payload.recommendation.symbol
payload.recommendation.action
payload.mode
```

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | **백필 SQL을 쓰기 전에 실제 `payload` 샘플을 조사한다.** `SELECT payload FROM investment_insights LIMIT 50`으로 구조를 확인하고 기록한다 | Must |
| FR-11 | 추출 경로를 문서화한다: `kind` ← `payload->>'kind'`, `action` ← `payload->'recommendation'->>'action'`, `score` ← `payload->'recommendation'->>'score'`, `signalType` ← ? | Must |
| FR-12 | **`signalType` 추출 경로가 불명확하다.** `payload.mode`(`scalp`/`long_term`)일 수도, `payload.recommendation.action`일 수도 있다 → `signal-performance.service`의 현재 fallback 체인이 그 답이다: `query.signalKey ?? payload.mode ?? payload.recommendation?.action ?? 'ai_coach'` | Must |
| FR-13 | 추출 실패한 row는 **`null`로 남긴다.** 추정값을 채우지 않는다 — `signalType`이 틀리면 잘못된 성적표가 붙는다 | Must |
| FR-14 | 백필 후 **컬럼별 null 비율을 기록**한다. `signalType`이 대부분 null이면 게이트가 대부분 차단된다는 뜻이고, 그건 F004의 초기 정책 결정으로 이어진다 | Must |
| FR-15 | 백필 대상 row 수를 먼저 측정한다. 10,000건 초과면 **배치로 나눈다**(1,000건 단위) | Must |
| FR-16 | 백필 후 `ANALYZE` | Must |
| FR-17 | `score`가 0~100 범위를 벗어나는 row가 있으면 **`null`로 두고 기록**한다. M4 CHECK가 실패하지 않게 | Must |

## 시드 — `signalType` ↔ `IndicatorTrackRecord` 매핑

3종 세트 게이트의 실패사례가 이 매핑으로 찾아진다.

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | 매핑을 **데이터로 관리**한다. 코드 상수가 아니다 | Must |
| FR-21 | 매핑 테이블 또는 `IndicatorTrackRecord`에 `signalTypes String[]` 컬럼을 둔다. **후자가 단순하다** | Must |
| FR-22 | 시드 스크립트를 `prisma/seed/signal-track-mapping.ts`에 둔다 | Must |
| FR-23 | 매핑이 없는 `signalType`은 **실패사례를 찾을 수 없고 게이트가 차단한다.** 그것이 정상 동작이므로 시드가 불완전해도 시스템이 깨지지 않는다 | Must |
| FR-24 | 시드는 멱등이다(upsert) | Must |

## 2026-09-21 추가 — 종목 판단 · 게이지 적중률 · 매핑 시드 확장

근거: `pm/requirements/reports/feature-audits/2026-09-21-storyboard-gap.md` D2 · D3 · B9 · B18.

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-40 | M8 · M9 는 **drop 이 없다.** M1~M7 과 같은 릴리스에 묶을 수 있다 | Must |
| FR-41 | M8 은 **백필하지 않는다.** 기존 행은 종목 판단이 아니므로 `mode = NULL` 이 맞다. `payload.mode` 가 있어도 저장 추천의 모드이지 종목 판단이 아니다 | Must |
| FR-42 | M9 직후 테이블은 비어 있다. **첫 집계는 워커가 채운다**(`SRV-REQ-026`). 마이그레이션 안에서 집계 SQL 을 돌리지 않는다 — 수 분이 걸릴 수 있고 롤백 단위가 섞인다 | Must |
| FR-43 | `confidence` 컬럼을 **drop 하지 않는다**(D3 은 노출 중단이지 데이터 삭제가 아니다). drop 은 새 코드에서 읽기 0건이 확인된 뒤 별도 릴리스에서 검토한다 | Must |
| FR-44 | `smart_buy_zone` enum 값을 **제거하지 않는다**(`DB-REQ-017` FR-30 개정 — 생성 재개) | Must |
| FR-45 | **매핑 시드(FR-20~24)를 종목 경로까지 넓힌다 (B18).** 시드 행: 저장 추천 `coach.<action>` 4종 + 종목 판단 `<mode>.<action>` 8종(`scalp`·`long_term` × `review_short_opportunity`·`review_accumulation`·`wait`·`avoid`). 각 행이 `IndicatorTrackRecord` 와 연결되는지 여부는 데이터다 — **연결이 없는 행은 게이트가 차단하고 그것이 정상이다** | Must |
| FR-46 | 시드 결과로 **"연결된 signalType 수 / 전체"** 를 기록한다. 0 이면 초기 화면은 전부 미렌더이고, 그것이 기대한 상태다 | Must |

## 되돌리기

| 단계 | 롤백 |
|---|---|
| M1·M3·M4·M7·M8 | 컬럼·인덱스·제약 drop. 데이터 무손실(M8 은 워커가 채운 `mode` 만 사라진다 — `payload` 에 같은 값이 있다) |
| **M2** | 컬럼을 `NULL`로 되돌린다. **원본 `payload`는 그대로 있으므로 재백필 가능** |
| M5·M6·M9 | 테이블 drop. 신규 데이터만 손실(M9 는 워커가 다시 집계할 수 있다) |

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | **M2를 되돌릴 수 있는 이유는 `payload`를 남기기 때문이다.** 백필 후에도 `payload`를 지우지 않는다 | Must |
| FR-31 | `payload`를 지우는 마이그레이션을 만들지 않는다. 표시용으로 계속 쓴다 | Must |

## Acceptance Criteria

- [ ] M1~M9이 각각 독립 마이그레이션 파일이다
- [ ] M1의 컬럼이 전부 nullable이다
- [ ] M4가 M2 이후이고, M3이 M2 이후다
- [ ] **M2 전 `payload` 샘플 조사 결과가 기록되어 있다**
- [ ] 추출 경로가 문서화되어 있다
- [ ] 추출 실패 row가 `null`이고 추정값이 0건이다
- [ ] **컬럼별 null 비율이 기록되어 있다**
- [ ] 백필 대상 row 수가 측정되고 10,000건 초과 시 배치로 처리되었다
- [ ] 백필 후 `ANALYZE`가 실행되었다
- [ ] `score` 범위 밖 row가 `null`로 처리되고 기록되어 있다
- [ ] M4 CHECK 제약이 성공적으로 걸린다
- [ ] `signalType` ↔ `IndicatorTrackRecord` 매핑이 **데이터로** 시드된다
- [ ] 시드를 2회 실행해도 멱등이다
- [ ] 매핑 없는 `signalType`에서 게이트가 차단되고 시스템이 깨지지 않는다
- [ ] **`payload`가 백필 후에도 남아 있다**
- [ ] M8 에 백필이 없고 기존 행의 `mode` 가 `NULL` 이다
- [ ] M9 에 집계 SQL 이 없다 (워커가 채운다)
- [ ] `confidence` 컬럼과 `smart_buy_zone` enum 값이 drop 되지 않았다
- [ ] 매핑 시드가 12행(저장 추천 4 + 종목 판단 8)이고 연결 수 / 전체가 기록되어 있다
- [ ] `prisma migrate status` clean + `npm run build` 통과

## Dependencies

- **선행:** `DB-REQ-017`(스키마) · `DB-REQ-013`(`IndicatorTrackRecord`가 먼저 있어야 매핑을 시드한다)
- **구현:** `SRV-REQ-026`(F004 DATA)

## Open Questions

- **`payload` 실제 구조.** FR-10이 선결이고, 그 결과에 따라 FR-11~13이 확정된다. **F004 착수 전 필수 조사.**
- `signalType` 추출 경로가 fallback 체인이면 **같은 의미의 신호가 여러 `signalType`으로 갈릴 수 있다.** 그러면 성적표 표본이 쪼개진다 → 정규화가 필요할 수 있다.
- 매핑을 `IndicatorTrackRecord.signalTypes String[]`로 둘지 별도 테이블로 둘지. 배열이 단순하지만 역방향 조회(`signalType` → record)에 인덱스가 필요하다(GIN).
- 종목 판단 8종이 **어떤 `IndicatorTrackRecord`(실패 이력)와 이어지는가.** 종목 판단은 RSI · 심리 · 대량 체결로 점수를 매긴다(`modeDecision.ts`) — F003 의 밸류에이션 지표 실패 이력과 1:1 이 아닐 수 있다. 이어지지 않으면 종목 경로는 **실패 이력 데이터를 새로 적재**해야 렌더된다(`SRV-REQ-024` Open Question).

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-09-21 | `pm/requirements/reports/feature-audits/2026-09-21-storyboard-gap.md` 반영. M8(`mode` 컬럼) · M9(`GaugeTrackRecord`) 추가. 신규 FR-40~46(백필 없음 · 첫 집계는 워커 · `confidence`/`smart_buy_zone` drop 금지 · 매핑 시드를 종목 경로 8종까지 확장(B18)) |
