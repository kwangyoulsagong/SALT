-- F011 슬라이스 5b (FC-REQ-009 · DB-REQ-029) — 국내 주식 일봉도 같은 뷰로. 열은 그대로, 행만 늘어난다.
-- 국내 주식은 salt-forecast 가 서버 일봉을 옮긴 source = 'kis'(심볼 = 6자리 코드, open_time = 거래일 00:00 KST).
-- 코인 심볼은 'KRW-' 접두라 겹치지 않는다. 롤백: 20260924100000 의 정의(source = 'upbit')로 CREATE OR REPLACE.
CREATE OR REPLACE VIEW forecast.v_daily_close AS
SELECT symbol, open_time, available_at, close
FROM forecast.price_bar
WHERE source IN ('upbit', 'kis') AND interval = '1d';
