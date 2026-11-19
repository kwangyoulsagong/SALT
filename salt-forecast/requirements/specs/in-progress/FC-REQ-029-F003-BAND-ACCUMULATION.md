---
id: FC-REQ-029
feature: F003
area: forecast
kind: FUNC
title: "밸류에이션 밴드 적립 — BTC MVRV Z · 코스피 PER 백분위 · 52주 검산 관문 · 실패 사례 · 김프(F003 v2 순서 1)"
priority: medium
created: 2026-11-19
source: requirements/specs/in-progress/F003-v2-band-accumulation-global-plan.md
---

## Summary

"이번 주 얼마"의 배수를 예측이 낸다 — 지표 · 밴드 · **그 밴드가 정액 적립보다 나았는지의 검산** · 실패 사례. 금액은 서버(`SRV-REQ-020`~).
사전등록 `band-accumulation@1`(2026-11-19 `0a055faf`, 결과 계산 전) → `@2`(`da2d6cfa` — 코스피 신선도 100 → 130일만, @1 안의 발표 지연 50일과 어긋남).

## FR

| FR | 내용 | 상태 |
|---|---|---|
| FR-1 | 원천 — Coin Metrics `CapMrktCurUSD` · `PriceUSD` 추가 · ECOS 코스피 PER · 배당(월) · 지수(일) 수집, 통째 교체 · `ingest_market --only ecos` | done 2026-11-19 |
| FR-2 | 지표 — BTC MVRV Z(확장 창 sd) · 코스피 PER 월 사이 추정 + 백분위(그때 알던 월값만) · 신선도 · 김치 프리미엄(세 값 3일 안) | done 2026-11-19 |
| FR-3 | 검산 — 매주 월요일 결정 · 52주 라벨 · 닫힌 주만(확장 창) · E = 배수 가중 − 정액 · 52주 블록 부트스트랩 90% · 연도별 · 원당 수량(리포트만) | done 2026-11-19 |
| FR-4 | 관문 — 닫힌 주 ≥ 260 · 90% 하한 > 0, 못 지나면 화면 배수 1.0 · 사유 셋 | done 2026-11-19 |
| FR-5 | 실패 사례 — 싸다 · 비싸다 · 중립 이상 틀림, 26주 묶음, 상위 3 + 전체 수 | done 2026-11-19 |
| FR-6 | 저장 · 계약 — `forecast.accumulation_band`(자산 × 결정일 × 키) · 뷰 `v_accumulation_band`(DDL 은 서버 Prisma `20261119200000`) · 매일 `daily.sh` 끝 | done 2026-11-19 |
| FR-7 | 리포트 — `reports/band-accumulation-<key>-<날짜>.md` 커밋 | done 2026-11-19 |

## 첫 결과(2026-11-19, @2)

| 자산 | 닫힌 주 | E | 90% 구간 | 관문 | 이번 주 밴드 | 화면 배수 |
|---|---|---|---|---|---|---|
| BTC | 748 | +11.5%p | −20.3 ~ +41.8%p | `not_better_than_flat` | low(Z 0.33) | 1.0 |
| 코스피 | 874 | −0.5%p | −3.2 ~ +2.5%p | `not_better_than_flat` | neutral(PER 추정 14.5 · 51%) | 1.0 |

둘 다 정액을 확실히 이기지 못했다 — 화면은 정액 적립 금액을 보이고 밴드 · 성적 · 실패 사례를 같이 보인다(숨기지 않는다).

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-11-19 | 신규 · FR-1~7 done(`feat/f003-v2-s1-band-forecast`). 사전등록 @1 → @2(신선도 결함). 코스피 PER 이익 고정 추정의 약점(8월 18.6 → 9월 11.4 분기 갱신 점프)을 화면 "추정" 표시로 |
| 2026-11-19 | F003 v2 순서 2 짝(`feat/f003-v2-s2-plan-server`) — FR-6: 행에 `bands`(사전등록 밴드 표, 끝 줄 below null) · 서버가 읽는 주별 뷰 `v_accumulation_band_week`(DDL 서버 Prisma `20261119300000`). 판정 · 검산 무변경 |
