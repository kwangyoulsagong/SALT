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

## F009 슬라이스 0 — C06 `sample_origin` (FR-60, 2026-09-24, `feat/f009-slice0-reliability`)

| 확인 | 결과 |
|---|---|
| 마이그레이션 | `20260924130000_judgment_sample_origin` — `migrate deploy` 적용 · `migrate status` up to date · `prisma validate` 통과 |
| 백필 | 전 256행 = 시드 표식 240 → `synthetic` · 워커 16 → `live`. **행 수 불변** · 표식과 출처가 1:1 |
| CHECK | `sample_origin = 'guess'` 갱신 **거부** |
| 저장소(실DB) | 기본(`live`): 성적표 그룹 **1** · 표본 8 · `scalp.wait` 요약 0 / `live+synthetic`: 그룹 8 · 표본 248 · 30 |
| 실행계획 | Seq Scan 256행 · `Rows Removed by Filter: 248` · **0.26ms** |
| 운영 가드 | `NODE_ENV=production` + `JUDGMENT_COUNT_SYNTHETIC=true` 면 `env.ts` 가 기동을 막는다(코드 확인 — 운영 기동은 안 해 봤다) |
| 게이트 | `npm run build` · `npm test` **353 / 0** · `eslint .` · `layer-check` 4파일 |

### 미검증

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 운영 DB 에 시드 행이 있는지 | 운영 DB 에 접근하지 않았다. 있어도 마이그레이션이 `synthetic` 으로 가르고 성적에서 빠진다 | 운영 배포 시 마이그레이션 로그의 행 수 |
| `backtest` 출처 | 쓰는 곳이 아직 없다 — 값만 열어 뒀다 | 백테스트 채점이 생길 때(F008 P2 검증 방법론) |
| `sample_origin` 인덱스 | 256행 · 0.26ms 라 두지 않았다. 표본이 쌓여도 대부분 `live` 라 선택도가 낮다 | 표본 수만 건 뒤 재측정 |

## F010 슬라이스 0 — FR-61 `coach_recommendation_snapshots` (2026-09-28, `feat/f010-scorecard-integrity`)

| 확인 | 결과 |
|---|---|
| 마이그레이션 | `20260928101000` 로컬 적용 — 표 · 유니크 · 인덱스 2 · FK cascade · `sample_origin` CHECK. 롤백 = DROP TABLE |
| 재판정 | `20260928100100`: `symbol_judgment_snapshots` live 18행 재판정, 결과 분포 변화 없음(전부 `avoid`) |
| 미검증 | 운영 DB 적용 · 행이 쌓인 뒤 `(user_id, signal_type, outcome, judged_at desc)` 실행계획 — 표본 0 이라 `EXPLAIN` 의미 없음 → 표본 100 이상 뒤 |

## F010 슬라이스 1 (2026-09-29) — FR-62 · 63

| 확인 | 결과 |
|---|---|
| 마이그레이션 | `20260929100000` · `20260929100100` 로컬 적용 · `prisma migrate diff` 에 이번 표 차이 없음(슬라이스 0 인덱스 이름 63자 잘림 2건은 기존) |
| 불변 | `judgment_ledger` UPDATE → 트리거 예외. DELETE 는 막지 않는다(보존 정책은 운영 결정) |
| 중복 방지 | `whale_transactions (symbol, sequential_id)` 유니크 — 기존 291행 NULL 과 충돌 없음 · 수집 뒤 중복 0 |
| 실행계획 | `judgment_ledger (as_of_date)` Index Scan 0.3ms · 대형 체결은 SRV-REQ-024 §10 |
| 미검증 | 원장 1년치(추적 종목 × 2 × 365) 뒤 `(as_of_date)` 계획 — 지금 6행 |

## F010 슬라이스 1 (2026-09-29) — FR-64

| 확인 | 결과 |
|---|---|
| 마이그레이션 | `20260929100200` 로컬 적용 · 기존 267행 → `mode-decision@1` · 기본값 제거 확인 · 인덱스 이름을 Prisma 63자 규칙과 같게(드리프트 0) |
| 쓰기 | 워커 v2 표본 6행이 `rule_version = mode-decision@2` · 시드 스크립트도 버전을 적는다 |

## F010 슬라이스 7 (2026-10-07) — FR-65 `llm_call_logs`

| 확인 | 결과 |
|---|---|
| 마이그레이션 | `20261007015852_llm_call_logs` 추가만 · `prisma generate` · `migrate deploy` 로컬 적용 |
| 드리프트 | Prisma 가 함께 만든 RenameIndex 2건(`coach_recommendation_snapshots` 인덱스 이름 63자 잘림 — 이전 마이그레이션 몫)을 뺐다. 드리프트는 남는다 |
| 쓰기 · 집계 | `PrismaLlmUsageStore` `record` · `usageSince` 실 DB(스크래치, 행 지움) |
| FK | `user_id` ON DELETE SET NULL — 사용자 삭제 뒤에도 전체 상한 행은 남는다 |
| 롤백 | `DROP TABLE "llm_call_logs";` |

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 보존 정책 | 하루 ≤ 300행 | 기술부채 — 행이 쌓이면 정리 작업 |
| Prisma 인덱스 이름 드리프트 | 이 REQ 목적 밖 · 다음 `migrate dev` 가 또 만든다 | 기술부채 — 인덱스 이름 정리 마이그레이션 |
| `EXPLAIN (ANALYZE, BUFFERS)` | 표가 작다 | 행이 수백을 넘으면 |
| 운영 DB 적용 | 로컬만 | 배포 시 |

## 2026-10-29 REQ 전수 조사

- 머리 정정 블록: "Prisma 에 컬럼이 없다 · `unsupportedPersistedFields`"는 지난 일 — `default_mode` · `notification_le / "지금 문제" 절의 `signal-performance.service.ts` 는 없다 — `coach/application/GetSignalPerformance.

## 2026-10-30 — F000 종목 검색 · 추적 자산 상한 (파일만 걸침)

- 파일만 걸침 — `env.ts` 에 `TRACKED_ASSET_LIMIT` 추가. 합성 표본 설정 무변경
- 확인: build · test pass

미검증: 없음 — 판단 무변경

## 2026-10-30 — F004 슬라이스 18 설정 화면

- F004 슬라이스 18 — **변경 없음.** FR-20 `default_mode` 를 웹 설정 화면이 쓴다. `notification_level` 은 열은 있지만 읽는 코드가 없어 화면에 두지 않았다(`FE-REQ-026` FR-80 개정)
- 미검증 · 범위 밖: 없음

## 2026-11-02 — 파일만 걸침 (F008 해설 근거)

- `news_articles.url` · `published_at` 기존 열을 읽기만. 마이그레이션 0 · `prisma:generate` 불필요

미검증: 없음.

## F008 해설 공급자 라우팅 · 스트리밍 (2026-11-02) — 검증

`prisma validate` · `migrate deploy`(로컬) · 실스택에서 provider · 실모델 · 버린 문장 수가 남고 임시 행 삭제 뒤 행 수 복원(3 → 3)

루트 `requirements/specs/done/F008-explain-llm-routing-slice.md` · 영역 `SRV-REQ-050` · `BFF-REQ-050` · `FE-REQ-059`

## 2026-11-02 — MONEY-F1(`FE-REQ-053`) 투자 zone 분리 · 홈 카드

- MONEY-F1(`FE-REQ-053`) 에서 이 REQ 가 걸렸다 — 코치 프로필 첫 저장 경합 500 → 행 보장(ON CONFLICT DO NOTHING) 뒤 update(`b9a06a08`). 파일 1개(경로 이동 내용 무변경 0 · 수정 1 · 추가 0 · 삭제 0). 화면 · 동작이 바뀐 몫은 위 커밋 설명대로
- 확인: 모노레포 check-types · lint · test · zone 5 빌드 · layer-check · 훅 사후 실행(바뀐 TS 전부) · 실화면 — `salt-microFe/requirements/reports/checklists/FE-REQ-053.md` §2

## 2026-11-06 — 서버 S2c notification(`MONEY-S2c-notification`) · `9cee4715` · `33e949e8` · `2fa68f61` · `f1a3c64c`

- `CoachNotifier` 포트 메서드 하나로 · 억제 상수 삭제
- 검증: Express build · test · 실스택(Express 코드 직접 실행 → coach.outbox → 알림)
- 미검증: 없음(이 몫 안)

## 2026-11-06 — 서버 S2c 확인 2회차

- 확인 2회차(`55b4290a`): 판단 변화 이벤트 기록 실패가 추천 생성을 막지 않게(경고만) · Express test 929

## 2026-11-09 — 판단 상세 504

| 항목 | 전 | 후 |
|---|---|---|
| 서버 `/api/ai-coach?symbol=005930`(데워진 뒤) | 0.13~4.8초 | 6~46ms |
| 서버 `BTC` | 0.12~1.4초 | 9~60ms |
| BFF `/api/app/ai-coach/detail` 40회(국내 둘 · 코인 둘) | 504 섞임(300ms 예산 · 1회 다시) | 200 40/40 · 9~94ms · 8개 동시 60~70ms |
| live 풀 집계 실행 계획 | Seq Scan 24.9ms | Index Scan 0.18ms |
| 결과 | — | 저장소 3 × 신호 6 = 18건 JSON 글자 같음 |
| 마이그레이션 `20261109150000_symbol_judgment_pool_index` | — | 로컬 적용 · 이 표 스키마 ↔ DB 차이 0 |
| 테스트 | — | 무늬 이스케이프 · 들고 있기 경계(`judgmentPoolPattern.test.ts`) · 1039/1039 |

| 미검증 | 사유 | 언제 |
|---|---|---|
| 재기동 직후 몇 분 | 부팅 수집 작업과 겹쳐 0.1~0.6초 — 300ms 를 넘을 수 있다 | 부팅 작업 분산은 따로(필요해지면) |
| 운영 DB 정렬 | 접두 LIKE 가 일반 btree 를 타는 건 정렬 `C` 일 때 | 배포 DB 를 정할 때(`OPS-001`) `text_pattern_ops` 판 |

## 2026-11-09 — 504 3회차(재기동 직후 · 2분 회차)

2회차 뒤에도 재기동 직후 60회 중 2~6회 504. 원인을 추측하지 않고 쟀다 — 시간선(요청 · `/health`) · `pg_stat_activity` · **실행 중 서버 CPU 프로파일**(인스펙터).

| 찾은 것 | 전 | 후 | 결과 대조 |
|---|---|---|---|
| 지표 갱신 `recentCandles`(2분마다, 358종목 × 3단위) | 49만 행 Prisma Decimal 해석 — 순차 17.3초 · 서버 CPU 140~320% | `::float8` 원시 쿼리 4.7초 · Decimal 해석 0 | 49만 행 숫자 전부 같음(한 스냅샷) |
| `findLatestMany`(지표, 메모리 `distinct`) | m5 1.9초(서버 안) | 6ms | 시간 단위 준 결과 글자 같음 · 단위 없는 갈래(호출 0)는 같은 시각 순서만 정함 |
| `latestCloses`(봉 전체를 Node 로) | 코인 117종목 1.8초 | 27ms | 173종목 같음(한 스냅샷) |
| 옛 `generateSmartBuyZone`(메모리 `distinct` + 루프 안 조회 358번) | 2,084ms | 160ms + 조회 1번 | 358종목 같음 |
| 옛 `generateWhaleSignals`(50종목 봉 전체 19만 행) | 5,783ms | 59ms | 종목별 최신 30봉 같음 |
| 달력 역산 `daysFromDailyCandles`(국내 일봉 67만 행 순차) | 740ms | 132ms(유니버스 · 인덱스) | 2년 520 평일 같음 |
| 첫 요청이 연결을 여는 값 | 0.3~0.56초 | 기동 때 연결 16개 채움 — 첫 요청 0.19~0.39초 · 그 뒤 17~75ms | — |
| 부팅 회차가 첫 요청과 겹침 | listen 전에 시작 | listen 뒤 15초 | — |

| 검증 | 결과 |
|---|---|
| BFF `/api/app/ai-coach/detail` 재기동 직후 + 3분(2분 회차 둘 포함) · 두 번 | 460회 중 504 **0** · 300ms 넘음 3(200) |
| 실화면 상세 005930 · 000660 | 4xx/5xx · 콘솔 오류 0 |
| 서버 테스트 · build · lint | 1039/1039 · 통과 |

| 미검증 | 사유 | 언제 |
|---|---|---|
| 워커 15초 미룸의 부작용 | 재기동 뒤 15초 동안 시세 · 국내 수집 회차가 늦다(실시간 스트림은 화면 요청 때 열림) | 관찰 — 문제가 보이면 회차별로 나눈다 |
| 지표 갱신 h1 이 5분봉 1,200개를 받아 시간 묶음 | DB 몫은 남았다(4.7초/2분) — 한 시간 묶음을 SQL 로 옮기면 더 준다 | 필요해지면 |
| 봉 단위 목록 두 곳(`PrismaPriceHistoryRepository` 는 컴파일로 지킴 · 옛 고래 신호는 글자) | 옛 모듈이 시장 인프라를 import 하지 않게 | 옛 모듈을 옮길 때(`SRV-REQ-049`) |

## 2026-11-10 — 504 4회차: 연결 풀 대기(`c602e97c`)

| 단계 | 결과 |
|---|---|
| 전(장중 09:4x, 서버 직접) | 100회 p50 47 · p90 170 · p99 719 · 최대 865ms · 250ms 넘음 7 / 60회 p99 645ms |
| 원인 찾기 | CPU 프로파일 60s — 95% 놂(계산 아님) · 임시 구간 기록(사본으로 되돌림) — 느린 요청의 읽기 다섯이 240 · 538ms 에 한꺼번에 끝남 · `pg_stat_activity` 0.2s 표본 — 매분 0초 연결 12개가 행마다 `UPDATE market_assets` |
| 고침 | `applyQuotes` 한 문장 `UPDATE … FROM unnest` · `upsertCandles` 한 문장 `INSERT … ON CONFLICT` · 지표 동시 20 → 4 |
| 기계 검사 | `src/shared/infrastructure/__tests__/noParallelRowWrites.test.ts` — 허용 · 거절 표 + src 전체 0곳 · 옛 `applyQuotes` 를 사본으로 넣으면 실패(변이 확인 뒤 사본으로 되돌림) |
| 후(장중 10:0x, 재기동 1분 뒤 · 분 경계 포함) | 220회 전부 200 · p50 31 · p90 49 · p99 70 · 최대 119ms · 250ms 넘음 0 |
| 쓰기 실데이터 | 시세 300종목 10:03:00 갱신 · 캔들 276행(10:03) · 지표 210종목 새 봉 · 지표 한 회차 350종목 2.9s(2분 회차 안) · "중복 실행" 0 |
| 검증 | build 0 · lint 0 · test 1059 · layer-check |

측정 주의: 시험 토큰은 15분에 만료 — 한 번 401 을 잰 회차(p50 6ms)는 버렸다. 응답 코드를 같이 찍는다

## 2026-11-10 — 504 5회차: 봉 다시 쓰기 · 막힌 VACUUM(F018 실화면에서 봄)

| 단계 | 결과 |
|---|---|
| 전(장중 12:38~12:44, 서버 직접 `/api/ai-coach` 비소유자 시험 신원, 4초 간격) | 국내 51회 p50 148 · p90 9,349 · 최대 16,644ms · 코인 최대 7,599ms. 12:40~12:42 에 몰림 |
| 원인 1 | `pg_stat_activity` 0.2s 표본 — `INSERT INTO price_history … ON CONFLICT DO UPDATE`(코인 캔들 회차) 2,189 표본 · 문장 하나 최대 8.3s. 창 전체(5분봉 288 · 일봉 120)를 **조건 없이** 다시 씀 · 동시 10 |
| 원인 2 | 국내 판단의 관찰 구간 `closePercentiles`(005930 5분봉 하루 71행)가 페이지 4,843개를 읽음 — 표 누적 갱신 315M · 죽은 행 5.1M(산 행 3.6M). `VACUUM` 이 2초 만에 끝나도 죽은 행 그대로 → 예측 `jobs.news`(05:07 시작, CPU 0%로 외부 연결에 매달림)가 `advisory_lock` 트랜잭션을 8시간 열어 둠(`idle in transaction`) |
| 고침 | `price_history` upsert 5곳 `WHERE … IS DISTINCT FROM` · 캔들 동시 10 → 4 · `price_history` 자동 청소 문턱 2%(마이그레이션, 로컬 적용) · 예측 `advisory_lock` 락 직후 커밋 · `run_job(max_seconds)` 뉴스 20분 |
| 기계 검사 | 서버 `noBlindCandleRewrite.test.ts`(5곳 이상 · 전부 WHERE — 조건을 지운 사본으로 실패 확인 뒤 사본으로 되돌림) · 예측 `tests/store/test_advisory_lock.py`(실 Postgres — 커밋 줄을 지운 사본으로 실패 확인) · `tests/test_job_timeout.py` |
| 후(12:47~12:55, 캔들 회차 둘 포함) | 코인 p50 24 · 최대 128ms · 캔들 쓰기 80ms 넘는 표본 6. 국내 p50 82 · p90 317 · **최대 4,077ms**(12:54 — 죽은 행이 남은 5분봉 읽기) |
| 검증 | 서버 build · lint 0 · test 1080 / 예측 ruff · pyright 0 · lint-imports 3 kept · pytest 전부 · leakage 전부 |

| 미검증 | 사유 | 언제 닫히나 |
|---|---|---|
| ~~국내 판단 최대 4s(죽은 행 남음)~~ **닫힘 13:19** | 사용자 승인으로 매달린 `jobs.news` 종료 → `idle in transaction` 0 → `VACUUM (ANALYZE) price_history` 9초: 죽은 행 4,737,576 지움(5.1M → 15) · 005930 5분봉 하루 읽기 페이지 4,843 → 75 | 재측정 아래 |

| 재측정(VACUUM 뒤, 장중 13:19~13:28) | 결과 |
|---|---|
| 서버 직접 6분(캔들 회차 포함) | 국내 88회 p50 63 · p90 133 · 최대 432ms · 코인 p50 23 · 최대 171ms |
| BFF 경유 `/api/app/ai-coach/detail` 3분 | 국내 · 코인 각 44회 전부 200(504 0) · 국내 최대 176ms · 코인 최대 75ms |
| 전(12:38~12:44) | 국내 p90 9,349 · 최대 16,644ms · 코인 최대 7,599ms |


## F017 v2 단계 1 — 판단 막지 않음 (2026-11-10, `feat/f017-s1a-judgment-caveats`)

| 항목 | 결과 | 근거 |
|---|---|---|
| 스키마 · 원장 무변경(판단 게이트 코드가 이 REQ 를 가리킴) | 충족 | `npm test` 1129/1129 · lint · build · `test:layer-check` · 레이어 훅 사후(음성 대조 exit 2) |

| 미충족 · 미검증 | 사유 | 언제 닫히나 |
|---|---|---|
| 3종 결함 ~~160~~ → **6**(1b 2026-11-10 — 코인 · 국내 단타 과거 검산 `signal-skill@1` `f38ca6ae` · 국내 단타 원장 `326a0553`, 서버 150요청 · 300모드 실측). 남은 6 = 코인 장기 피하기 — 과거 검산 판단 날 8 < 등록 10(본 기간 뒤 9-29 ~ 만기가 온 판단만) | 규칙을 고른 기간(2018 ~ 2026-09)은 등록상 화면에 못 쓴다 — 날이 쌓이길 기다림(숨기지 않고 결함 꼬리표) | 판단 날 ≥ 10 이 차면 `npm run judgments:signal-skill -- --write` 재실행 — 코인 장기 격자상 11월 중 |

## F017 v2 단계 1b — 3종 채움 · 국내 단타 원장 (2026-11-10, `feat/f017-s1b-triad-backfill`)

| 항목 | 상태 | 근거 |
|---|---|---|
| 국내 단타 원장 행 · 출처 열 값 | 충족 | 라이브 `kr_stock.scalp.*` 50행(11-10 16:54) · 과거 검산 라벨 8 그룹 111,707행 + 국내 장기 51,305행 relabel · `npm test` 1133/1133 · lint · build · 레이어 훅 사후(음성 대조 exit 2) · 서버 150요청 · 300모드 실측: 3종 결함 160 → 6 · p95 40ms(재시작 직후 292) |

## 1b 확인 2회차 — 2026-11-10

| 항목 | 상태 | 근거 |
|---|---|---|
| 빗나간 사례 인덱스 | 충족 | `EXPLAIN (ANALYZE, BUFFERS)` 103ms(비트맵 + 정렬 36,865행) → 0.11ms(인덱스 3행) · 마이그레이션 적용 · 스키마 ↔ DB 차이 0 |
| 504 회귀 | 충족 | BFF 150종목 재시작 직후 150/150 200 · p95 55ms · 최대 536ms(200) · 따뜻한 p95 42ms · BFF 로그 504 수 162 → 162 |
| 국내 장기 과거 검산 결과 불변(통계 함수 바꿈) | 충족 | 10-26 리포트와 표 같음(종목 수만 2,605 → 2,617 — 새 종목 봉 250 미만) |

## F017 단계 1c 수집 따라잡기 (2026-11-11, `feat/f017-s1c-collection`)

| 항목 | 상태 | 근거 |
|---|---|---|
| 이 REQ 에 닿은 변경 | 충족 | `app.ts` 워커 시작에 깸 감시(`SRV-REQ-057` FR-6) — 지표 갱신을 깸 구독 맨 뒤에 한 번. 풀 규칙(종목 동시 4 · 행 쓰기 한 문장) 그대로 — 새 쓰기 둘(채운 위치 · 스냅샷)도 한 문장 · `npm test` 전체 · lint · build · 레이어 훅 사후(음성 대조 exit 2) |

## F017 v2 단계 2 점검 (2026-11-11, `feat/f017-s2-checks-plain-line`)

| 항목 | 상태 | 근거 |
|---|---|---|
| 이 REQ 에 닿은 변경 | 충족 | `coach/domain/model.ts` `CoachQuote` 에 선택 필드 `openPrice?`(국내 시가 — 점검 시가 갭 조건 K3). 표 · 열 변경 0 · `npm run build` · `npm run lint` · `npm test` 1200 통과 · `npm run test:layer-check` · 레이어 훅 사후 실행(음성 대조 exit 2) · `prisma migrate diff` 0 |

## 2026-11-12 — 서버 S3b(`MONEY-S3b-identity-accounts`)

루트 `requirements/specs/in-progress/MONEY-S3b-identity-accounts-slice.md` · 체크리스트 `requirements/reports/checklists/MONEY-S3b-identity-accounts.md`

| 바뀐 것 | 확인 |
|---|---|
| 짝 — `app.ts` 라우터 등록 둘 삭제 | build · test |

### 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 없음 | — | — |

## 2026-11-12 — 서버 S3c 내 데이터(짝)

루트 `requirements/specs/done/MONEY-S3c-identity-my-data-slice.md`

| 바뀐 것 | 확인 |
|---|---|
| `app.ts` 에 `/api/investment/me/data` 라우터 하나(`/api/investment` 보다 먼저) | Express build · lint · test 1294 · 실스택 |

### 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 없음 | — | — |

## 2026-11-13 — 서버 S3d(짝 — `MONEY-S3d-identity-classify-usage`)

- 이 REQ 몫: `src/app.ts` 에 라우터 하나 — `/api/investment/me/data-classification`(내 데이터 경로와 같은 자리 · `/api/investment` 보다 먼저)
- 확인: Express build · lint · test 1300/1300 · layer-check · 실스택 23ms
- 미검증: 없음

## 2026-11-13 — 인사이트 upsert 의 빠진 생성 키(F017 v4 확인 중 발견)

- [x] 3곳 `create` 에 `dedupeKey` — 기동 로그 P2002 0(재기동 뒤 확인)
- [x] 소스 검사 `upsertCreateKeys.test.ts` 2/2 · 변이(한 곳 키 지움 → 실패) · 서버 test 1460/1460 · tsc · layer-check 사후 실행(음성 대조 exit 2)
- 미검증: 없음 — 옛 기본값 행 4개는 이미 만료라 두었다(지우는 이득 0)
