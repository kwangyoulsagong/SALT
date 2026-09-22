# SRV-REQ-024 (F004 FUNC) — 검증 체크리스트

- REQ: `salt-server/requirements/specs/in-progress/SRV-REQ-024-F004-FUNC.md`
- 브랜치: `feat/f004-symbol-judgment`(PR #48, `6f701b4`) → `feat/f004-zone-gauge`(PR #49, `ebadcf9`) · 검증일: 2026-09-21
- 작성: 2026-09-22 (backfill — 루트 체크리스트 두 개와 `src/coach` · `src/market` 코드에서 옮겼다. 새로 돌린 검증은 없다)
- 상태: **부분 완료** — 종목 판단 경로(A절 · B절 · C절 · D절 일부)가 닫혔다. 저장 추천 경로(FR-1~91)와 E~G절은 미착수
- **전 영역 통합 기록**: 루트 `requirements/reports/checklists/F004-symbol-judgment.md` · `F004-zone-gauge.md`

판정: **pass** · **다르게**(REQ 와 다른 구조로 구현, Changelog 기록) · **미충족**(슬라이스 범위였는데 못 닫음) ·
**범위 밖**(슬라이스가 명시적으로 뺐다) · **미착수**(두 슬라이스가 건드리지 않았다 — 기존 코드 상태는 여기서 판정하지 않는다) · **무효**(REQ 개정으로 사라짐)

## 1. 저장 추천 경로 (FR-1~91) — 두 슬라이스 범위 밖

| FR | 내용 | 판정 | 비고 |
|---|---|---|---|
| FR-1~4 | `coach` 컨텍스트 통합 · 점수 엔진 불변 · 스냅샷 테스트 | 미착수 | `src/coach` 는 `SRV-REQ-006` 이관으로 이미 있다. FR-4 스냅샷 테스트는 이 체크리스트에서 보지 않았다 |
| FR-10~17 | `renderGate.ts` 순수 함수 · 3종 · 200 · 우회 없음 · `/preview` · 카운터 | 미착수 | `src/coach/domain/policy/renderGate.ts` 없음 |
| FR-20~24 | 추천 범위 제한(`recommendationScope`) | 미착수 | |
| FR-30~36 | 성적표 그룹 · `lowSample` · N+1 제거 | 미착수 | 종목 판단 성적은 별도(D절) |
| FR-40~45 | 익절 플랜 `gapFromCurrent` · `Decimal` · 3자산군 | 미착수 | `calculateProfitPlan` 은 B절이 **그대로** 재사용만 했다 |
| FR-50~53 | preflight | 미착수 | |
| FR-60~62 · FR-65 | 행동 기록 `factCode` + `params` | 미착수 | |
| FR-63 · FR-64 | 거래 단위 라벨러 | 무효 | ADR-002 |
| FR-70~78 | LLM 해설 | 미착수 | FR-102 로 Gemini 입력에서 `confidence` 만 뺐다 |
| FR-80~84 | 쿨다운 | 미착수 | |
| FR-90~91 | `scoreNote` · 점수→확률 변환 금지 | 미착수 | 종목 경로 `modes.*.judgment.scoreNote` 는 있다(`lib/judgmentTrack.ts` `SCORE_NOTE`). 저장 추천 응답은 미착수 |

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
| FR-160~162 | 30일 수익률 분포 · 적중/실패 동등 | 미착수 | 종목 판단 사례 상한은 `JUDGMENT_CASE_LIMIT = 3` 이지만 응답에는 `miss` 만 싣는다 |
| FR-170 | 관심 종목 응답에 판단 필드 없음 | 미착수 | 두 슬라이스가 watchlist 를 건드리지 않았다. 확인하지 않았다 |
| FR-171 | 알림 만들기 | 범위 밖 | REQ 스스로 "이 REQ 에 없다" |

## 3. 집계

| 판정 | FR 수 |
|---|---|
| pass | 24 |
| 다르게 | 1 (FR-107) |
| 미충족 | 1 (FR-115 — 3종 중 `excluded_asset`) |
| 범위 밖 | 3 (FR-117 · FR-124 · FR-171) |
| 미착수 | 68 |
| 무효 | 2 (FR-63 · FR-64) |

## 4. 명령 (루트 체크리스트 그대로)

| 슬라이스 | `npm test` | 그 외 |
|---|---|---|
| 1 (`1b8abd4`) | **225/225** (+19: 도메인 13 · 유스케이스 6) | `tsc` · `build` · `npm run lint` · `test:layer-check` pass |
| 2 (`f722e5f` · `2771a9d` · `1553a67`) | **239/239** (+14) | `tsc` · `build` · `eslint src/coach src/market src/workers` · `test:layer-check` pass |

## 5. 미검증

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 워커 실제 회차(10분 스냅샷 · 판정, 일 1회 게이지) | 유스케이스를 직접 불러 확인했다 | 서버 재기동 후 첫 회차 |
| 표본 20 도달 · `renderable: true` · `lowSample: false` 실데이터 | 시간 | 판단 유형당 20표본 · 게이지 구간당 20일 |
| 실패사례에 다른 사용자 추적 종목 표시 | 성적이 판단 유형 전체라서 | PM 확인 |
