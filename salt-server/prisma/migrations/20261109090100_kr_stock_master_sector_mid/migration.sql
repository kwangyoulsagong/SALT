-- F016 단계 C (2026-11-09) — 지수업종 중분류. DB-REQ-041 · SRV-REQ-051 FR-7.
-- 추가만(NULL 허용 · 기본값 없음 → 표 다시 쓰기 0). 롤백 = ALTER TABLE kr_stock_master DROP COLUMN sector_mid_code.
--
-- 대분류(sector_code)는 "제조업"(0027 — 코스피 556종목) · 코스닥 1009 처럼 너무 넓다. 그 지수는 반도체 대형주가 지배해,
-- 제약사의 "업종 몫"이 반도체 대비 시장으로 계산됐다(2026-11-09 dry-run: 동화약품 업종 β −3.5). 중분류(0013 전기전자 · 0009 의약품 ·
-- 0015 운수장비 …)가 실제 업종이다. 중분류가 없으면(0000) 대분류가 이미 구체적이다(0021 금융 · 0029 서비스).
ALTER TABLE kr_stock_master ADD COLUMN sector_mid_code text;
