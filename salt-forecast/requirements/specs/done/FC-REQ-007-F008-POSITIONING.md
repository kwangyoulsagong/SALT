---
id: FC-REQ-007
feature: F008
area: forecast
kind: DATA
title: "F008 슬라이스 23 — 쏠림 신호: 선물 펀딩비 쏠림 · 김치 프리미엄 0 교차 · 신호 뒤 반응 통계"
priority: high
created: 2026-09-27
source: pm/requirements/specs/in-progress/FEATURE-008-forecast-intelligence.md
---

## Summary

슬라이스 16b(`FC-REQ-004`)가 쌓기만 한 바이낸스 펀딩비 · 미결제약정 · USDT 현물을 **지금 상태**와 **사건**으로 바꾼다.
지금 상태는 관측값(1년 백분위 · 비율)이고, 사건 뒤 반응은 주요 사건(`FC-REQ-005`)과 **같은 함수 · 같은 게이트**로 쌓는다.
"과열"은 판정하지 않는다 — 상태 코드는 백분위 구간이다(FEATURE-008 FR-31 과 같은 선).

원/달러는 FRED `DEXKOUS` 가 주 1회 공표라 최대 9일 늦어(2026-09-27 실측: 관측 09-18 · 공개 09-22) 0 교차를 못 잡는다.
그 9일 사이 환율이 3.5% 움직였다 — 김프 크기와 같은 규모의 잡음이다. 그래서 **ECB 기준 환율**(키 없음, 영업일마다)을 더한다.

## FR

| FR | 내용 | FEATURE-008 |
|---|---|---|
| FR-1 | ECB 원/달러 수집(Frankfurter 공개 API) — `series_point(ecb, USDKRW)`. `available_at` = 관측일 **다음 날 00:00 UTC**(16:00 CET 공표의 보수 추정). 그래도 그날 업비트 일봉(마감 00:00 UTC)에 쓴다 | FR-53 |
| FR-2 | 펀딩비 일평균 = 봉 마감 전 24시간 정산 평균(12자리 반올림). 1년 백분위 = 앞 365일 중 **중간 순위**(낮은 날 + 같은 날의 절반). 표본 < 180 이면 없음. 상태 ≥ 0.9 `long_crowded` · ≤ 0.1 `short_crowded` · 그 외 `neutral` | FR-32 |
| FR-3 | 김치 프리미엄 = 업비트 원화 종가 ÷ (바이낸스 USDT 종가 × 원/달러) − 1. 환율 관측이 5일보다 오래됐으면 계산하지 않는다. 확정 부호 = **3일 연속** | FR-53 |
| FR-4 | 사건: 쏠림 진입(앞 14일 안에 같은 상태가 있었으면 같은 국면) · 0 교차(확정된 날이 사건 시각 — 첫날로 거슬러 올리지 않는다) | FR-32 · 53 |
| FR-5 | 반응 통계 — `domain/events.reaction` · `stats` 재사용(1 · 5 · 20일, 표본 10 · 빗나간 때). `event_reaction_stats` 에 kind 4개로. 사건 × 반응은 `signal_event` | FR-30 |
| FR-6 | 미결제약정 — 최신 스냅샷 · 7일 전(±2시간) 대비 변화. 이력이 30일뿐이라 백분위는 내지 않는다 | FR-32 |
| FR-7 | 지금 상태 `market_signal(symbol, as_of)` — 마지막 봉이 2일보다 오래된 종목은 쓰지 않는다 | — |
| FR-8 | 멱등(as_of = UTC 자정) · `ops/daily.sh` 의 `events` 다음 단계 | FR-26 |

## 데이터 계약 (`DB-REQ-029` FR-16 · FR-17)

- `forecast.market_signal` · `forecast.signal_event` — `20260927130000_forecast_market_signal`
- `forecast.v_market_signal`(종목별 최신 한 행) · `forecast.v_signal_reaction`(종목 × 종류 × 기간 최신 통계)
- 반응 통계는 기존 `event_reaction_stats` 에 쌓는다. `v_event_card` 는 `scheduled_event` 와 조인하므로 섞이지 않는다

## 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 신호를 전망 피처로 | 채택은 채점이 정한다(FR-54) | 도전자 실험 재개 시(26주 라이브 재평가) |
| 미결제약정 백분위 · 급변 사건 | 이력 30일(2026-09-02~) — 1년 비교가 안 된다 | 이력 365일(2027-09) |
| 김프 교차 알림 | 알림은 측정 · 미러까지(FEATURE-009 결정 — 통제 없음). 화면 카드만 | 알림 요구가 생기면 PM |
| ETF 유입 · 스테이블코인 발행량 신호 | 이 슬라이스는 이미 쌓인 둘만 | P2 다음 슬라이스 |
| 다중 비교 | 224종목 × 4 × 3 = 2,688 조합. 게이트는 조합별이라 우연히 통과하는 조합이 있다 — 분포는 "과거에 이랬다"이지 엣지 주장이 아니다(화면 면책) | CPCV · DSR 슬라이스(P2) |
