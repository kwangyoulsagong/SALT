-- DB-REQ-029 FR-13 (2026-09-24, F008 슬라이스 19 후속) — 전망 차트의 과거 가격 선.
-- 전망이 쓴 것과 **같은** 일봉을 준다(업비트 1d). 서버는 forecast 스키마를 뷰로만 읽는다(db-contract.md §2).
CREATE OR REPLACE VIEW forecast.v_daily_close AS
SELECT symbol, open_time, available_at, close
FROM forecast.price_bar
WHERE source = 'upbit' AND interval = '1d';
