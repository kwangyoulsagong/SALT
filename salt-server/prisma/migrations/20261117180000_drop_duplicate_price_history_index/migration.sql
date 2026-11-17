-- 2026-11-17 (`DB-REQ-017`) — price_history 의 같은 열 인덱스 둘 중 일반 인덱스를 지운다.
-- price_history_symbol_timeframe_timestamp_key(유니크, @@unique)와 열 · 순서가 같다 — 조회는 유니크 쪽이 다 받는다(쓰임 2,461만 회 vs 4회).
-- 봉 upsert 마다 같은 인덱스를 두 번 갱신하던 쓰기 비용 · 130MB 를 덜어낸다. 데이터 손실 0.
-- 롤백: CREATE INDEX price_history_symbol_timeframe_timestamp_idx ON price_history (symbol, timeframe, "timestamp");
DROP INDEX IF EXISTS "price_history_symbol_timeframe_timestamp_idx";
