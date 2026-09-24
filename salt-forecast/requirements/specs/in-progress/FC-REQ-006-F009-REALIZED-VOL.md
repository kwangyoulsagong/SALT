---
id: FC-REQ-006
feature: F009
area: forecast
kind: DATA
title: "F009 슬라이스 2 — 종목 실현 변동성(EWMA · GARCH(1,1)) 일 1회 → forecast.realized_vol"
priority: high
created: 2026-09-24
source: pm/requirements/specs/in-progress/FEATURE-009-behavior-risk-coach.md
---

## Summary

사이즈 계산의 **변동성 타깃 참고 비중** = 목표 변동성 ÷ 종목 실현 변동성(FEATURE-009 FR-5)의 분모를 만든다.
슬라이스 1 은 계약만 열어 두고 늘 `insufficient_data` 였다. 이 REQ 가 원천을 채우고 서버 메서드 하나를 바꾼다.

변동성은 리서치에서 **예측이 되는 몇 안 되는 것**이다(`2026-09-24-fund-manager-coach.md` §4 · 변동성 군집 [강]).
그래도 "채점되지 않은 숫자는 화면에 가지 않는다" — 내일 분산 예측을 표본 밖에서 채점하고 기준에 지면 막는다.

## 결정

- **내보내는 값은 EWMA(λ 0.94) 하나.** 채점 창 성적을 보고 EWMA · GARCH 중 고르면 그 창이 검증이 아니게 된다
  (`time-and-leakage.md` §4). GARCH 는 **도전자** — 같은 창에서 채점해 저장만 한다. 승격은 리포트를 근거로 이 REQ 에서 정한다
- **GARCH 는 분산 목표 + 격자 최대우도**(scipy 없음). 새 의존성 0, 같은 입력이면 같은 답(재현 누수 테스트)
- **평균 0 · 연율 365일.** 코인은 주말에도 거래되고, 일 평균 수익률 추정은 잡음만 더한다
- **대상은 일봉이 있는 종목 전부**(지금 289). 사용자는 아무 종목이나 거래 폼에 적는다
- **막힌 행도 쓴다.** 서버가 "왜 없는지"를 알 수 있게. `annualized` null ⇔ `blocked_reason` 있음 (CHECK)

## FR

| FR | 내용 | 상태 |
|---|---|---|
| FR-1 | 입력 = 업비트 일봉 종가 중 `available_at <= as_of`. `as_of` 는 UTC 자정으로 내린다(하루 안 어느 시각에 돌려도 같은 값) | 완료 |
| FR-2 | EWMA — 첫 30일 제곱 평균으로 시작, `σ²ₜ₊₁ = λσ²ₜ + (1−λ)rₜ²`, λ 0.94. 연율 = √(σ² × 365) | 완료 |
| FR-3 | GARCH(1,1) 도전자 — 채점 창 **앞** 수익률(≥ 500일)로 α · β 적합(분산 목표), 오늘 값은 전체로 다시 적합. 모수 · 값 저장 | 완료 |
| FR-4 | 채점 — 마지막 180일 다음 날 분산 예측의 QLIKE(`log f + r²/f`). EWMA · GARCH · 기준(60일 이동 분산) 셋 | 완료 |
| FR-5 | 게이트 — 수익률 < 240일 `insufficient_history` · 마지막 봉이 3일 넘게 전 `stale_prices` · EWMA QLIKE > 기준 `no_skill_vs_baseline`. 막히면 `annualized` null | 완료 |
| FR-6 | 멱등 — `(symbol, as_of)` upsert. 같은 날 두 번 = 289행 그대로 | 완료 |
| FR-7 | 매일 배치 `ops/daily.sh` 마지막 단계 `volatility` | 완료 |
| FR-8 | 서버 읽기 — `forecast.v_realized_vol`(종목별 최신 1행). 서버는 `annualized` null 이거나 `as_of` 가 3일 넘으면 `null`(`SRV-REQ-038` FR-11) | 완료 |
| FR-9 | GARCH 승격 판정 — 도전자가 EWMA 를 이긴 종목 비율 · 차이를 26주 라이브로 본 뒤 결정 | to-do |

## 데이터 계약 (`DB-REQ-031` FR-8)

- `forecast.realized_vol(symbol, as_of, last_bar_at, sample, ewma, garch, garch_alpha, garch_beta, qlike_ewma, qlike_garch, qlike_baseline, method, annualized, blocked_reason, computed_at)`
- `forecast.v_realized_vol` — 종목별 최신 1행. 서버가 읽는 계약
- 마이그레이션 `salt-server/prisma/migrations/20260924170000_forecast_realized_vol` (추가만, 롤백 = `DROP VIEW` · `DROP TABLE`)

## 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| GARCH · HAR-RV 승격 | 채점 창으로 고르면 검증이 아니다. 라이브 표본이 먼저 | FR-9 (26주 라이브 뒤) |
| h 일 누적 변동성(GARCH 기간 구조) | 사이즈 계산은 연율 하나만 쓴다 | 보유 기간별 사이즈가 필요할 때 |
| 장중 봉 · 점프(청산 캐스케이드) | 일봉만. GARCH 도 점프를 못 잡는다(리서치 표) | P2 국면 카드 |
| 전망 구간 폭 기저로 쓰기 | F008 도전자 실험의 몫(리서치 D1) | F008 도전자 재개 시 |
