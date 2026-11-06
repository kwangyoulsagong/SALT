-- DB-REQ-041 FR-3 (2026-11-06, F016 단계 A) — 시장 조치(서킷브레이커 · 사이드카). 단계마다 하루 한 번이라
-- (시장 · 거래일 · kind · 단계) 유일 — 다음 회차는 끝 시각만 채운다. source: feed(장운영정보 실시간 — 실측 전) | inferred(지수 분 기록).
-- 사이드카는 feed 로만 들어온다(추정 0 — SRV-REQ-051 FR-3). 시각은 UTC 벽시계 · trade_date 는 KST 거래일.
--
-- 롤백: DROP TABLE kr_market_action; (다른 테이블이 참조하지 않는다)
CREATE TABLE kr_market_action (
  market      text          NOT NULL,   -- KOSPI | KOSDAQ
  trade_date  date          NOT NULL,
  kind        text          NOT NULL,   -- circuit_breaker | sidecar
  stage       integer       NOT NULL,
  direction   text          NOT NULL,   -- up | down
  started_at  timestamp(3)  NOT NULL,
  ended_at    timestamp(3),
  source      text          NOT NULL,   -- feed | inferred
  updated_at  timestamp(3)  NOT NULL,
  CONSTRAINT kr_market_action_pkey PRIMARY KEY (market, trade_date, kind, stage)
);
