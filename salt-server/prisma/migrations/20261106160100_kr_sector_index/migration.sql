-- DB-REQ-041 FR-4 (2026-11-06, F016 단계 B) — 국내 업종 지수. 유니버스 종목의 지수업종 대분류(kr_stock_master.sector_code)만
-- 장중 1분(KIS 업종 현재지수 FHPUP02100000 — 지수 3종과 같은 TR). 최신 값 한 행 + 거래일 한 행(장 끝 값이 그날 종가 — 단계 C β 재료).
-- 지수 3종(kr_index_quotes)과 표를 나눈 이유: 요약 띠 · 서킷브레이커 추정이 그 표를 읽는다 — 업종 수십 행이 섞이지 않게.
--
-- 롤백: DROP TABLE kr_sector_index_daily; DROP TABLE kr_sector_index_quote;
CREATE TABLE kr_sector_index_quote (
  code         text            NOT NULL,
  trade_date   date            NOT NULL,
  value        numeric(18,4)   NOT NULL,   -- 포인트
  change       numeric(18,4)   NOT NULL,   -- 전일 대비(포인트, 부호)
  change_rate  numeric(18,8)   NOT NULL,   -- %
  updated_at   timestamp(3)    NOT NULL,
  CONSTRAINT kr_sector_index_quote_pkey PRIMARY KEY (code)
);

CREATE TABLE kr_sector_index_daily (
  code         text            NOT NULL,
  trade_date   date            NOT NULL,
  close        numeric(18,4)   NOT NULL,
  change_rate  numeric(18,8)   NOT NULL,
  updated_at   timestamp(3)    NOT NULL,
  CONSTRAINT kr_sector_index_daily_pkey PRIMARY KEY (code, trade_date)
);
