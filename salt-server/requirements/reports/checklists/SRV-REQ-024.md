# SRV-REQ-024 (F004 FUNC) — 검증 체크리스트

- REQ: `salt-server/requirements/specs/in-progress/SRV-REQ-024-F004-FUNC.md`
- 브랜치: `feat/f004-symbol-judgment`(PR #48, `6f701b4`) → `feat/f004-zone-gauge`(PR #49, `ebadcf9`) · 검증일: 2026-09-21
- 작성: 2026-09-22 (backfill — 루트 체크리스트 두 개와 `src/coach` · `src/market` 코드에서 옮겼다. 새로 돌린 검증은 없다)
- 상태: **부분 완료** — 종목 판단 경로(A절 · B절 · C절 · D절 일부)가 닫혔다. 저장 추천 경로는 **코치 상세 읽기**(게이트 · 익절 거리 · 행동 기록, 2026-09-23 슬라이스 12)만 닫혔고 생성 · 범위 제한 · LLM · 쿨다운과 E~G절은 미착수
- **전 영역 통합 기록**: 루트 `requirements/reports/checklists/F004-symbol-judgment.md` · `F004-zone-gauge.md`

판정: **pass** · **다르게**(REQ 와 다른 구조로 구현, Changelog 기록) · **미충족**(슬라이스 범위였는데 못 닫음) ·
**범위 밖**(슬라이스가 명시적으로 뺐다) · **미착수**(두 슬라이스가 건드리지 않았다 — 기존 코드 상태는 여기서 판정하지 않는다) · **무효**(REQ 개정으로 사라짐)

## 1. 저장 추천 경로 (FR-1~91) — 두 슬라이스 범위 밖

| FR | 내용 | 판정 | 비고 |
|---|---|---|---|
| FR-1~4 | `coach` 컨텍스트 통합 · 점수 엔진 불변 · 스냅샷 테스트 | 미착수 | `src/coach` 는 `SRV-REQ-006` 이관으로 이미 있다. FR-4 스냅샷 테스트는 이 체크리스트에서 보지 않았다 |
| FR-10 | 게이트를 순수 함수로 | **다르게** (2026-09-23) | `renderGate.ts` 가 아니라 `policy/coachDetail.ts` `recommendationGate`. 종목 판단의 `judgmentGate` 와 **한 함수로 합치지 않았다** — 표본 기준(1 vs 20)과 사유 enum 이 스펙상 다르다 |
| FR-11 · 12 · 14 · 15 | 근거 = `reasons` + `topFactors` · 적중률 · 200 · 우회 없음 | **pass** (2026-09-23) | 슬라이스 12. 테스트 4건. 인자에 우회 플래그가 없다 |
| FR-13 | 실패사례 = `IndicatorTrackRecord.missesJson` | **부분** | 게이트 조건은 pass. **출처 테이블이 없어** `failureCases` 가 늘 `[]` 이고 추천 블록은 전부 막힌다 — `DB-REQ-019` FR-45 가 정상으로 정한 상태 |
| FR-16 | 게이트가 `/preview` 에도 | 범위 밖 | 저장 추천에는 preview 경로가 없다. 종목 경로는 FR-104 로 이미 적용 |
| FR-17 | 차단 사유별 카운터 | 미착수 | |
| FR-20~22 · 24 | 추천 범위 제한(`recommendationScope`) | 미착수 | 생성 단계의 일이다 |
| FR-23 | 제외 사실 `excluded[]` | **pass** (2026-09-23) | 상세 응답에 `{ assetType: kr_stock, reasonCode: no_realtime_data }` 상수. 문구는 프론트 |
| FR-30 · 31 · 35 · 36 | 성적표 그룹 · `lowSample` · `insufficient_data` · N+1 제거 | **pass** (2026-09-23) | 슬라이스 11 — 판단 스냅샷 기준. 그룹 집계 · 사례를 SQL 2회로(그룹별 반복 0). `SRV-REQ-025.md` §7 |
| FR-32 · 33 | `lowSample` 에서 게이트 통과 · `coach_feedback` 제외 | **pass** (2026-09-23) | 슬라이스 12 상세 — 표본 1 이상 통과 + `lowSample`, 피드백 행 제외. 무인자 경로는 여전히 기존 동작 |
| FR-34 | 표본 20 상한 | 범위 밖 | 무인자 경로의 기존 동작. 상세는 표본 목록을 싣지 않는다 |
| FR-40 · 41 · 42 · 43 | 3단계 · `gapFromCurrent` · 예측 없음 · 계산식 불변 | **pass** (2026-09-23) | 슬라이스 12. `priceGap` 을 스마트 바이존과 한 함수로. 계산식 특성화 테스트 그대로 통과 |
| FR-44 · 45 | `Money`/`Decimal` 산술 · 3자산군 | 미착수 | 거리만 `Decimal` 로 뺀다. 계산식은 여전히 `Float` · `crypto` 한정 |
| FR-50~53 | preflight | 미착수 | |
| FR-60 · 61 · 62 | 행동 기록 `factCode` + `params` · 인격 문구 없음 · 기존 응답 유지 | **pass** (2026-09-23) | `policy/behavior.ts` `toBehaviorFact`. `behavior-coach` 는 추가만. 모양이 어긋난 payload 는 `null` |
| FR-65 | 거래 < 3 이면 `insufficient_data` | 미착수 | 기존 동작 — 이 슬라이스가 보지 않았다 |
| FR-63 · FR-64 | 거래 단위 라벨러 | 무효 | ADR-002 |
| FR-70~78 | LLM 해설 | 미착수 | FR-102 로 Gemini 입력에서 `confidence` 만 뺐다 |
| FR-80~84 | 쿨다운 5분 · 429 · 설정값 · 워커 제외 · 실패 · 거부 기록 | **pass** (2026-09-23) | 슬라이스 13. `policy/generationCooldown.ts` · `RequestCoachGeneration` · env `COACH_REGENERATE_COOLDOWN_SECONDS`. 기준은 받아들인 수동 요청(`SRV-REQ-025.md` §9) |
| FR-90~91 | `scoreNote` · 점수→확률 변환 금지 | **pass** (2026-09-23) | 종목 경로 · 상세 둘 다 같은 `SCORE_NOTE`. 상세는 점수를 그대로 옮긴다 |

## 2. 종목 판단 경로 (FR-100~171)

| FR | 내용 | 판정 | 위치 |
|---|---|---|---|
| FR-100 | 두 모드 늘 함께 | pass | `GetSymbolCoach` → `modes.scalp` · `modes.longTerm` |
| FR-101 | 중립 라벨 4종 | pass (기존 유지) | `policy/modeDecision.ts` |
| FR-102 | 신뢰도 제거 | pass | `ModeDecision` · `CoachExplanationInput` · explain DTO · Gemini 프롬프트 · Swagger (`1b8abd4`) |
| FR-103 | `validity.code` | pass | `lib/judgmentTrack.ts` `VALIDITY_CODE` — `scalp_5m_24h` · `long_term_1w_1y` |
| FR-104 | 모드별 3종 게이트 | pass | `policy/symbolJudgment.ts` `judgmentGate`. REQ 의 "`renderGate.ts` 를 그대로" 는 그 파일이 없어 **같은 함수 공유는 열림**(Changelog) |
| FR-105 | 근거 · 적중률 · 실패사례의 출처 | pass | `attachJudgmentTrack` — `<mode>.<action>` 성적 · 같은 유형의 `miss` |
| FR-106 | 차단돼도 200 · 판단 블록에만 | pass | 게이트는 `modes.*` 안의 필드. `zone` · `gaugeTrackRecords` 는 그대로 실린다 |
| FR-107 | 종목 판단 스냅샷 | **다르게** | `InvestmentInsight` 대신 별도 테이블 `symbol_judgment_snapshots` — `SymbolJudgmentStore` · `RecordSymbolJudgments.ts` `SnapshotSymbolJudgments` · 10분 워커 |
| FR-108 | 헤드라인에 확신 · 목표가 · 수익률 없음 | 미착수 | 기존 `modeDecision.ts` 문구를 그대로 옮겼다. 검사하지 않았다 |
| FR-110 | `zone` 판별 union | pass | `policy/zone.ts` `Zone` |
| FR-111 | `held_rule` = 익절 계획 3단계 · `priceGap` | pass | `heldRuleZone` → `calculateProfitPlan` |
| FR-112 | `observation` 20 · 50 · 80 백분위 | pass | `observationZone` · `PrismaPriceHistoryRepository.closePercentiles`(`percentile_cont`). 최소 표본 = 기대 캔들 수의 절반(REQ 에 없어 슬라이스가 정함) |
| FR-113 | `notPrediction: true` | pass | 두 종류 모두 |
| FR-114 | 수익률 · 거리 % · 확률 필드 0건 | pass | 테스트가 키 이름을 검사 |
| FR-115 | D12 `unavailable` 3종 | **미충족** | `out_of_scope` · `insufficient_price_history` 는 pass(`lib/resolveZones.ts`). **`excluded_asset` 은 나올 수 없다** — 자산군 enum 이 `stock` 하나(`DB-REQ-003`) |
| FR-116 | 보유 = `PortfolioProbe` | pass | `getHolding` (기존) |
| FR-117 | 구간 스냅샷 `smart_buy_zone` | 범위 밖 | Should |
| FR-120 | `gaugeTrackRecords` 모양 | pass | `policy/gauge.ts` `GaugeTrackRecordView` |
| FR-121 | `GaugeTrackRecord` 사전 집계 | pass | `RefreshGaugeTrackRecords` · 워커 일 1회(`20 0 * * *`) + 부팅 1회 · 집계는 `market` `forwardReturnsByBucket` |
| FR-122 | 표본 0 은 빠짐 · < 20 `lowSample` | pass | `toGaugeTrackRecord` |
| FR-123 | 미래로 읽히는 필드명 0건 | pass | `p25` · `median` · `p75` · `positiveRate` |
| FR-124 | `smart_money` | 범위 밖 | Should |
| FR-130 | 매핑 표 12행 시드 · fallback 체인 미사용 | 미착수 | 종목 판단 8행은 계산식(`judgmentSignalType` = `<mode>.<action>`)이고 시드 데이터는 없다(`DB-REQ-019`) |
| FR-131 | 매핑 · 실패 이력 없음 → 게이트 차단, 에러 아님 | pass | `judgmentGate` 가 `failure_cases_missing` 을 돌려준다(throw 없음). 매핑이 계산식이라 "매핑 없음" 상태는 생기지 않는다 |
| FR-132 | 표본 0 ↔ `null` 구분 | pass | `summarizeJudgmentTrack` — `winRate: null`, `sample: 0` |
| FR-133 | 게이트 차단 카운터 경로 · 모드별 | 미착수 | |
| FR-134 | 사후 판정 · `IndicatorTrackRecord` 미사용 | pass | `EvaluateSymbolJudgments` |
| FR-135 | 적중 판정 B39 | pass | `judgeOutcome` — 테스트 3건 |
| FR-136 | 표본 독립성 | pass | `isJudgmentSnapshotDue` — 쓰는 시점 |
| FR-137 | `insufficient_sample` · 실패 0건 차단 | pass | `judgmentGate` — 테스트 4건 |
| FR-138 | 피하기 근거 = `reasons ∪ risks` | pass | `judgmentEvidence` — `f722e5f`, 테스트 1건 (2026-09-21 사용자 확정) |
| FR-140~142 | 즉석 해설 3종 동봉 · `newsSummary` · 미렌더 시 LLM 미호출 | 미착수 | |
| FR-150~153 | preflight 목표가 선택 · `maxLossOfTotalRate` · `stopLossRate` | 미착수 | |
| FR-160 | 신호 후 수익률 분포(구간 6 + 사분위수) | **pass** (2026-09-23) | 슬라이스 11. **기간은 30 고정이 아니라 그룹의 관찰 기간**(단타 1 · 장기 30) — 단타 표본에 30일이라고 쓰면 거짓이다 |
| FR-161 | 적중 · 실패 이력 동등 | **pass** (2026-09-23) | 성적표는 `hits` · `misses` 둘 다 상한 3. 판단 블록의 `failureCases` 는 여전히 `miss` 만(그 계약은 그대로) |
| FR-162 | 코치 탭 · 리포트 분리 — 서버 계약 불변 | 미착수 | `/api/coach/detail` 이 생겼다(슬라이스 12). 분리는 BFF · FE 의 일 |
| FR-170 | 관심 종목 응답에 판단 필드 없음 | 미착수 | 두 슬라이스가 watchlist 를 건드리지 않았다. 확인하지 않았다 |
| FR-171 | 알림 만들기 | 범위 밖 | REQ 스스로 "이 REQ 에 없다" |

## 3. 집계

| 판정 | FR 수 |
|---|---|
| pass | 51 (이전 30 + 슬라이스 12 의 16: FR-11 · 12 · 14 · 15 · 23 · 32 · 33 · 40~43 · 60~62 · 90 · 91 + 슬라이스 13 의 5: FR-80~84) |
| 다르게 | 2 (FR-107 · FR-10) |
| 부분 | 1 (FR-13 — 출처 테이블 없음) |
| 미충족 | 1 (FR-115 — 3종 중 `excluded_asset`) |
| 범위 밖 | 5 (FR-117 · FR-124 · FR-171 · FR-16 · FR-34) |
| 미착수 | 나머지 (생성 · 범위 제한 · LLM · 쿨다운 · E~G절) |

> 2026-09-23 슬라이스 12 에서 저장 추천 행을 FR 단위로 쪼갰다. 이전 미착수 59 는 행 묶음(FR-1~91)을 섞어 센 값이라
> 다시 세지 않고 "나머지"로 둔다 — 틀린 숫자를 정밀해 보이게 고치느니 세지 않는다.

## 4. 명령 (루트 체크리스트 그대로)

| 슬라이스 | `npm test` | 그 외 |
|---|---|---|
| 1 (`1b8abd4`) | **225/225** (+19: 도메인 13 · 유스케이스 6) | `tsc` · `build` · `npm run lint` · `test:layer-check` pass |
| 2 (`f722e5f` · `2771a9d` · `1553a67`) | **239/239** (+14) | `tsc` · `build` · `eslint src/coach src/market src/workers` · `test:layer-check` pass |
| 11 (성적표) | **274/274** (+12: 도메인 7 · 유스케이스 5) | `build` · `eslint .` · `layer-check` 8파일 · 엔드포인트 · 실행계획 실측 |
| 12 (코치 상세) | **299/299** (+25: 도메인 18 · 유스케이스 7) | `build` · `npm run lint` · `test:layer-check` · `layer-check` 사후 17파일 · 유스케이스 실제 DB 호출(16ms) |
| 13 (쿨다운 · 프로필) | **318/318** (+19: 도메인 7 · 유스케이스 12) | `build` · `lint` · `test:layer-check` · `prisma validate` · 실제 DB 실측 · 쿼리 계획 |

## 5. 미검증

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 워커 실제 회차(10분 스냅샷 · 판정, 일 1회 게이지) | 유스케이스를 직접 불러 확인했다 | 서버 재기동 후 첫 회차 |
| ~~표본 20 도달 · `renderable: true` · `lowSample: false`~~ | ~~시간~~ | **2026-09-23 닫힘** — 로컬 시드로 8그룹 전부 표본 30↑ · explain `renderable: true` 실측. **운영 실데이터는 여전히 시간** |
| 실패사례에 다른 사용자 추적 종목 표시 | 성적이 판단 유형 전체라서 | PM 확인 |

## 6. F009 슬라이스 0 — C04 (2026-09-24)

FR-30 의 그룹 필드 `maxDrawdown` → `worstObservedReturn`(`SRV-REQ-025` FR-55). 판정 · 게이트는 `SRV-REQ-025.md` §10.

## 7. F009 슬라이스 0 — C05 (2026-09-24)

FR-103 — `timeframe` 값 `24h` · `30d`, 해설 `timeframe` 주입 **pass**. 판정 · 게이트는 `SRV-REQ-025.md` §11.

## 8. F009 슬라이스 0 — C06 (FR-172, 2026-09-24)

**pass** — `summarize` · `recentCases` · `scoreboard` · `recentCasesByGroup` 가 `countedOrigins` 로 거르고, `lastJudgedAt` · `saveSnapshots` · `listPending` 은 늘 `live`. 실DB 수치 · 미검증은 `DB-REQ-017.md` C06 절.

## 9. F010 슬라이스 0 — 성적표 신뢰성 (FR-173~176, 2026-09-28, `feat/f010-scorecard-integrity`)

| 확인 | 결과 |
|---|---|
| 지표 버그 | 실 DB `technical_indicators` **0행**(캔들 `5m` · `1d` vs 조회 `m5` · `h1`). 고친 워커 1회 실행 → m5 · h1 · d1 전 종목. BTC RSI 48.7 / 77.7 / 72.9. 단위: 5분봉 100 → m5 · 1,200 → 1시간 묶음 → h1 · 일봉 100 → d1 · 50개 미만 주기는 쓰지 않음(`refreshTechnicalIndicators.test.ts`) · 묶기 규칙(`aggregateCandles.test.ts`) |
| 모드별 봉(FR-173) | `latestIndicators` 가 `h1` · `d1` 둘을 묻고 결측이 모드별 · 고른 모드의 지표를 근거로 · 채점 종가 단타 `m5` · 장기 `d1`(`symbolJudgment.test.ts` §F010) |
| 수수료 · 기저율(FR-174) | `judgeOutcome` 경계 0.0011 hit / 0.001 miss · 피하기 0.001 hit · 기저율 후보 0.6 → 초과 +0.1 · 피하기 +0.3 · 관망 null · 표본 0 null(domain 테스트). 실 DB 재판정: live 18행 hit 5 · miss 13(전부 `avoid`, 변화 없음) |
| 추천 원장(FR-175) | 30일 후만 채점 · 일봉 종가 · 종가 없으면 미룸 · 30일 내 재기록 안 함 · `buy`/`sell`/`hold` 경계(`recommendationLedger.test.ts`). 실 표: DDL · 인덱스 · FK 적용 확인 |
| 성적표 · 게이트(FR-176) | `signal-performance` 표본 5 → `insufficient_data` · `signalKey=buy` → `coach.buy` 그룹 · 종목 필터 · 다른 사용자 0 · `samples[].exitPrice` · 상세 표본 19 → `insufficient_sample` · 24 → 렌더 + 실패사례 3 · 24/실패 0 → `failure_cases_missing`(`getCoachDetail.test.ts`) |
| 전체 | `npm test` **507 / 0**(+12) · `tsc` · eslint · 마이그레이션 `prisma migrate deploy` 3개 |

### 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 추천 원장에 실제 행 | 워커를 이 브랜치로 재기동하지 않음 | 머지 뒤 첫 회차 |
| 30일 채점 실값 · 화면 "기준 대비" | 표본이 30일 뒤 | 2026-10-28~ |
| 기존 live 판단 표본이 "지표 없는 판단" | 표식 없음 — 슬라이스 1 재료 스냅샷 | 슬라이스 1 |
| 진입가(1분 시세) · 청산가(봉 종가) 원천 | 원장 통합 때 | 슬라이스 1 |

## 10. F010 슬라이스 1 — 대형 체결 수집 · 예측 원장 (FR-177 · 178, 2026-09-29, `feat/f010-slice1-prediction-ledger`)

| 확인 | 결과 |
|---|---|
| 대형 체결 수집(FR-177) | 테스트: 상위 · 관심 합집합(겹침 한 번) · 5천만원 미만 제외 · 상한 없이 전부 · `truncated` · 발생 시각 · 체결 id 가 행에 · 한 종목 실패가 전체를 안 멈춤 · **다음 회차는 훑은 마지막 체결 뒤부터**(대형 체결 시각이 아니다) · 재기동 뒤 1시간 상한(`market.test.ts`) |
| 실 DB | 첫 실행에서 재개 지점 결함 발견(두 번째 회차도 21종목 상한) → `fbb555c`. 고친 뒤 개발 서버 워커 5분 회차 13:05 · 13:07 · 13:09 · 13:15 · 13:20 UTC 에 발생 시각 있는 행 · **`(symbol, sequential_id)` 중복 0** |
| 원장(FR-178) | 테스트: 추적 × 두 모드 · 날 키 UTC 자정 · 규칙 버전 · 국면(BTC 가 추적에 없어도 BTC 재료로) · 기여 합 = 점수 − 50 · 모드 봉(h1 / d1) · 대형 체결 발생 시각 우선 · 같은 날 두 번째 회차는 재료 조회 0(`judgmentLedger.test.ts`) · `makeModeDecision` 과 판단 동일 · 응답에 `components` 없음 |
| 실 DB | 개발 서버가 12:52 UTC 발행 — BTC · ETH · XRP × 2 = 6행 · `missing_data` 빈 배열(지표 · 심리 · 대형 체결 다 있음) · 국면 `bullish`. 재실행 0행 |
| 전체 | `npm test` **514 / 0**(+7) · `tsc` · eslint(`src/coach` · `src/market` · `src/workers`) · `npm run build` · 레이어 훅(Bash 로 쓴 파일 전부 사후 실행) |
| 실행계획 | `publishedOn` Index Scan `judgment_ledger_as_of_date_idx` 0.3ms. 대형 체결 `latestTradedAt` · 최근 20건은 지금 표가 작아(420행) 순차 스캔 · top-N 정렬 0.2ms |

### 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 대형 체결 최근 조회 정렬 `traded_at DESC NULLS LAST` 가 인덱스(`symbol, traded_at` ASC)를 못 탄다 | 지금 420행 — 의미 있는 계획이 안 나온다 | 10만 행 넘으면 `EXPLAIN` 다시, 필요하면 `DESC NULLS LAST` 인덱스 마이그레이션 |
| 운영 단일 프로세스에서 한 회차 소요 · 429 | 로컬은 개발 서버와 IP 한도를 나눠 첫 실행 5분 · 429 다수 | 배포 후 첫날 로그 |
| 자정(UTC) 전후 체결 틈 | 업비트 체결 조회는 하루 안만 — 최대 5분 | 라이브 원장 IC 때 영향 확인 |
| 가중 변경 `mode-decision@2` | 사용자 결정 대기 · 성적표 규칙 버전 분리가 먼저 | 다음 커밋 |

## 11. F010 슬라이스 1 — `mode-decision@2` (FR-179, 2026-09-29)

| 확인 | 결과 |
|---|---|
| 규칙 | 특성화(`coachPolicy.test.ts`): +5% → 단타 38 `avoid`(@1 62) · 장기 44 · 결측 3 → 26 · 최대 가점 단타 68 · 장기 64 → 둘 다 `wait`(후보 문턱 70 미도달) · 대형 체결 · 장기 심리 문장 0 |
| 문구 | 입력 144조합 × 2모드에서 나오는 모든 근거 · 위험 · 헤드라인이 `languageViolations` 0 |
| 해설 사실 | 장기: 심리 · 고래 없음, 단타: 심리 있음 · 고래 없음(`SCORED_ITEMS`) — `judgmentLedger.test.ts` · `explainCoachDecision.test.ts` |
| 버전 분리 | 성적표 게이트 테스트를 `long_term.wait` @2 표본으로. 실 DB: 기존 267행 @1, v2 live 6행 00:07 UTC 바로 기록 · 원장 09-28 6행 @2(v1 은 셋 다 고래 −8 로 `avoid` → v2 `wait`) |
| 표본 안 확인(증거 아님) | IC 단타 −0.018 → +0.041 · 장기 +0.015 → +0.026. 문턱을 비율로 낮추면(62 · 59) 후보 칸 시장 대비 초과 −0.03% · +0.01% → **문턱 유지**. 피하기 칸 −0.10%/일 · −0.78%/30일 |
| 전체 | `npm test` **516 / 0** · `tsc` · eslint · `npm run build` · 레이어 훅 |

### 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| v2 의 표본 밖 성적 | 백테스트는 같은 데이터로 고른 규칙 | 원장 IC 2026-11-23 · 성적표 v2 표본 20(단타 약 3주 · 장기 20 × 30일) |
| 화면 판단 블록 | v2 표본 20 전까지 `insufficient_sample`(정상) | 위와 같음 |
| 후보 문턱 재추정 | 사전등록 밖 — 엿보기 | `rule-ic@2` 사전등록 |

## 12. F010 슬라이스 2 — σ 익절 계획 · 원장 국면 재료 (FR-180 · 181, 2026-09-29, `feat/f010-slice2-regime-vol`)

| 확인 | 결과 |
|---|---|
| FR-180 계산 | `policy.test.ts` 변동성 계획 4건 — −1σ · +2σ · +3σ 가격, +1σ 손절 올림, +2σ 익절 현재가, −1σ 손절 검토(−8% 는 σ_h 16% 종목에서 계획 유지 · 고정 계획은 손절 검토). 변동성 0 · 음수 · NaN · ∞ → 고정. 기존 특성화 7건 그대로 통과 |
| FR-180 세 화면 | `ListProfitPlans` · `resolveZones`(`GetSymbolCoach`) · `GetCoachDetail` 에 `symbolRisk` 한 쿼리 · 실패 → 고정. 기존 zone · coachDetail 테스트 통과 |
| FR-180 실 DB | `symbolRisk(["btc","ETH","XRP","NOPE"])` → BTC 0.362 · XRP 0.656, ETH 는 변동성 게이트가 막혀 `annualized: null` → 고정 계획, NOPE 없음. XRP 평단 1000 → 손절 857.64 · 1차 익절 1359.52 · 추세 1585.18 |
| FR-181 | `judgmentLedger.test.ts` — 재료 `market` · `risk` 가 실린다 · **같은 재료면 점수 동일** · 읽기 둘 다 실패해도 2행 발행 |
| 쿼리 | `v_realized_vol` `symbol = ANY(...)` EXPLAIN ANALYZE 1.43ms(18행 정렬 — 인덱스로 좁힘) · `v_market_regime` 0.11ms |
| 전체 | `npm test` **528 / 0**(+14) · `tsc` · eslint · `npm run build` · 레이어 훅(바뀐 25파일) |

### 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 화면에 σ 근거 표시 | BFF · 프론트는 이번 슬라이스 밖 — 가격만 바뀌어 보인다(σ 가 큰 종목은 손절이 멀어진다) | F010 슬라이스 3 |
| 인증된 HTTP 실측 | 로컬 토큰 발급 불가 — 유스케이스 · 리더 직접 호출로 확인 | 로그인 QA(사용자) |
| 원장 국면 재료 실제 행 | 워커 다음 UTC 날 발행 때 첫 행 | 2026-09-30 워커 |
| 운영 DB | 로컬만 | 배포 시 |

## 13. F010 슬라이스 5 — 목표 비중 안내 (FR-182~186, 2026-09-29, `feat/f010-slice5-target-weight`)

| 확인 | 결과 |
|---|---|
| FR-182 규칙 | `targetWeight.test.ts` — Python 과 같은 고정 벡터 4 · σ 없으면 전부 현금 · 다음 월요일(수 · 월 00:00 정각 · 일) |
| FR-182~185 안내 | 같은 파일 9건 — 보유 + BTC · ETH 역변동성 · 부족 · 초과 원 · 수량 · 손절선 exp(−σ√(20/365)) · 손절 손실 수수료 · σ 밴드 · 베타 합(베타 있는 종목만) · σ 없는 보유는 `excluded` · 투자금 없음 → `crypto_value` · 투자금 < 보유 → 보유 합 · 둘 다 없음 → `no_capital` · 최소 주문 미만 → `at` · 손절 손실 ÷ 남은 월 예산 |
| FR-183 σ 원천 | `tradePlanAndRisk.test.ts` — `annualized` 가 없어도 `ewma` 가 있으면 들어간다 · σ 가 하나도 없으면 `renderable: false` |
| FR-184 · 186 유스케이스 | 같은 파일 — 게이지와 같은 월 잔여(예산 소진이면 비율 없음) · 가장 가까운 목표 σ 기록 · `orderExecution: false` |
| FR-186 상수 = 리포트 | `targetWeight.test.ts` — 리포트 1차 표 core 5행의 CAGR · σ · MDD · 포착 · 노출 · claims 3개, 실패 사례 달 순서가 상수와 같다 |
| 실 DB | 유스케이스 직접 호출(가장 보유가 많은 로컬 계정): 수정 전 BTC 1종목 · ETH `volatility_unavailable` → 수정 뒤 BTC σ 0.3615 · ETH 0.4207 → 목표 20.7% · 17.8%, 투자금 없음이라 둘 다 `over`. 투자금 25,000,000 · 목표 σ 20% 를 메모리에서만 주면 둘 다 `under`(+1,254,628 · +1,570,210원). 쿼리 6개(+ 월초 보유 종목 수만큼 월초 종가) · 28ms(두 번째 실행) |
| 스키마 | `migrate deploy` 적용 · `migrate diff` 에 이 컬럼 차이 없음(남은 것은 이전 슬라이스 인덱스 이름 2개 — 63자 잘림) · CHECK 이름 확인 |
| 전체 | `npm test` **550 / 0**(+22) · `npm run build` · `npm run lint` · 레이어 훅(쓰기 시점) |

### 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 인증된 HTTP 실측 | 로컬 토큰 발급 불가 — 유스케이스 직접 호출로 확인 | 로그인 QA(사용자) |
| 안내 라이브 채점 | 사용자별 계산 — 사전등록이 백테스트 기록으로 정했다 | `target-weight@2`(core 모델 포트폴리오 매일 발행) |
| 보유 알트 몫의 별도 고지 | 사전등록이 core 기록만 화면에 쓰게 정했다(알트 섞으면 기록이 나쁘다) | `target-weight@2` |
| 운영 DB | 로컬만 | 배포 시 |

## §14. target-weight@2 — 알트 규칙 밖 · 라이브 원장 (FR-187~190, 2026-09-29)

| FR | 위치 | 결과 |
|---|---|---|
| FR-187 | `coach/domain/policy/targetWeight.ts` `TARGET_WEIGHT_ALT_SHARE` · `buildTargetWeightGuide` | 테스트: 규칙은 BTC · ETH 만 · SOL `no_record`(평가금 포함) · 보유 알트와 무관하게 core 비중 같음 · `outsideRuleWeight` 0.1 |
| FR-188 | 같은 파일 `fundable` · `gapCapped` · `no_room` | 테스트: 현금 0 → 두 부족 행 `no_room`(비중은 그대로) · 현금 200,000 → 부족 합 200,000 으로 비례 · core 초과분은 다른 core 부족에 쓴다 |
| FR-189 | `targetWeightRecord.ts` `TARGET_WEIGHT_ALT_SHARE_RECORD` | 리포트 판정 줄 · 0.15 행 CI 대조 테스트 |
| FR-190 | `ports.ts` `targetWeightLive` · `PrismaForecastReader` · `GetTargetWeights` · DTO | 유스케이스 테스트: 가까운 등록 목표로 조회 · 29주 `backtest` · 30주 `live`. 실 DB 호출 `null`(행 0) · `EXPLAIN (ANALYZE, BUFFERS)` Index Scan `target_weight_live_summary_pkey` · shared hit 2 · 0.015ms |

- `npm test` 555 / 0 · `tsc --noEmit` · `npm run lint` 통과. prettier 는 레포 설정이 없어 돌리지 않았다
- **BREAKING**(응답): 보유 알트가 `rows` 에서 `excluded`(`no_record`)로 옮겨 갔다 · `status` 에 `no_room` — BFF(`BFF-REQ-041` FR-4) · 프론트 타입 같은 PR

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 인증된 HTTP 실측 | 로컬 토큰 발급 불가 — 어댑터 직접 호출 · 화면은 Playwright route | 로그인 QA(사용자) |
| 라이브 원장 실제 행이 있는 응답 | 첫 리밸런스 2026-10-05 | 2026-10-12 결과 뒤 |
| 운영 DB 마이그레이션 | 로컬만 | 배포 시 |

## §15. F010 슬라이스 6 — 거래소 투자유의 (FR-191~193, 2026-09-30, `feat/f010-slice6-independent-data`)

| FR | 위치 | 결과 |
|---|---|---|
| FR-191 | `domain/policy/symbolJudgment.ts` `judgmentGate` 첫 검사 · `application/lib/judgmentTrack.ts` · `GetSymbolCoach` | 테스트: 근거 · 표본 · 실패사례가 다 있어도 `exchange_warning` · 근거 없음보다 먼저 · 유스케이스에서 두 모드 다 막힘 · 읽기 실패와 `forecasts` 없음은 지금과 같다(fail-open) |
| FR-192 | `GetSymbolCoach` `exchangeFlag` | 테스트: 주의만이면 판정 그대로 + `cautions` · 유의면 `warning: true` |
| FR-193 | `domain/policy/candidates.ts` `withoutExchangeWarning` · `GenerateCoachRecommendation` | 테스트: 유의 종목 후보(보유 매도 포함) 제외 · 순서 유지 · 주의만 · 표시 없음은 그대로 |
| 포트 | `ports.ts` `marketWarnings` · `PrismaForecastReader` | 실 DB 어댑터 호출(스크래치 스크립트, 지움): ICX `warning: true` · ALGO 주의 2종 · BTC 없음 · 없는 종목은 맵에 없음. `EXPLAIN (ANALYZE, BUFFERS)` 3종목 0.375ms — 지금은 Seq Scan(580행), 표가 커지면 `market_warning_snapshot_latest` 인덱스 |

- `npm test` 559 / 0 · `tsc --noEmit` · `npm run build` · `npm run lint` 통과
- 원장(`judgment_ledger` · 판단 스냅샷)은 **바꾸지 않았다** — 유의 종목의 규칙 판단도 계속 기록된다(규칙을 재는 표). 화면 · 추천만 막는다
- `modeDecision` · `dualDecision`(하위 호환 필드)은 게이트가 없다 — 쓰는 곳은 BFF `getPreview`(스트리밍 측정 페이지) 하나라 BFF 에서 `exchangeFlag.warning` 이면 비운다(`BFF-REQ-039`)

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 인증된 HTTP 실측 | 로컬 토큰 발급 불가 — 어댑터 · 유스케이스 직접 확인 | 로그인 QA(사용자) |
| 유의 지정 뒤 성과 통계 | 원천에 이력이 없다 — `market-warning@1` 라이브 기록 | 2026-11-25 |
| 운영 DB 마이그레이션 | 로컬만 | 배포 시 |
