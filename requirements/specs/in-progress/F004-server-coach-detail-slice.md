---
id: SLICE-F004-SERVER-COACH-DETAIL
title: "F004 슬라이스 12 — 서버 코치 상세 조립 · 익절 거리 · 행동 기록 코드"
priority: high
labels: [F004, slice, server, contract, render-gate]
created: 2026-09-23
---

## Summary

코치 리포트의 서버 쪽을 여는 슬라이스다. `GET /api/coach/detail` 이 **저장된 마지막 추천**을
화면 계약(`SRV-REQ-025` `CoachDetailResult`)으로 조립한다. 추천 · 성적 · 위험 · 후보 · 익절 계획 ·
행동 기록 · 국내 주식 제외 사실 · 면책이 한 응답이다. BFF `/api/app/coach/report`(`BFF-REQ-023`)와
FE 코치 리포트가 이 경로를 기다리고 있었다.

상세가 재사용하는 두 필드를 기존 경로에도 더했다 — `profit-plan` 의 `gapFromCurrent`,
`behavior-coach` 의 `factCode` · `params`. **추가만** 한다(FR-30).

## 범위

| REQ | FR | 내용 |
|---|---|---|
| `SRV-REQ-025` | FR-1~9 · 16~18 | 상세 조립 · 게이트 필드 항상 · 200 · `scoreNote` · `disclaimer` · `excluded[]` · `behaviorFacts` 코드 · `conditionCode` · `gapFromCurrent` · `factCode` · `staleHours` |
| `SRV-REQ-024` | FR-10~15 · 23 · 32 · 33 · 40~43 · 60~62 · 90 · 91 | 저장 추천 게이트 · 제외 사실 · 표본 1 통과 · 익절 거리 · 행동 기록 · 점수 문구 |

## 판단 — 리뷰가 볼 곳

1. **저장 추천에 종목 판단 성적을 빌려 오지 않는다** — 슬라이스 11 이 미결로 남긴 질문이다. 스펙이
   이미 답하고 있었다(`DB-REQ-019` FR-45: 연결 없는 행은 게이트가 차단하고 그것이 정상).
   스냅샷을 빌리면 `coach.sell` 카드에 `long_term.avoid` 의 실패가 붙는다. 결과로 **추천 블록은
   지금 전부 `failure_cases_missing`** 이다 — 200 이고 나머지 블록은 그대로 간다
2. **게이트를 종목 판단과 합치지 않았다** — 저장 추천은 표본 1 이상 통과(FR-32), 종목 판단은 20 미만
   차단(FR-137)이고 사유 enum 도 다르다. 합치면 분기 플래그가 생기고 그것은 FR-15 가 금지한 우회 인자와
   모양이 같다
3. **같은 숫자는 같은 함수** — 성적 표본(`collectPerformanceSamples`)은 `signal-performance` 와,
   가격선 거리(`priceGap`)는 스마트 바이존과, 익절 계산은 익절 계획 화면과 공유한다
4. **GET 이 쓰기를 하지 않는다** — 행동 코치 화면은 열 때 분석을 돌리지만 상세는 있는 것만 모은다

## 계약과 다른 점

- `signalTrackRecord.winRate` · `avgReturn` · `maxDrawdown` 이 **nullable** — 표본 0 과 매핑 없음을 구분(FR-43 과 같은 규칙). REQ 코드블록 개정
- `candidates[].reasons` 는 늘 `[]` — 저장 payload 에 후보 근거가 없다
- `excluded[].reasonCode` = `no_realtime_data`

## 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 추천 블록이 실제로 열리는 경로 | 실패사례 출처(`IndicatorTrackRecord`)가 없다 | `DB-REQ-013` · `DB-REQ-019` (F003) |
| `generate` 202 · 쿨다운 429 · `generation-status` · `defaultMode` | 마이그레이션 2개 — 스키마 변경을 섞으면 되돌리기 지점이 둘이 된다 | 다음 서버 슬라이스 |
| 저장 추천 적중 규칙 | 기존 정의가 행동과 무관("가격이 오르면 적중")이다. 바꾸는 것은 제품 판단 | PM |
| BFF `/api/app/coach/report` · FE 코치 리포트 | 이 계약 위의 작업 | `BFF-REQ-023` · `FE-REQ-026` M절 |
