---
id: BFF-REQ-039
feature: F010
area: bff
kind: API
title: "F010 슬라이스 3 — 슬라이스 2 값의 화면 계약(베타 합 · 국면 · 손실 비대칭 · 가격선 근거) · 판정 성적표 중계"
priority: high
created: 2026-09-29
source: requirements/reports/research/2026-09-27-ai-judgment-upgrade.md §9-4 · §10 슬라이스 3
---

## Summary

슬라이스 2 서버가 응답에 필드를 더했지만 BFF 뷰모델이 필드를 골라 옮겨 화면에 닿지 않았다. 그 값을 **막기만 하는 방향으로**
옮기고, 서버에 있던 판정 성적표(`/coach/scoreboard`)를 `/api/app/coach/scoreboard` 로 중계한다. 계산 · 판정 · 문구 없음.

## 결정

1. **서버가 "좋다"를 말하지 않았으면 여기서도 말하지 않는다.** 베타 합이 없는데 `ok` → `insufficient_data`, 예산 없는 게이지의
   `exceeded` 는 옮기지 않는다. 성적표 `lowSample` 이 빠지면 부족으로 둔다
2. **서버의 "없으면 true" 기본값을 화면 사실로 옮기지 않는다.** 200일선이 없을 때 `trendOpen: true`(게이트 없음)는 `null`
3. `basis` 는 아는 값(`volatility` · `fixed`)만 남기고 모르면 필드를 지운다 — 화면이 "변동성 기준"을 잘못 말하지 않게
4. 성적표 수익률 분포는 옮기지 않는다(화면 소비처 없음). 맞았던 때 · 틀렸던 때는 같은 모양으로 둘 다

## FR

| FR | 내용 | 상태 |
|---|---|---|
| FR-1 | `GET /api/app/coach/risk-budget` `gauges.btcBeta { status, betaSum, btcEquivalentKrw, coveredWeight, missingSymbols }` — 합이 없으면 `insufficient_data`, `exceeded` 금지. 서버가 안 주면 `insufficient_data` | 완료 |
| FR-2 | 같은 응답 `market`(`toMarketRegime`) — `asOf` 없으면 `null`, `trendOpen` 은 200일선이 있을 때만, `gateAdopted = gate.key !== null`, `nextEvent` 는 `fomc` · `cpi` 만 | 완료 |
| FR-3 | `GET /api/app/coach/mirror` `lossAsymmetry { ratio, maxLossKrw, maxGainKrw, window }` — 부호가 뒤집힌 금액은 `null`, 한쪽이 없으면 비율 `null` + `insufficient_data`, 창이 없으면 블록 `null` | 완료 |
| FR-4 | 가격선 근거 `basis` — 종목 판단 `zone(held_rule)` · 리포트 `exitPlans[]` · `/profit-plan` 카드. 아는 값만 | 완료 |
| FR-5 | `GET /api/app/coach/scoreboard` — 서버 `/coach/scoreboard` 중계(1,500ms · 재시도 1회). 깨진 그룹 · 칸이 틀린 사례 제외, 남은 그룹이 없으면 `insufficient_data`, 고지 · 그룹 배열 없으면 계약 깨짐 → 200 `unavailable`. 4xx · 취소 그대로 | 완료 |

## Changelog

- 2026-09-29: 초판 · FR-1~5 완료(`78652d5` · `afd29af`)
