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
