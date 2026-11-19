# SRV-REQ-022 checklists

## 2026-10-29 REQ 전수 조사

- 머리 정정 블록: 김프 선행 조건이 깨졌다 — F006 은 `FxRate` 를 보류했고(`DB-REQ-021` FR-33) `fx` 컨텍스트도 없다. 반면 `forecast.mar / F004 3종 게이트가 `IndicatorTrackRecord` · `signalTypes` GIN 에 의존한다는 전제는 사실 아님 — F004 는 판단 · 추천

## 2026-11-19 F003 v2 순서 2

- 워커 · 외부 클라이언트 0(grep). 예측 뷰 둘 실조회 · 주별 뷰 범위 UTC 고정(세션 시간대 무관) · 쓰기 한 문장씩(`noParallelRowWrites` 통과)
- 미충족: 없음(이 REQ 몫)

## 2026-11-19 FR 대조 정리(`WEB-perf-req-close-slice.md`)

| FR | 판정 | 근거 |
|---|---|---|
| FR-1 · 3 · 4 · 5 | 대체 | `indicator` · `fx` 컨텍스트가 없다 — 예측 뷰 직접 읽기(`src/plan/infrastructure/PrismaBandReader.ts`) |
| FR-2 · 6 | 충족 | `src/plan/domain` 의 Prisma · express · axios import 0 · `infrastructure/index.ts` 없음 · `test:layer-check` |
| FR-10~16 | 대체 | 서버 외부 지표 클라이언트가 없다 — `FC-REQ-029` |
| FR-20~25 | 대체 | 김프는 예측 배치가 저장 — 서버 계산 · 캐시 · 디페그 대상이 없다 |
| FR-30 | 충족 | Port `BandReader` · `ExecutionStore` · settings — `src/plan/domain/ports.ts` |
| FR-31 | 충족 | 자산마다 최신을 한 번에 — `PrismaBandReader.ts:108` |
| FR-32 | 대체 | 누적액 때문에 시작 주부터(`application/lib/syncWeeks.ts:30`) — 실측 Seq Scan 0.08~0.15ms |
| FR-40~47 | 대체 | 워커 0 — 읽을 때 채움(`SRV-REQ-020` 머리 블록) · 지난 주 마감 한 문장(`infrastructure/PrismaExecutionStore.ts:70`) |
| FR-50~53 | 대체 | 2026-09-21 삭제 |
| FR-60 · 61 | 대체 | `BandPreset` 이 없다 — 예측 행 `bands` |

미충족 — 없음
