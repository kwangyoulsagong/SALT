-- DB-REQ-041 FR-5 (2026-11-06, F016 단계 B) — 국내 장중 수급. 이번엔 종목 프로그램 매매 누적(체결, KIS FHPPG04650101)만 —
-- 외국인 · 기관 장중 추정(FHPTJ04160001)은 모의 키가 거부한다(OPSQ2001, 2026-11-06 실측). 그 열은 실전 키 때 추가 마이그레이션으로.
-- 유니버스 종목 장중 10분 · (종목, 체결 시각) 한 행. 금액은 원(KIS 이 TR 은 원 단위 — 투자자 TR 의 백만 원과 다르다).
-- 하루가 지나면 일별 투자자 표(kr_stock_investor_flows)가 정본 — 7일 보관.
--
-- 롤백: DROP TABLE kr_flow_intraday;
CREATE TABLE kr_flow_intraday (
  code                  text            NOT NULL,
  at                    timestamp(3)    NOT NULL,   -- 체결 시각(UTC 벽시계)
  program_net_quantity  bigint          NOT NULL,   -- 주
  program_net_value     numeric(38,10)  NOT NULL,   -- 원
  program_buy_value     numeric(38,10)  NOT NULL,
  program_sell_value    numeric(38,10)  NOT NULL,
  collected_at          timestamp(3)    NOT NULL,
  CONSTRAINT kr_flow_intraday_pkey PRIMARY KEY (code, at)
);
CREATE INDEX kr_flow_intraday_at_idx ON kr_flow_intraday (at);
