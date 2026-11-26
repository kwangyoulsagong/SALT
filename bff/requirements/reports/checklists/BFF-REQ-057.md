# BFF-REQ-057 체크리스트 — 지난 날 해설

| FR | 결과 | 근거 |
|---|---|---|
| FR-1 경로 · 입력 검사 | 충족 | `ai-coach.routes.ts` · `app-ai-coach.service.ts` `getExplanationHistory`(symbol · mode · days 1~14) |
| FR-2 뷰모델 | 충족 | `explanation-history.test.ts` — 원문 · 판정 · 등락률 그대로 · `track` 뺌 · `null` 유지 |
| FR-3 계약 오류 502 · 빈 목록 정상 | 충족 | 같은 시험 — 깨진 모양 6가지(날짜 · 판정 · 공급자 · 빈 문장 · 문자열 등락률 · days 배열 아님) |
| FR-4 예산 · 재시도 · 끊기 | 충족(코드) | `EXPLANATION_HISTORY_TIMEOUT_MS` 400 · `retryOnceOnGet` · 컨트롤러 `res.on("close")` |
| FR-5 은퇴 410 과 안 겹침 | 충족(코드) | `app.ts` — `/api/app/ai-coach` 라우터(77줄)가 `RETIRED_PATHS` 미들웨어(89줄)보다 먼저 |
| 명령 | 통과 | `npm run build` · `npm test` 637 통과 · 실패 0 |
| 실경로(BFF → 서버, 2026-11-26) | 충족 | 서버 `SRV-REQ-063` · `bff-rest` 재기동 뒤 임시 사용자 토큰으로 curl `?symbol=005930&mode=long_term` · `scalp` — 200 · 날 셋(11-19 · 11-17 · 11-16, 최신 먼저). 계약 칸 그대로(`tradeDay` YYYY-MM-DD · `generatedAt` · `action` wait · `provider` · `dayChangeRate` · `changeSinceRate` 숫자) · `track` · `miss` 0. 첫 날 장기: 11-19 · 11:35 · 관망 · 그날 종가 +1.13% · 그 뒤 −13.00% · 문장 4. 등락률은 일봉(KST 날짜 = UTC 15:00 봉)과 시세 171,300원으로 손계산한 값과 셋 다 같음 |

## 미검증 · 범위 밖

없음 — 실경로를 위 행에서 닫았다(BFF 예산 400ms 의 p95 는 실측 표본이 없어 재지 않았다 — 요청 로그 `duration` 이 쌓이면 다음 `performance-bff.md` §8 점검 때)
