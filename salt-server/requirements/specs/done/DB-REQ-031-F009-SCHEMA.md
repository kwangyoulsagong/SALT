---
id: DB-REQ-031
feature: F009
area: db
kind: SCHEMA
title: "F009 코치 — 거래 계획 · 결정 결과 · 프로필 리스크 예산 (+ 슬라이스 2 실현 변동성)"
priority: high
labels: [db, coach, schema, prisma-migration]
created: 2026-09-24
source: pm/requirements/specs/in-progress/FEATURE-009-behavior-risk-coach.md
---

## Summary

FEATURE-009 의 "계획 · 사이즈 · 행동 미러"가 쓸 저장소. 슬라이스 1 은 `public` 스키마 3가지(프로필 컬럼 · `trade_plans` ·
`decision_outcomes`)를 **추가만** 한다. `forecast.realized_vol` 은 슬라이스 2(`FC-REQ-006`)에서 이 REQ 에 FR 을 더한다.

## 결정

- **예산은 값 · 단위 두 컬럼.** 사용자가 "원 또는 총자산 %"로 정한다(FR-1). 비율을 저장 시점에 원으로 바꾸면 평가금액이 바뀔 때
  예산이 거짓이 된다 — 환산은 읽을 때 한다. 값 · 단위 짝은 CHECK 가 지킨다(반쪽 값 금지)
- **빈 예산은 `NULL`.** 0 이나 기본값으로 채우지 않는다(FEATURE-009 FR-2). `target_volatility` 도 `NULL` 이면 읽는 쪽이 15% 를 쓰고 "기본값"이라고 밝힌다
- **`decision_outcomes` 는 지금 만들고 쓰기는 슬라이스 4.** 계획(결정)과 결과를 한 테이블에 두면 "좋은 결정 · 나쁜 결과"를 못 가른다(W06)
- **정밀도는 `performance-database.md` §1** — 금액 `(38,10)` · 수량 `(38,18)` · 비율 `(18,8)`
- **`sample_origin` 에 기본값이 없다** — C06(`DB-REQ-017` FR-60)과 같은 이유. 쓰는 쪽이 출처를 말한다

## FR

| FR | 내용 | 상태 |
|---|---|---|
| FR-1 | `user_investment_profiles` + `monthly_loss_budget` · `_unit` · `per_trade_max_loss` · `_unit`(`krw` \| `percent`) · `target_volatility` — 전부 nullable. CHECK: 단위 값 · 값 · 단위 짝 · 양수 · 변동성 (0, 2] | 완료(슬라이스 1) |
| FR-2 | `user_investment_profiles.hide_purchase_price boolean default false` (FEATURE-009 FR-27) | 완료(슬라이스 1) |
| FR-3 | `trade_plans` — `user_id` · `transaction_id?`(FK `portfolio_transactions`, **ON DELETE SET NULL**) · `symbol` · `side` · `stop_price?` · `target_price?` · `planned_quantity?` · `thesis?` · `invalidation?` · `review_at?` · `probability_up?` · `planned_at` · `sample_origin` · 판정 3열(`adherence_label` · `adherence_evaluated_at` · `user_adherence_label`) | 완료(슬라이스 1) |
| FR-4 | `trade_plans` CHECK — `side` · `sample_origin` 값, `probability_up ∈ [0,1]`, 가격 · 수량 양수 | 완료(슬라이스 1) |
| FR-5 | `trade_plans` 인덱스 `(user_id, symbol, planned_at DESC)` · `(transaction_id)` | 완료(슬라이스 1) |
| FR-6 | `decision_outcomes` — 청산 거래당 1행(`closing_transaction_id` UNIQUE, FK CASCADE) · `plan_id?`(FK SET NULL) · 보유 기간 · 수량 · 순손익(원) · 수수료 · 순수익률 · `r_multiple?` · `benchmark_return?` · 준수 라벨 · 자동 태그 · 사용자 태그 · 확정 시각 · `sample_origin` · `computed_at` | 완료(슬라이스 1, 쓰기는 슬라이스 4) |
| FR-7 | `decision_outcomes` 인덱스 `(user_id, closed_at DESC)` · `(plan_id)` | 완료(슬라이스 1) |
| FR-11 | `monthly_reviews` — `user_id`(FK CASCADE) · `month`(KST `YYYY-MM`) · `payload jsonb`(화면 모양 스냅샷, 숫자는 문자열) · `generated_at`. UNIQUE `(user_id, month DESC)` — 한 달 한 행, 동시 생성은 제약이 막는다. 조회 조건은 `(user_id, month)` 뿐이라 JSON 허용 목록 조건(쿼리 조건 아님)을 지킨다 | 완료(슬라이스 6, `20260927120000_coach_monthly_reviews`) |
| FR-12 | `trade_plans.checklist jsonb` nullable — 진입 전 체크리스트 기록 `{shown, checked}`(FEATURE-009 FR-30). 조회 조건으로 쓰지 않는다 | 완료(슬라이스 6, `20260927120100_trade_plan_checklist`) |
| FR-9 | `user_investment_profiles.investable_capital DECIMAL(38,10)` nullable · CHECK `> 0` — 투자금(현금 포함, 원). 목표 비중 안내의 전체(F010 슬라이스 5 · `SRV-REQ-024` FR-184). 비어 있으면 서버가 코인 평가금 합을 쓰고 밝힌다 — 0 · 기본값으로 채우지 않는다 | 완료(F010 슬라이스 5, `20260929120000_profile_investable_capital`) |
| FR-8 | `forecast.realized_vol`(종목 · 일 · EWMA · GARCH · QLIKE 채점 · 게이트) + 뷰 `forecast.v_realized_vol`(종목별 최신 1행) — Python 이 쓰고 서버가 뷰로 읽는다. CHECK: `annualized` null ⇔ `blocked_reason` 있음 · `annualized > 0` · `method` 값 | 완료(슬라이스 2, `20260924170000_forecast_realized_vol`) |

## 롤백

추가만 했다. F010 슬라이스 5: `ALTER TABLE user_investment_profiles DROP COLUMN investable_capital;`(적은 투자금만 잃는다 — 목표 비중은 코인 평가금 합 기준으로 돌아간다). 슬라이스 6: `DROP TABLE monthly_reviews;` · `ALTER TABLE trade_plans DROP COLUMN checklist;` — 복기를 지우면 다음 배치 · 조회가 지난달 것을 다시 만들지만 그 사이 고친 태그가 반영된 숫자가 된다(스냅샷의 뜻을 잃는다).
슬라이스 2: `DROP VIEW forecast.v_realized_vol; DROP TABLE forecast.realized_vol;`.
슬라이스 1: `DROP TABLE decision_outcomes; DROP TABLE trade_plans;` + 프로필 6컬럼 `DROP COLUMN` (마이그레이션 머리 주석).
원장 3종(`portfolio_transactions` · `portfolio_holdings` · `price_history`) 행은 건드리지 않는다.

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-09-24 | 신설 · 슬라이스 1 FR-1~7 구현(`20260924150000_coach_trade_plan_risk_budget`). 근거 `reports/checklists/DB-REQ-031.md` |
| 2026-09-24 | 슬라이스 2 FR-8 — `forecast.realized_vol` · `v_realized_vol`(`20260924170000_forecast_realized_vol`, `FC-REQ-006`) |
| 2026-09-27 | 슬라이스 6 FR-11 · 12 — `monthly_reviews` · `trade_plans.checklist`. 목적이 둘이라 마이그레이션도 둘(`20260927120000` · `20260927120100`). 로컬 `migrate deploy` 뒤 스키마 diff 0 |
| 2026-09-29 | F010 슬라이스 5 FR-9 — `investable_capital`(`20260929120000_profile_investable_capital`, 추가만 · CHECK > 0). 로컬 `migrate deploy` 적용 |
