-- F017 v4 순서 5b-2 (2026-11-16) — forecast.fact.value_num double → numeric(db-contract.md §3 "수치는 numeric(금액)").
-- 수급 · 추출 사실의 원화 금액이 이 열에 들어온다. 값은 그대로(지금 행은 정수 원 · 비율 — double 의 정확한 범위 안).
-- 롤백 = ALTER COLUMN value_num TYPE double precision. f_fact_asof 는 SETOF forecast.fact 라 다시 만들 필요 없음(행 형식 따라감).
ALTER TABLE forecast.fact ALTER COLUMN value_num TYPE numeric;
