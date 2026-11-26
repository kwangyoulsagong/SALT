# SRV-REQ-063 체크리스트 — 해설 지난 날

| FR | 위치 | 결과 |
|---|---|---|
| FR-1 거래일 지문 | `coach/domain/policy/explanationSnapshot.ts` `explanationFingerprint`(`tradeDay`) · `explanationTradeDay` · `application/lib/explanationMaterials.ts` · 시험 `explanationSnapshot.test.ts` "거래일이 바뀜" | [x] |
| FR-2 최근 흐름 재료 | `domain/policy/recentFlow.ts` · `explanationFacts.ts`(판단 바로 뒤 근거) · 사실표 id `recent-flow` · `infrastructure/explanationPrompt.ts` 지시 · `explain-prompt@5` · 닫힌 일봉 `ForecastReader.dailyCloses` · 시험 `recentFlow.test.ts` 7(실제 005930 일봉 −9.87% · 장 마감 뒤 오늘 봉) · `explanationRecentFlow.test.ts` 3(검증기 방향) | [x] |
| FR-3 보존 5 + 30일 날마다 1 | `infrastructure/PrismaExplanationSnapshotStore.ts` `prune` · `application/lib/explanationGeneration.ts` | [x] |
| FR-5 상한 600(해설 몫 510) | `coach/domain/policy/llmBudget.ts` `DEFAULT_LLM_BUDGET` · 경계 시험 `factExtraction.test.ts`(510 · 540 · 600) | [x] |
| FR-4 지난 날 읽기 | `application/ListSymbolExplanationHistory.ts` · `PrismaExplanationSnapshotStore.listDaily` · `presentation/aiCoach.routes.ts` `GET /api/ai-coach/explanation/history`(Swagger) · DTO `explanationHistoryQuerySchema` · 시험 `explanationHistory.test.ts` 5 | [x] |

| 검증 | 결과 |
|---|---|
| `npm test` | 2,018 통과 |
| `npm run build`(tsc) · `npm run lint` · `npm run test:layer-check` | 통과 |
| 실 DB `listDaily` 005930 장기 | 11-19 11:35 · 11-17 13:25 · 11-16 11:56(KST) — 세션 시간대 `Asia/Seoul` · `UTC` 둘 다 같은 결과 |
| 실 DB 보존 규칙 | 지울 행 수를 같은 조건 SELECT 로 셈 — 005930 장기 0 |
| `EXPLAIN (ANALYZE, BUFFERS)` | `explanation_snapshot_latest_idx` · 0.137ms |
| 새 프롬프트 실해설(`explain-prompt@5`) | 상한을 올린 직후 회차 — 000660 SK하이닉스 단타 "직전 거래일 -11.05%, 5거래일 전 종가 대비 -10.99%, 최근 20거래일 최고 종가 대비 -31.00%로 밀린 흐름 속에서 오늘은 +2.23% 움직였어요" · 000270 기아 · 000810 삼성화재도 흐름과 함께 |
| 실경로 서버 → BFF → 웹 | 임시 사용자로 `GET /api/app/ai-coach/explanation/history` 200 · 등락률 6개 손계산 일치 · 데스크톱 1280 · 휴대폰 390 실화면(`FE-REQ-079` 체크리스트) |

### 검증 중 찾아 고친 것

- `explanation_snapshot.generated_at` 은 **timestamptz** 인데 처음 SQL 은 시간대 없는 UTC 로 가정(`+ interval '9 hours'` · `AT TIME ZONE 'UTC'`) — 세션이 `Asia/Seoul` 이라 15시(KST) 뒤 해설 110벌이 다음 날로 묶이고 범위가 9시간 밀렸을 것. 첫 실 DB 확인은 표본(11~13시)이 우연히 통과했다. `AT TIME ZONE 'Asia/Seoul'` · `::timestamptz` 로 고치고 두 세션 시간대로 같은 결과를 확인

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 추적 종목 전부가 오늘 한 벌씩 다 찼는지 | 회차당 12 — 106 후보면 약 9회차(90분) | 2026-11-26 장 마감 뒤 `explanation_snapshot` 오늘 · `@5` 종목 수 |
| 날마다 한 벌로 늘어난 하루 시도 수 | 추적 종목 × 2모드 ≈ 104 가 매일 다시 만들어진다 — 상한 600(해설 510)으로 올렸다. 넘으면 이전 해설 · 사실표 문장(빈 칸 0) | 머지 뒤 1주 `ops/salt.sh usage` |
| 지난 날 판정의 적중 표시 | 범위 밖 — 장기 판정 기간 30일이 안 지난 날이 대부분. 등락 숫자만 사실로 | 필요해지면 별도 REQ |
