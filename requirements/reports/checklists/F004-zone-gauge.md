# F004 슬라이스 2 — zone · 게이지 적중률 — 체크리스트

슬라이스: `requirements/specs/in-progress/F004-zone-gauge-slice.md` · 2026-09-21
브랜치: `feat/f004-zone-gauge` (base `main` `6f701b4`)

## 1. 요구사항 ↔ 구현

| REQ · FR | 판정 | 위치 |
|---|---|---|
| `SRV-REQ-024` FR-138 피하기 근거 `reasons ∪ risks` | pass | `policy/symbolJudgment.ts` `judgmentEvidence` |
| FR-110 `zone` 판별 union | pass | `policy/zone.ts` `Zone` |
| FR-111 `held_rule` = 익절 계획 3단계 · `priceGap` | pass | `heldRuleZone` → `calculateProfitPlan` 그대로 |
| FR-112 `observation` 20 · 50 · 80 백분위 | pass | `observationZone` · `PrismaPriceHistoryRepository.closePercentiles`(`percentile_cont`) |
| FR-113 `notPrediction: true` | pass | 두 종류 모두 |
| FR-114 수익률 · 거리 % · 확률 필드 0건 | pass | 테스트가 키 이름을 검사 |
| FR-115 D12 `out_of_scope` · `insufficient_price_history` | pass | `lib/resolveZones.ts` |
| FR-115 `excluded_asset`(국내 주식) | **미충족** | 자산군 enum 이 `stock` 하나 — `DB-REQ-003` |
| FR-116 보유 = `PortfolioProbe` | pass | `getHolding` (기존) |
| FR-117 구간 스냅샷 `smart_buy_zone` | 범위 밖 | Should |
| FR-120 `gaugeTrackRecords` 모양 | pass | `policy/gauge.ts` `GaugeTrackRecordView` |
| FR-121 `GaugeTrackRecord` 사전 집계 | pass | `RefreshGaugeTrackRecords` · 워커 일 1회 + 부팅 1회 |
| FR-122 · `SRV-REQ-025` FR-46 표본 0 은 빠짐 · < 20 `lowSample` | pass | `toGaugeTrackRecord` |
| FR-123 미래로 읽히는 필드명 0건 | pass | `p25` · `median` · `p75` · `positiveRate` |
| FR-124 `smart_money` | 범위 밖 | Should |
| `SRV-REQ-025` FR-44 `stages` 3개 · `lower ≤ mid ≤ upper` | pass | 정렬로 못 박음 |
| `DB-REQ-017` FR-55 · FR-57 `GaugeTrackRecord` · 유니크 · 구간 폭 | pass | 마이그레이션 `20260921084152_add_gauge_track_record` |

## 2. 실측 (로컬 DB)

| 확인 | 결과 |
|---|---|
| BTC · ETH (보유) | 두 모드 `held_rule`, `raise_stop_review`. BTC 손실 제한 106,315,880 · `priceGap` −6,786,120 |
| 미보유 AKT | 단타 `observation` 표본 166(5분봉 24h) · 장기 표본 365(일봉 1년), `lower ≤ mid ≤ upper` |
| 관찰 구간 쿼리 | BTC 5분봉 24h 179행 · 일봉 1년 365행 · 없는 심볼 `{sample: 0, values: null}` |
| 게이지 집계 | 92줄 · 46ms. 심리 이력이 5월 25일부터 328 심볼·일이라 줄마다 표본 1~2 |
| 게이지 재실행 | 92줄 그대로 — 멱등 |
| 응답 게이지 | AKT 심리 70 → `60_80` · 표본 1 · `lowSample: true`. BTC 는 지금 구간에 표본이 없어 `[]` |
| 피하기 게이트 (BTC 두 모드) | 슬라이스 1 실측 `reasons_missing` → **`insufficient_sample`** |

## 3. 게이트

| 항목 | 결과 |
|---|---|
| `npm test` | **239/239** (+14: 도메인 게이트 1 · zone 7 · 구간 1 · 유스케이스 zone 3 · 게이지 2) |
| `tsc` · `npm run build` · `eslint src/coach src/market src/workers` · `test:layer-check` | pass |
| 마이그레이션 | 테이블 추가만. 되돌리기 = `DROP TABLE gauge_track_records` |

## 4. 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 워커 실제 회차(10분 · 일 1회 `20 0 * * *`) | 유스케이스를 직접 불러 확인했다. 워커 로그는 보지 않았다 | 서버 재기동 후 첫 회차 |
| 게이지 표본 20 도달 · `lowSample: false` 실데이터 | 심리 이력이 4개월, 하루 1표본이다 | 시간 — 구간당 20일 이상 |
| `excluded_asset` | 자산군 enum 이 `stock` 하나 | `DB-REQ-003` |
| `smart_money` 게이지 · 구간 스냅샷 | Should | F004 후속 |
| `market.test.ts` 타입 오류 3건(`findLatestMany` 등 fake 누락) | 이 브랜치 이전부터 있다. `tsx` 테스트는 타입을 보지 않아 통과한다 | 별도 정리 |
| 실패사례에 다른 사용자 추적 종목 표시 | 성적이 판단 유형 전체라서 | PM 확인 (2026-09-21 사용자: PM 대기) |
| BFF `confidence: undefined` · 새 필드 BFF 미전달 | BFF 슬라이스 | `BFF-REQ-023~025` |
