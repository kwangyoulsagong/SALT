# SRV-REQ-039 체크리스트 — 성적 4요소 claim · 성적 금지어 (2026-10-07)

| FR | 위치 | 결과 |
|---|---|---|
| FR-1 | `coach/domain/policy/performanceClaim.ts` | `claimPeriod` · `claimBaseline` · `claimMisses` — 표본 0 이면 세 칸 `no_sample` |
| FR-2 | `symbolJudgment.ts` · `recommendationJudgment.ts` · `PrismaSymbolJudgmentStore`(summarize · scoreboard SQL) · `PrismaRecommendationSnapshotStore` | 테스트 3(후보 네 칸 · 관망 기준 `no_direction` · 표본 0). 실 DB 스크래치: 성적표 SQL 그룹별 `first/last_scored_at`(2026-09-29 ~ 10-06) |
| FR-3 | `gauge.ts` · `ports.ts` · `PrismaGaugeTrackStore.baselinePositiveRate` · `GetSymbolCoach` | 앱 테스트 메모리 저장소 기대값(`all_gauge_days`) · 실 DB 쿼리 실행(로컬은 구간 1개라 기준 = 구간 값) |
| FR-4 | `targetWeightRecord.ts` `mondaysBetween` · `targetWeightClaim` · `GetTargetWeights` | 테스트 3(월요일 양끝 · 백테스트 455 · 라이브 기간) |
| FR-5 | `forecast.ts` · `macroEvents.ts`(쏠림은 `toEventHorizon` 공유) · `PrismaForecastReader` | 테스트 3. 실 DB: BTC 1주 `2025-09-22 ~ 2026-09-14 · 52 · 범위 밖 7` · 2주 8 · CPI `판정 58 중 4` · 쏠림 `판정 13 중 2` |
| FR-6 | `languageGuard.ts` | 테스트: 금지 7문장 · 부정 · 기능 이름 4문장 통과 · 규칙 문장 전수 검사 0건. "아닙니다" 가 `아니` 로 시작하지 않아 부정형이 걸리던 것을 스크래치로 찾아 고쳤다 |
| FR-7 | `presentation/dto/targetWeightView.ts` | 실스택 BFF 응답에 `claim` 455주 · `hold_btc` 확인 |

## validate

- `npm test` 605 / 0 · `npm run build` 0 errors · `npm run lint` 통과 · `prisma migrate deploy`(로컬, `DB-REQ-029` FR-25)
- 실스택: 로컬 서버(4000) → BFF(4001) 응답에 claim 6종 확인(성적표 · 목표 비중 · 변동 범위 · 사건 · 종목 판단 막힘 · 리포트)

## 공통 수용 기준

1. 3종 게이트 무변경 — 여는 경로 없음 2. 주문 코드 0 3. 숫자는 서버(빗나간 수 · 기간 · 기준 비율) 4. 금지어 검사가 늘었다

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 판단 · 추천 claim 실데이터 화면 | 로컬 판단 표본 < 20 · 추천 없음 — route 주입으로만 화면 확인 | 라이브 표본 20 이상(판단 블록 v2) · 첫 추천 생성 뒤 |
| 게이지 기준 실값 | 로컬 심리가 09-30 뒤 멈춰 구간 1개뿐 | 심리 계산 워커화(별도 REQ) 뒤 |
| 새 집계 `EXPLAIN (ANALYZE, BUFFERS)` | 기존 집계에 MIN/MAX 두 개 · 게이지 한 종목 SUM — 행 수 작다 | 성적표 표본이 수만을 넘으면 |
| 미러 · 복기 · 보유 손익 | 사용자 결정 — 본인 기록은 적용 제외 | 범위 밖 |
| 운영 배포 | 로컬만 | 배포 시 |
