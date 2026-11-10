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

## F010 슬라이스 1 (2026-09-29)

- 원장에 판정 열을 두지 않은 것은 슬라이스 0 의 "재판정 마이그레이션에 규칙을 두 번 적었다"에 대한 답이다. 대신 행이 불변이라 **틀린 발행을 고칠 수 없다** — 틀리면 다음 날부터 새 규칙 버전으로 쓴다
- `whale_transactions.detected_at` 은 이름이 "발견"이라 발생 시각으로 읽혔다. 발생 · 도착을 열 이름으로 가르는 게 주석보다 낫다

## F010 슬라이스 7 (FR-65, 2026-10-07)

- `user_id` 를 cascade 가 아니라 SET NULL 로 — 사용자가 지워지면 전체 상한 계산에서 그 사용량이 빠지면 안 된다
- Prisma 가 이전 드리프트(RenameIndex 2건)를 이번 마이그레이션에 끼워 넣었다. 뺐지만 드리프트는 남는다 — 매번 같은 판단을 하게 된다
- Action: 인덱스 이름 드리프트만 정리하는 마이그레이션을 따로 둔다(기술부채)

## 2026-10-29 REQ 전수 조사

- 현재 상태를 말하는 문장이 뒤 슬라이스를 따라가지 못했다. Action: 슬라이스를 닫을 때 그 결과가 바꾸는 다른 REQ 의 본문 · 범위 밖 · 수용 기준을 grep 한다

## 2026-10-30 — F000 종목 검색 · 추적 자산 상한

- 파일만 걸침 — 판단 무변경. Action: 없음

## 2026-10-30 — F004 슬라이스 18 설정 화면

- 변경 없음 · 파일만 걸침. Action: 없음

## 2026-11-02 — 파일만 걸침

- 스키마 무변경 — 기록만

## F008 해설 공급자 라우팅 · 스트리밍 (2026-11-02) — 회고

새 인덱스 없음 — 토큰 합은 기존 `requested_at` 범위 스캔 + `provider` 필터(창 안 수백 행).

루트 `requirements/specs/done/F008-explain-llm-routing-slice.md` · 영역 `SRV-REQ-050` · `BFF-REQ-050` · `FE-REQ-059`

## 2026-11-02 — MONEY-F1(`FE-REQ-053`)

- 이 REQ 화면 · 동작에 걸린 수정이 있다 — 근거와 확인은 커밋 설명 · 루트 회고 `requirements/reports/retrospects/MONEY-F1-invest-zone-home-cards.md`

## 2026-11-06 — 서버 S2c notification(`MONEY-S2c-notification`) · `9cee4715` · `33e949e8` · `2fa68f61` · `f1a3c64c`

- 파일만 걸침 — 이 REQ 를 머리 주석에 둔 파일을 S2c 가 고쳤다. 판단 · 실수는 루트 회고 `MONEY-S2c-notification`
- **Action**: 없음(이 몫 안)

## 2026-11-06 — 서버 S2c 확인 2회차

- 결함과 Action 은 루트 회고 `MONEY-S2c-notification` 확인 2회차

## 2026-11-09 — 판단 상세 504

- 화면 예산 300ms 경로가 요청마다 집계 18개를 돌리고 있었다(성능 규칙 "요청 시 집계 금지"). 쿼리를 나란히 날리는 것은 빠르게 보이지만 연결을 여섯 개 잡는다 — 부하가 조금만 와도 줄을 선다
- 처음엔 "부하 때문"으로 넘기려 했다 — 사용자가 고치라고 했다. 부하에서 예산을 넘는 경로는 결함이다
- Prisma `ops: raw(...)` 는 비교가 안 돼 매번 다시 만들기를 제안했다 — 정렬 `C` 를 확인하고 일반 인덱스로

## 2026-11-09 — 504 3회차

- 2회차에 "데워진 뒤 6~46ms"로 닫으려 했다 — 재기동 직후와 2분 회차를 안 쟀다. **예산 경로는 기동 직후 · 주기 작업 회차를 지나며 잰다**
- 원인 후보를 쿼리 로그로만 찾다가 두 번 빗나갔다(DB 가 한가할 때도 느렸다). 실행 중 서버 CPU 프로파일 한 번이 답을 줬다 — Prisma Decimal 해석 · GC
- 같은 종류(메모리 `distinct` · 큰 결과를 Node 로)를 grep 으로 다 찾아 고쳤다 — 하나만 고쳤으면 다음 회차에 또 나왔다. 규칙에 한 줄(`workers-external.md`)
- 매번 같은 스냅샷 안에서 옛 · 새 결과를 대조했다 — 장중이라 따로 뜬 기준은 값이 움직여 거짓 차이가 났다
- 내 실수: SQL 템플릿 안 주석에 백틱을 넣어 타입 검사 실패인 채로 서버를 재기동했다 — 재기동은 `tsc` 통과 뒤에만(`&&`)

## 2026-11-10 — 504 4회차

- 어제 3회차는 CPU(큰 결과 해석)였고 오늘은 **대기**였다 — 프로파일이 "놂"이면 계산이 아니라 기다림을 본다. 느린 요청 안의 읽기들이 같은 순간에 끝나면 풀 · 루프 대기다
- 같은 꼴(행마다 쓰기를 `Promise.all`)이 11-02 에 한 번 났고 규칙 문서에 적었지만 다른 두 곳이 그대로 남아 있었다 — **같은 원인 호출처 전부 grep** 을 그때 했어야 했다. 이번엔 기계 검사로 막았다
- 사용자가 미루자고 한 적 없는 버그를 "AI 코치 개선"에 묶어 미뤘다가 지적받았다 — 개선과 결함을 섞어 미루지 않는다

## 2026-11-10 — F018

- 5회차: 4회차가 "한 문장으로"를 고쳤지만 그 문장이 **조건 없이 다시 쓰는** 문장이었다 — 쓰기 묶기와 쓰기 줄이기는 다른 일. 죽은 행이 안 지워지면 먼저 `idle in transaction` 을 본다(8시간 열린 예측 트랜잭션). 응답 시간이 아니라 `pg_stat_activity` 표본이 원인을 보였다
