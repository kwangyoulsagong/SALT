-- F010 슬라이스 6 (2026-09-30) — 업비트 거래 유의 · 주의 표시 스냅샷. DB-REQ-029 FR-22 · FC-REQ-014.
-- 추가만. 롤백 = DROP VIEW forecast.v_market_warning · DROP TABLE forecast.market_warning_snapshot.
-- 쓰기는 salt-forecast 만, 서버는 뷰만 읽는다(db-contract.md §1 · §2).
--
-- 업비트 /v1/market/all?is_details=true 의 market_event 는 **지금 상태만** 준다(이력 없음). 그래서 받을 때마다
-- 불변 스냅샷으로 쌓는다 — 사전등록 market-warning@1 의 라이브 기록(첫 확인 2026-11-25)이 이 행들이다.

CREATE TABLE forecast.market_warning_snapshot (
  symbol       text        NOT NULL,             -- KRW-XXX
  fetched_at   timestamptz NOT NULL,             -- 응답을 받은 시각 = observed_at = available_at(원천에 게시 시각 없음)
  warning      boolean     NOT NULL,             -- 투자유의
  cautions     text[]      NOT NULL DEFAULT '{}', -- 켜진 주의 종류(PRICE_FLUCTUATIONS · ...) — 알파벳 순
  PRIMARY KEY (symbol, fetched_at)
);
CREATE INDEX market_warning_snapshot_latest ON forecast.market_warning_snapshot (symbol, fetched_at DESC);
CREATE TRIGGER market_warning_snapshot_no_update BEFORE UPDATE ON forecast.market_warning_snapshot
  FOR EACH ROW EXECUTE FUNCTION judgment_ledger_immutable();

-- 서버가 읽는 계약: 종목별 최신 한 행. 신선도(오래된 스냅샷을 믿을지)는 서버가 fetched_at 으로 판단한다
CREATE VIEW forecast.v_market_warning AS
SELECT DISTINCT ON (symbol)
  symbol, fetched_at, warning, cautions
FROM forecast.market_warning_snapshot
ORDER BY symbol, fetched_at DESC;
