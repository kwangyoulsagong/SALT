# DB-REQ-017 (F004 SCHEMA) — 검증 체크리스트

- REQ: `salt-server/requirements/specs/in-progress/DB-REQ-017-F004-SCHEMA.md`
- 브랜치: `feat/f004-symbol-judgment`(PR #48, `6f701b4`) → `feat/f004-zone-gauge`(PR #49, `ebadcf9`) · 검증일: 2026-09-21
- 작성: 2026-09-22 (backfill — 루트 체크리스트 두 개와 `salt-server/prisma` 마이그레이션에서 옮겼다. 새로 돌린 검증은 없다)
- 상태: **부분 완료** — 종목 판단 스냅샷(FR-50~53, **다르게**)과 `GaugeTrackRecord`(FR-55 · FR-57), **`CoachGenerationLog` · 프로필 컬럼**(FR-13~15 · 20~22, 2026-09-23 슬라이스 13)이 들어갔다. 승격 컬럼(FR-1~8) · `CoachFeedback` 은 미착수
- **전 영역 통합 기록**: 루트 `requirements/reports/checklists/F004-symbol-judgment.md` · `F004-zone-gauge.md`

판정 정의는 `SRV-REQ-024.md` 체크리스트 머리와 같다.

## 1. 마이그레이션

| 마이그레이션 | 내용 | 되돌리기 |
|---|---|---|
| `20260921081313_add_symbol_judgment_snapshot` | `symbol_judgment_snapshots` + 인덱스 3 | `DROP TABLE symbol_judgment_snapshots` |
| `20260921084152_add_gauge_track_record` | `gauge_track_records` + 유니크 1 | `DROP TABLE gauge_track_records` |
| `20260923041818_add_coach_profile_mode_level` (슬라이스 13) | `user_investment_profiles` 에 nullable 열 2 | 두 열 `DROP COLUMN` |
| `20260923042043_add_coach_generation_log` (슬라이스 13) | `coach_generation_logs` + `(user_id, requested_at DESC)` 인덱스 · `users` FK cascade | `DROP TABLE coach_generation_logs` |

네 개 다 **추가뿐**이다. 기존 열 변경 · 삭제 · enum 변경 0건. 슬라이스 13 은 `--create-only` 로 SQL 을 먼저 읽고
`migrate deploy` 로 적용했다(drift 0). `npx prisma validate` · `migrate status` 통과.

## 2. 요구사항 ↔ 구현

| FR | 내용 | 판정 | 위치 · 비고 |
|---|---|---|---|
| FR-1~8 | `InvestmentInsight` 컬럼 승격 · 인덱스 3 · `payload` 표시용 · 백필 위임 | 미착수 | |
| FR-10~12 | `CoachFeedback` | 미착수 | |
| FR-13 · 14 · 15 | `CoachGenerationLog` · `llmSource` · `User` 역참조 | **다르게** (2026-09-23) | 스펙 모양 그대로에 **`status = running` 하나를 더했다** — 생성이 비동기(202)라 받는 순간 행이 있어야 다음 요청의 쿨다운이 진행 중인 생성을 본다. 스키마 주석 · REQ Changelog |
| FR-20~22 | `defaultMode` · `notificationLevel` 컬럼 | **pass** (2026-09-23) | nullable · CHECK 없음 · 값 검증은 DTO(Zod) + 매퍼(모르는 값은 `null`). `SRV-REQ-025` FR-13 · 48 이 이것으로 닫혔다 |
| FR-30 | `smart_buy_zone` 새 규칙 구간 스냅샷 | 범위 밖 | `SRV-REQ-024` FR-117(Should)과 같은 항목 — 슬라이스 2 가 뺐다 |
| FR-31 | 기존 row 있으면 enum 값 제거 안 함 | 미착수 | enum 을 건드리지 않았다 |
| FR-32 | 제거 검토 | 무효 | FR-30 개정 |
| FR-40~42 | `IndicatorTrackRecord` 읽기 공유 | 미착수 | 종목 판단 경로는 D11 로 이 모델을 읽지 않는다(`SRV-REQ-024` FR-134). 저장 추천 경로는 미착수 |
| FR-50 | `kind = symbol_judgment` 스냅샷 | **다르게** | 별도 테이블 `symbol_judgment_snapshots`. `InvestmentInsight` 는 피드 · 대시보드 · 점수 계산이 타입 필터 없이 읽는다 |
| FR-51 | `mode` 컬럼 · `<mode>.<action>` | **다르게** | 새 테이블의 `mode` · `signal_type` 열 |
| FR-52 | `(symbol, kind, mode, createdAt DESC)` 인덱스 | **다르게** | `(symbol, mode, judged_at)` 유니크 · `(signal_type, outcome, judged_at DESC)` · `(evaluated_at, judged_at)`. `enable_seqscan=off` 로 세 경로가 각각 이 인덱스를 타는 것 확인 |
| FR-53 | `dedupeKey` 시간 버킷당 1건 | **다르게** | 버킷이 아니라 **관찰 기간당 1행**(B39) — `isJudgmentSnapshotDue`(쓰는 시점) + 유니크 `(symbol, mode, judged_at)` |
| FR-54 | 신규 코드에서 `confidence` 읽기 · 쓰기 0건 | **미충족** | REQ Changelog 가 "남음"으로 둔다. 새 테이블 둘에 신뢰도 열 0건 · 종목 판단 경로는 쓰지 않는다. **저장 추천 경로는 여전히 쓴다** — `GenerateCoachRecommendation.ts` `calculateConfidence` → `PrismaCoachInsightStore` |
| FR-55 | `GaugeTrackRecord` 신설 | pass | `20260921084152_add_gauge_track_record` — 스펙 모양 그대로, 수익률은 비율. `@@unique([symbol, gauge, bucket, horizonDays])` |
| FR-56 | `smart_money` 행 | 범위 밖 | Should |
| FR-57 | 구간 폭은 데이터 · 바꾸면 전체 재집계 | pass | `GAUGE_BUCKET_WIDTH = 20`(`policy/gauge.ts`). 일 1회 워커가 통째로 다시 쓰고 이번에 없는 줄은 지운다 |
| FR-58 | 예상 수익 · 목표가 · 관찰 구간 가격 컬럼 0건 | pass | 두 마이그레이션에 해당 열 없음. 관찰 구간은 요청 시 `PriceHistory` 에서 계산(`closePercentiles`) — 저장하지 않는다 |
| FR-59 | 보유 여부는 기존 `PortfolioHolding` | pass | `PortfolioProbe.getHolding` (`SRV-REQ-024` FR-116) |

## 3. 집계

| 판정 | FR 수 |
|---|---|
| pass | 7 (FR-55 · FR-57 · FR-58 · FR-59 · **FR-20~22**) |
| 다르게 | 7 (FR-50~53 · **FR-13~15**) |
| 미충족 | 1 (FR-54) |
| 범위 밖 | 2 (FR-30 · FR-56) |
| 미착수 | 15 (FR-1~8 · FR-10~12 · FR-31 · FR-40~42) |
| 무효 | 1 (FR-32) |

## 4. 명령

루트 체크리스트에 마이그레이션 적용 명령은 따로 기록돼 있지 않다. 다만 §2 실측(행 수 · 인덱스 계획)은 두 테이블이
로컬 DB 에 있어야 나오는 값이다.
`npm test` · `tsc` · `build` 는 `SRV-REQ-024.md` §4.

## 5. 미검증

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 인덱스가 기본 계획에서 쓰이는지 | 4행이라 기본 계획은 Seq Scan. `enable_seqscan=off` 로만 확인 | 행이 쌓인 뒤 |
| REQ 본문(FR-50~53 · Acceptance Criteria)이 아직 `InvestmentInsight` 기준 | "다르게"는 Changelog 에만 있다 | 다음 REQ 개정 |
| ~~`npx prisma validate`~~ | — | **2026-09-23 닫힘** — 슬라이스 13 게이트에서 통과 |
| `coach_generation_logs` 보존 | 워커가 사용자마다 10분에 1행을 쓴다(사용자 10명이면 1년 ~52만 행). 정리 작업이 없다 | 관측성 계측 · 알림 정리 워커와 같이 |
