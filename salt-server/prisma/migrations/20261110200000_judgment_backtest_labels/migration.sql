-- DB-REQ-043 FR-6 (2026-11-10, F017 v2 단계 1b · 사전등록 signal-skill@1) — 과거 검산 표본의 출처 라벨.
-- 입력을 과거에 얼마나 재현했나를 행에 남긴다: backtest_full(점수 항목 전부) · backtest_price_only(과거가 없는 항목 기여 0) ·
-- backtest_seen(규칙을 고를 때 본 기간 — 등록상 저장하지 않지만 값은 허용해 둔다). 'backtest' 는 옛 행 호환으로 남긴다.
--
-- 기존 행: 'backtest' 는 국내 장기 kr-judgment-backtest@2 하나뿐이다(스크립트 scripts/backtest-kr-judgments.ts 만 쓴다).
-- 장기 규칙 항목(24시간 변화 · 일봉 RSI)을 전부 과거로 재현했으니 backtest_full 이다 — 추정이 아니라 쓴 쪽으로 가른다.
--
-- 롤백: UPDATE … SET sample_origin = 'backtest' WHERE sample_origin LIKE 'backtest_%'; 뒤 옛 CHECK 로(행 손실 없음)

ALTER TABLE "symbol_judgment_snapshots" DROP CONSTRAINT "symbol_judgment_snapshots_sample_origin_check";

ALTER TABLE "symbol_judgment_snapshots"
  ADD CONSTRAINT "symbol_judgment_snapshots_sample_origin_check"
  CHECK ("sample_origin" IN ('live', 'backtest', 'backtest_full', 'backtest_price_only', 'backtest_seen', 'synthetic'));

UPDATE "symbol_judgment_snapshots" SET "sample_origin" = 'backtest_full'
WHERE "sample_origin" = 'backtest' AND "signal_type" LIKE 'kr\_stock.long\_term.%';
