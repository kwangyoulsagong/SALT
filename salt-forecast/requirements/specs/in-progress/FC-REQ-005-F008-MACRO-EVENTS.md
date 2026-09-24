---
id: FC-REQ-005
feature: F008
area: forecast
kind: DATA
title: "F008 슬라이스 22 — 주요 사건(코인): 거시 일정 캘린더 · 선반영도 · 사건 뒤 반응 통계"
priority: high
created: 2026-09-24
source: pm/requirements/specs/in-progress/FEATURE-008-forecast-intelligence.md
---

## Summary

원래 슬라이스 22 는 DART · EDGAR 공시(주식) 규칙 분류였다. 사용자 결정으로 범위가 **코인(BTC) 중심 · 주식 TBA ·
업비트 공지 안 씀**이 되면서, 코인에 반복적으로 오고 **무료로 시점 고정**이 되는 사건은 **미국 거시 일정** 셋이다.
이 슬라이스는 그 셋의 일정 · 발표 전 선반영도 · 발표 뒤 BTC 반응 분포를 워크포워드로 쌓는다.

"호재 · 악재"는 우리가 판정하지 않는다(FEATURE-008 FR-31). 거시 발표는 **예상 대비 서프라이즈**가 있어야
방향 해석이 되는데, 컨센서스는 무료 소스가 없다 — 그래서 **움직임의 크기와 분포**만 사실로 보인다.

## FR

| FR | 내용 | FEATURE-008 |
|---|---|---|
| FR-1 | 일정 수집 — CPI(FRED release 10) · 고용보고서(release 50) 발표일(**미래 예정일 포함**) · FOMC 결정일(연준 공식 일정 페이지, 2일 회의의 둘째 날 · 비정례 제외) | FR-29 |
| FR-2 | 발표 시각 — CPI · 고용 08:30 ET, FOMC 14:00 ET(서머타임 반영). `announced_at` = 발표 7일 전(보수 추정 — 두 일정 모두 1년 전에 공개되지만 공개 시각 원문이 없다) | FR-29 · `time-and-leakage.md` §1 |
| FR-3 | 반응 — 기준 = 발표 **전에 닫힌** 마지막 일봉 종가. 1 · 5 · 20일 수익률(발표가 든 봉부터), 선반영도 = 발표 전 5일 수익률 · 직전 3일 / 그 앞 20일 거래량 비 | FR-28 · FR-30 |
| FR-4 | 반응 통계(워크포워드) — `as_of` 에 **창이 닫힌** 사건만. 분위수(5 · 25 · 50 · 75 · 95) · 오른 비율 · 표본 · 같은 기간 **평소 날**의 같은 기간 수익률 분포(기준) · 움직임 크기 비(사건 |r| 중앙값 / 평소 |r| 중앙값) | FR-30 |
| FR-5 | 빗나간 때 — 각 과거 사건을 **그 사건 전까지의** 통계 90% 범위로 채점해 밖이면 기록. 최근 3건 | FR-30 · 공통 수용 기준 1 |
| FR-6 | 게이트 — 표본 < 10 이면 `insufficient_sample`, 빗나간 때 0건이면 `failure_cases_missing`. 막히면 분포를 싣지 않는다 | FR-30 |
| FR-7 | 멱등 — 같은 일정 · 같은 as_of 두 번 = 1행. 연준 페이지 구조가 바뀌어 0건이면 **실패로 기록**(조용히 비우지 않는다) | FR-26 |
| FR-8 | 매일 배치(`ops/daily.sh`)에 붙는다 | — |

## 데이터 계약 (`DB-REQ-029` FR-14 · FR-15)

- `forecast.scheduled_event(kind, event_at, announced_at, source, source_ref)`
- `forecast.event_reaction(kind, event_at, symbol, …)` · `forecast.event_reaction_stats(kind, symbol, horizon_days, as_of, …)`
- `forecast.v_event_card` — 앞으로 35일 안의 일정 × 종목별 최신 통계

## 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| DART · EDGAR 공시 분류 | 주식 TBA(사용자 결정 2026-09-23) | 주식 재개 시 |
| 서프라이즈(예상 대비) | 무료 컨센서스 소스 없음 | 소스 확보 시 |
| 토큰 언락 · 거래소 공지 | 업비트 공지 안 씀(사용자 결정), 언락은 수동 입력만 | 수동 입력 화면 |
| 사건을 전망 피처로 | 채택은 채점이 정한다(FR-54) | 도전자 실험 재개 시 |
| BTC 외 종목 | 화면 초점이 BTC. 계산은 종목 목록 설정으로 늘릴 수 있다 | 필요 시 |
