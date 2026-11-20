# SRV-REQ-061 체크리스트 — 시세 등락 기준(전일 대비)

| FR | 위치 | 결과 |
|---|---|---|
| FR-1 프롬프트 줄 | `coach/infrastructure/explanationPrompt.ts` · `explanationTemplate.ts` `PROMPT_PHRASES` | [x] |
| FR-2 AI 입력 공개 | `coach/domain/policy/llmInputs.ts` | [x] |
| FR-3 문장 검사 | `explanationTemplate.ts` `PAST_DAY_CHANGE` · `languageGuard.ts` `wrong_change_window` · 시험 `explanationGate.test.ts` 경계 11 | [x] |
| FR-4 주석 · Swagger | `UpbitClient.toQuote` 창 표 · `MarketSummary` · `MarketOverview` · `GetMarketSummary` · `GetKrMarketSummary` · `SearchAssets` · `api/index.ts` · `investment.routes.ts` · `env.ts` | [x] |

| 검증 | 결과 |
|---|---|
| `npm test` | 2,036 통과 |
| `tsc --noEmit` · `npm run lint` | 통과 |
| 저장 해설 실측 | 뉴스 아닌 칸 "24시간" 문장 50 → 새 규칙 걸림 0(전부 "판단 뒤 24시간") |

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 새 프롬프트로 만든 실해설 | 서버는 머지 뒤 재기동(`ops/salt.sh restart server`) — 지금 떠 있는 서버는 main 코드 | 머지 뒤 다음 해설 회차(문장 검사가 어긋난 창을 버리는지는 시험이 본다) |
