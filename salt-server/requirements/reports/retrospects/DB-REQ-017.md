---
id: DB-REQ-017
spec: ../../specs/in-progress/DB-REQ-017-F004-SCHEMA.md
checklist: ../checklists/DB-REQ-017.md
title: F004 AI 코치 추천 — 스키마 회고 (종목 판단 스냅샷 · 게이지 적중률)
status: 부분 완료
written: 2026-09-22 (backfill)
---

흐름 전체는 루트 회고 `requirements/reports/retrospects/F004-symbol-judgment.md` · `F004-zone-gauge.md`.

## 1. 무엇을 했나

테이블 둘을 더했다.

| 마이그레이션 | 커밋 | 되돌리기 |
|---|---|---|
| `20260921081313_add_symbol_judgment_snapshot` | `1b8abd4` (PR #48) | `DROP TABLE symbol_judgment_snapshots` |
| `20260921084152_add_gauge_track_record` | `1553a67` (PR #49) | `DROP TABLE gauge_track_records` |

체크리스트 집계 pass 4 · 다르게 4(FR-50~53) · 미충족 1(FR-54) · 범위 밖 2 · 미착수 21.

## 2. 잘 된 것

- **마이그레이션이 둘 다 테이블 추가뿐이다.** 기존 테이블 · enum 변경 0건이라 롤백이 `DROP TABLE` 한 줄이고,
  `ALTER TYPE` 락(`performance-database.md` §6)을 피했다.
- **REQ 와 다르게 간 이유가 세 곳에 같이 있다** — 커밋 본문(`1b8abd4`), REQ Changelog, 슬라이스 스펙 "판단 1".
  `InvestmentInsight` 는 피드 · 대시보드 · 점수 계산이 타입 필터 없이 읽는다.
- **중복 방지를 버킷 키가 아니라 쓰기 규칙 + 유니크로 했다.** `isJudgmentSnapshotDue`(관찰 기간당 1행) +
  `(symbol, mode, judged_at)` 유니크. REQ 의 "시간 버킷 dedupeKey" 로는 30일 관찰이 겹쳐 표본이 부풀었을 것이다
  (REQ Open Question 이 걱정한 바로 그것).
- **인덱스를 쿼리에서 출발해 정했다.** 마지막 판단 · 성적/사례 · 미판정 세 경로에 하나씩, `enable_seqscan=off` 로 확인.
- `gauge_track_records` 는 일 1회 통째로 다시 쓰고 이번에 없는 줄은 지운다 — 재실행 92줄 그대로(멱등).

## 3. 틀렸던 것

마이그레이션을 되돌리거나 고친 커밋은 **기록된 것 없음.**

REQ 쪽이 틀렸다: FR-50~53 은 `InvestmentInsight` 의 소비처를 보지 않고 행 종류를 더하는 설계였다.

> **Action:** "기존 테이블에 `kind` 값을 더한다"는 스키마 FR 은 그 테이블을 **필터 없이 읽는 쿼리 목록**을 같이 적는다.

## 4. 남은 기술부채

| 항목 | 근거 |
|---|---|
| FR-54 — 저장 추천 경로가 여전히 `confidence` 를 계산해 `InvestmentInsight` 에 쓴다 | `GenerateCoachRecommendation.ts` · REQ Changelog "남음" |
| 인덱스가 기본 계획에서 쓰이는지 미확인 | 4행이라 Seq Scan. 행이 쌓인 뒤 `EXPLAIN (ANALYZE, BUFFERS)` |
| 게이지 표본 — 심리 이력 5월 25일부터라 줄마다 표본 1~2 | `F004-zone-gauge` 체크리스트 §2 |
| FR-1~8 승격 컬럼 · FR-10~15 · FR-20~22 | 미착수. FR-20 이 없어 `SRV-REQ-025` FR-48 이 미충족 |

## 5. 다음에 보완할 규칙 · 문서

- **REQ 본문(FR-50~53 · Acceptance Criteria · 스키마 블록)이 아직 `InvestmentInsight` 기준이다.** "다르게"가
  Changelog 에만 있어 본문만 읽으면 반대로 구현하게 된다 — 본문을 `SymbolJudgmentSnapshot` 기준으로 고친다.
- `performance-database.md` §3 은 "새 인덱스는 `EXPLAIN (ANALYZE, BUFFERS)` 결과를 PR 에 붙인다"다. 이번 기록은
  `enable_seqscan=off` 로 탄다는 것까지고 `ANALYZE, BUFFERS` 출력은 체크리스트에 없다.
- `npx prisma validate`(Acceptance Criteria 마지막 항목)가 두 슬라이스 게이트에 없었다.


## 슬라이스 13 (2026-09-23) — 생성 기록 · 프로필 열

- `--create-only` 로 SQL 을 먼저 읽고 `deploy` 로 적용했다. 이 순서가 drift 를 적용 전에 보여 준다
- 지난 회고의 두 항목을 이번 게이트에 넣었다: `EXPLAIN (ANALYZE, BUFFERS)` 출력을 체크리스트에 남겼고
  `npx prisma validate` 를 돌렸다
- 프로필 열은 **고른 값만 저장**한다(없으면 `null`). 기본값을 저장하면 기본값을 바꿀 때 누가 고른 것인지 모른다

## F009 슬라이스 0 — C06 (2026-09-24)

- "출처 불명 데이터를 실측으로 추정하지 않는다"(진단 C06)를 지키면서 기존 행을 채울 수 있었던 이유: 이 테이블을 쓰는 코드가 **둘뿐**이고 하나가 표식을 남겼다. 추정이 아니라 쓴 쪽으로 갈랐다 — 그 근거를 마이그레이션 SQL 머리에 적었다
- 열에 기본값을 두지 않았다. `DEFAULT 'live'` 면 다음에 생길 백테스트 코드가 출처를 빼먹어도 실측으로 들어간다
- 시드 표본이 워커의 간격(`lastJudgedAt`)까지 막고 있었다 — 시드 최신 행이 "어제 자정"이라 워커가 그날 단타 표본을 못 쌓았다. 워커 쪽 조회를 `live` 로 고정해 같이 풀렸다

## Action

- 로컬에서 판단 카드를 보려면 서버 `.env` 에 `JUDGMENT_COUNT_SYNTHETIC=true` — 사용자에게 알린다
