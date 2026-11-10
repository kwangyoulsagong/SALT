-- DB-REQ-044 FR-2 (2026-11-11, F017 v2 단계 1c · SRV-REQ-057 FR-2) — 5분봉 "어디까지 거래소에 물어봤나".
-- 봉이 있나로 구멍을 세면 거래 없는 5분(업비트는 봉을 만들지 않는다)이 영원히 구멍이다. 물어본 구간을 적는다.
-- 앞으로만 옮긴다 — 쓰는 쪽은 한 문장 `INSERT … ON CONFLICT DO UPDATE … WHERE filled_through < EXCLUDED.filled_through`.
-- 추가만. 롤백 = DROP TABLE "price_fill_mark";

CREATE TABLE "price_fill_mark" (
  "asset_type"     "AssetType"  NOT NULL,
  "symbol"         TEXT         NOT NULL,
  "timeframe"      TEXT         NOT NULL,         -- price_history.timeframe 과 같은 글자(5m)
  "filled_through" TIMESTAMPTZ  NOT NULL,
  "updated_at"     TIMESTAMPTZ  NOT NULL,
  PRIMARY KEY ("asset_type", "symbol", "timeframe")
);
