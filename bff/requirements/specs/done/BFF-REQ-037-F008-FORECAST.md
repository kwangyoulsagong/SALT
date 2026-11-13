---
id: BFF-REQ-037
feature: F008
area: bff
kind: API
title: "F008 슬라이스 18 — 가격 변동 범위 중계 (소유자 전용)"
priority: high
created: 2026-09-24
source: pm/requirements/specs/in-progress/FEATURE-008-forecast-intelligence.md
---

> **정정 2026-11-11 — 해설 스트림 은퇴**(F017 v2 단계 3, `feat/f017-s3-explain-always`). 해설은 배치가 미리 만든 것을 읽는다 — `GET /api/app/ai-coach/explanation`(4단, `BFF-REQ-052` FR-2 · `SRV-REQ-053` FR-3 · `FE-REQ-064` FR-2). 아래 `POST …/explain` · `…/explain/stream` 과 그 중계 · 화면은 지웠다(소비처가 같은 PR 에서 옮겨 감 — 제거 = 404). 기록으로 둔다.

| FR | 내용 | 상태 |
|---|---|---|
| FR-1 | `GET /api/app/coach/forecast?symbol=` — 인증, 심볼 형식 400 | 완료 |
| FR-2 | 서버 4xx(특히 **404 = 소유자 아님**) 그대로 — `unavailable` 로 바꾸지 않는다(ADR-003) | 완료 |
| FR-3 | 5xx · 타임아웃 → 200 `unavailable`, 800ms · 재시도 1회 | 완료 |
| FR-4 | 뷰모델 — 전망 3종이 빠진 기간은 `contract_incomplete` 로 막는다(열 수는 없다), 기간 4개 항상, 방향은 서버가 줄 때만 | 완료 |
| FR-5 | 해설 응답의 `source` · `droppedSentences` 는 기존 `/ai-coach/explain` 이 그대로 통과시킨다(뷰모델 없음) | 확인 |
| FR-8 | `GET /api/app/coach/events?symbol=` — 404 그대로, 5xx → `unavailable`, 기간 3개 항상, 모양이 깨진 기간은 `contract_incomplete`(열 수 없다), 모르는 종류는 버림 | 완료(2026-09-24) |
| FR-9 | `GET /api/app/coach/positioning?symbol=` — 404 그대로, 5xx → `unavailable`. 상태 칸은 모양이 하나라도 깨지면(모르는 상태 코드 · 백분위 0~1 밖) 칸째 `null` 이고 그 신호의 반응도 뺀다. 반응 기간은 FR-8 `toHorizon` 그대로(`contract_incomplete` · 3개 항상), 모르는 종류는 버림 | 완료(2026-09-27) |
| FR-7 | `history[]`(과거 일봉 종가) 통과 — 모양이 깨진 점은 버린다, 없으면 빈 배열 | 완료 |
| FR-6 | 스트리밍 해설(SSE) `POST /api/app/ai-coach/explain/stream` — 이벤트 단위 중계(계약 이름만 통과), 스트림 전 4xx 는 JSON 그대로, 동시 상한은 단건과 같은 문, 대화당 60초 | 완료(2026-09-24) |

## Changelog

- 2026-11-12: `GET /api/coach/forecast`(주간 변동 범위) 서버 · BFF 경로 삭제 — 화면 소비처 0(F017 v2 단계 5 가 시나리오 카드로 교체) · 코치 도구 · 해설 읽기 0 확인. 서버 `GetSymbolForecast` · `toForecastHorizon` · 리더 `cards` · `recentCloses`, BFF `getForecast` · `forecast.viewmodel` · 라우트. 예측 쪽 생성은 그대로. 서버 test 1238 → 1223 · BFF 456 → 447(지운 기능의 테스트만)
- 2026-10-23: F011 5e — **변경 없음.** `forecast.viewmodel` 이 막힘 사유를 문자열 그대로 옮긴다(새 국내 상태 사유 4개도). 실 BFF 4101 경유 000650 `investment_warning` 확인 · build · 251/251

| 날짜 | 변경 |
|---|---|
| 2026-09-27 | **F008 슬라이스 23 — FR-9 쏠림 신호 중계.** 서버 `SRV-REQ-037` FR-11 짝. `toHorizon` · `HORIZONS` 를 `events.viewmodel` 에서 내보내 같이 쓴다. 근거 `reports/checklists/BFF-REQ-037.md` §슬라이스 23 |
| 2026-10-23 | F011 슬라이스 5d — **변경 없음.** 국내 상세가 `/api/app/coach/forecast?symbol=<6자리>` 를 부른다. 심볼은 그대로 서버로 넘기고 4xx(404 = 소유자 아님)는 그대로 · 5xx 는 `unavailable` — 코인과 같은 뷰모델. 소비처 `FE-REQ-041` FR-23 |
| 2026-10-23 | F011 슬라이스 5d 후속 — **변경 없음.** 서버 범위 `blockedReason` 에 `not_sharper_than_baseline` · `skill_not_significant` 가 새로 올 수 있다(국내). 뷰모델은 `String(raw.blockedReason)` 을 그대로 옮긴다 — 251/251 |
| 2026-10-29 | **변경 없음.** 프론트 `entities/coach/api/endpoints.ts` 의 다른 줄(리스크 예산 경로 주석 "게이지 3" → "게이지 · 측정")만 바뀌었다 — 이 REQ 를 가리키는 경로 상수 · 주석 무변경(F009 슬라이스 9) |
| 2026-11-02 | **변경 없음.** 해설 스트림 `message.card.citations[]` 에 서버가 `url` · `publishedAt` 을 더했다(`SRV-REQ-037` FR-12). BFF 는 이벤트 이름만 걸러 데이터는 그대로 옮긴다 — 코드 무변경. F008 해설 근거 슬라이스. 루트 `requirements/specs/done/F008-explain-citations-slice.md` |
| 2026-11-02 | 해설 스트림 중계 — `provider`(`replace` · `done` · `polish:active` 단계)가 데이터 그대로 지난다(테스트 고정). `@repo/core` `ExplainStreamEvent` 에 `ExplainProvider` · 계약 주석(흐르는 글자가 검사한 LLM 문장일 수 있다). 근거 `BFF-REQ-050` · `SRV-REQ-050` FR-13. 루트 `requirements/specs/done/F008-explain-llm-routing-slice.md` |
| 2026-11-02 | F008 슬라이스 24 국내 증시 일정(`feat/f008-slice24-kr-market-events`): 주요 사건 뷰모델에 국내 종류 4 · `scope` · `region`(옛 응답은 `market` · `us`)(`BFF-REQ-043` FR-1 · 2) |
| 2026-11-11 | FR-6 해설 스트림 중계 **은퇴** — 해설은 저장값 읽기(`BFF-REQ-052` FR-2) — F017 v2 단계 3(`feat/f017-s3-explain-always`) |
| 2026-11-11 | F017 v2 단계 5 — 같은 서비스 파일에 `getScenario`(전망과 같은 규칙: 4xx 그대로 · 5xx 200 unavailable). 변동 범위 경로 `/api/app/coach/forecast` 는 그대로 둔다(화면 소비처는 지움 — `FE-REQ-064` FR-4) |
| 2026-11-13 | F017 v4 순서 1a 짝(`feat/f017-v4-s1-scenario-always` — 이 REQ 가 머리 주인인 파일): 같은 서비스 파일 `getScenario` 주석 — 404(소유자 아님)는 시나리오에서 오지 않는다(주요 사건 · 쏠림은 그대로 소유자 전용). 주인 REQ `SRV-REQ-053` FR-10 · `BFF-REQ-052` FR-4 · `FE-REQ-064` FR-8 |
