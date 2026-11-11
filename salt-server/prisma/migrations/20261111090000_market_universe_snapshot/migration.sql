-- DB-REQ-044 FR-1 (2026-11-11, F017 v2 단계 1c · SRV-REQ-057 FR-7) — 추적 목록 일별 스냅샷. 생존 편향 차단.
-- 과거 검산(FC-REQ-028 FR-5)이 "그때 추적하던 종목"으로 표본을 고르려면 목록의 과거가 있어야 한다 —
-- 지금은 "지금 추적 중"만 있어 폐지 · 밀려난 종목이 표본에서 빠진다.
--
-- 불변: 하루 한 번 쓰고 고치지 않는다(UPDATE 트리거로 막음 — judgment_ledger 와 같은 함수). 재실행은 ON CONFLICT DO NOTHING.
-- 주인 market. 예측은 S5 에 export 뷰(`market.v_universe_snapshot_export`)로만 읽는다 — market 스키마가 S5 에 생긴다(DB-REQ-036 부록 B9 와 같은 줄).
-- 추가만. 롤백 = DROP TABLE "market_universe_snapshot";

CREATE TABLE "market_universe_snapshot" (
  "as_of_date"  DATE        NOT NULL,             -- KST 날짜
  "asset_type"  "AssetType" NOT NULL,
  "symbol"      TEXT        NOT NULL,             -- 코인 BTC · 국내 6자리
  "source"      TEXT        NOT NULL CHECK ("source" IN ('active_market', 'top_market_cap', 'holding', 'watch')),
  "rank"        INTEGER,                          -- 국내 시총 순위(1부터). 코인 · 보유 · 관심은 NULL
  "captured_at" TIMESTAMPTZ NOT NULL,
  PRIMARY KEY ("as_of_date", "asset_type", "symbol")
);
CREATE INDEX "market_universe_snapshot_type_date" ON "market_universe_snapshot" ("asset_type", "as_of_date");

CREATE TRIGGER market_universe_snapshot_no_update BEFORE UPDATE ON "market_universe_snapshot"
  FOR EACH ROW EXECUTE FUNCTION judgment_ledger_immutable();
