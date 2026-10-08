---
id: FC-REQ-009
feature: F011
area: forecast
kind: FUNC
title: "F011 슬라이스 5 — 국내 주식 변동 범위: 일봉 옮기기 · 거래일 격자 · 자산군 분리 보정 · 채점 풀 · 게이트"
priority: high
created: 2026-10-08
source: pm/requirements/specs/in-progress/FEATURE-011-kr-stock-kis.md §F FR-80~83
---

## Summary

코인 전망(`FC-REQ-001`)과 **같은 엔진 · 같은 채점 · 같은 게이트**로 국내 주식 변동 범위를 만든다. 다른 것은 시간뿐이다 —
주식은 거래일만 있고, 종가는 장 마감 뒤에야 안다. 그래서 엔진의 시간 규칙을 자산군 달력(`Schedule`)으로 빼고
국내 주식 달력(`KrxSessions`)을 하나 더 둔다. 보정 · 채점 풀은 국내 주식만으로 채운다(코인과 섞지 않는다).
화면 경로는 이 REQ 에 없다 — 서버 `cards()` 는 아직 `KRW-` 심볼만 읽는다(FEATURE-011 FR-83 은 다음 슬라이스).

## FR

| FR | 내용 | FEATURE-011 | 상태 |
|---|---|---|---|
| FR-1 | 엔진 일반화 — `domain/calendar.Schedule`(격자 · 라벨 끝 · 실현 수익률 · 신선도 · 주당 봉 수 · 간격 상한). 코인 `WeeklyUtc` 가 기본값, 출력 불변 | — | 완료(`006d32f`) |
| FR-2 | 일봉 옮기기 `jobs/ingest_kr_stock` — 서버 `public.price_history(kr_stock, 1d)` → `forecast.price_bar` source=`kis`. Python 은 KIS 를 부르지 않는다. `available_at` = 거래일 16:00 KST(15:30 마감 + 30분), 그 전에 본 봉은 버린다. 매번 전부 다시 읽는다(약 2.5만 행 · 0.7초) | FR-80 | 완료(`1355883`) |
| FR-3 | 거래일 달력 `KrxSessions` = 서버 개장일(`market_holidays.is_open`) ∪ 일봉 날짜. as_of = 거래일 09:00 KST(그날 종가 모름) · 격자 = **주 첫 거래일**(월요일 휴장이면 화요일) · 기간 h주 = **5h 거래일** · 기준 종가 = as_of 에 아는 마지막 거래일 | FR-81 | 완료 |
| FR-4 | 기준 모델 주당 봉 수 5 · 간격 상한 없음(주말 · 휴장을 건넌 이웃 봉 = 이웃 거래일) | FR-81 | 완료 |
| FR-5 | 모델 버전 `kr-rw-normal@0.1.0`(기준) · `kr-ens-baseline@0.1.0`(챔피언) — 보정 · 채점 풀 · 게이트 · 리포트가 버전으로 갈린다. LightGBM 없음(풀링 종목 약 50 < 200) | FR-82 | 완료 |
| FR-6 | `jobs/kr_backtest`(워크포워드 · 리포트 `reports/kr-backtest-<날짜>.md`) · `jobs/kr_daily`(live 예측 · 채점 · 게이트). 게이트 표본은 주 첫 거래일 as_of 만(`gates(on_grid=)`) · 신선도 2 영업일(slack 1) | FR-82 | 완료 |
| FR-7 | `ops/daily.sh` 단계 · `ops_health` 기대 작업에 `ingest_kr_stock` · `kr_daily` | — | 완료 |
| FR-8 | 누수 테스트 — 미래 오염 · 당일 종가(16:00 전) · 달력 확장(as_of 뒤 거래일) · 재현 · 엠바고(라벨 끝 ≤ as_of) · 16:00 전 봉 버림 | — | 완료 |

## 하지 않는 것

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 화면(FEATURE-011 FR-83) — 서버 `cards()` · BFF · FE 의 국내 주식 심볼 | 이 REQ 는 Python · DB 다. 서버는 `KRW-${symbol}` 로만 읽어 국내 주식 행이 화면에 새지 않는다 | 다음 슬라이스(5b, 서버 · BFF · FE) |
| 국내 주식 실현 변동성(σ, `FC-REQ-006`) · 사이즈 목표 변동성 | `realized_vol` 은 코인 달력(365일 연율) — 거래일 연율 252 로 따로 | 5b 또는 별 REQ |
| 투자자별 수급 · 업종 지수 피처 | F008 FR-54 — 채점이 정한다. 기준이 먼저 | 기준 대비 라이브 26주 뒤 |
| 상장폐지 종목 이력 | 서버 유니버스가 현재 종목만 백필한다 — 생존 편향(리포트에 적음) | 별 작업 |

## Changelog

- 2026-10-08: 초판 · FR-1~8 완료. 기획 정정: 개장일 표의 `synced_at` 으로 시점을 자르지 않는다(서버가 재동기화마다 덮어써 과거 as_of 달력이 빈다 — 실측)
