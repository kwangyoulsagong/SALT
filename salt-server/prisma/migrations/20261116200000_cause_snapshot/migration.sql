-- F017 v4 순서 5a (2026-11-16) — 원인 스냅샷. DB-REQ-043 FR-8 · SRV-REQ-053 FR-18 · FC-REQ-022 FR-15.
-- 추가만. 롤백 = DROP VIEW public.v_cause_snapshot_export; DROP TABLE public.cause_snapshot.
-- 주인 서버 coach — 시장 층 · 사용자 열 0. 예측은 export 뷰로만 읽는다(ADR-007 · msa-services.md §5).
-- 그날 패널이 보인 원인을 결과(다음 등락) 전에 남긴다 — 덧붙이기만(UPDATE 차단 · 같은 지문은 ON CONFLICT DO NOTHING).

CREATE TABLE "cause_snapshot" (
  "id"           TEXT             NOT NULL,
  "market"       TEXT             NOT NULL CHECK ("market" IN ('kr', 'crypto')),
  "symbol"       TEXT             NOT NULL,
  "trade_date"   DATE             NOT NULL,
  "fingerprint"  TEXT             NOT NULL,
  "top_kind"     TEXT             NOT NULL,
  "top_strength" TEXT             NOT NULL CHECK ("top_strength" IN ('likely', 'possible', 'none')),
  "change_rate"  DOUBLE PRECISION NOT NULL,
  "split"        JSONB,
  "candidates"   JSONB            NOT NULL,
  "captured_at"  TIMESTAMPTZ(3)   NOT NULL,
  CONSTRAINT "cause_snapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cause_snapshot_market_symbol_trade_date_fingerprint_key"
  ON "cause_snapshot" ("market", "symbol", "trade_date", "fingerprint");
CREATE INDEX "cause_snapshot_day_idx" ON "cause_snapshot" ("market", "trade_date");

CREATE TRIGGER cause_snapshot_immutable BEFORE UPDATE ON "cause_snapshot"
  FOR EACH ROW EXECUTE FUNCTION judgment_ledger_immutable();

-- 예측이 읽는 모양 — 사용 가능 시각(available_at) = 찍은 시각
CREATE VIEW public.v_cause_snapshot_export AS
SELECT market, symbol, trade_date, fingerprint, top_kind, top_strength, change_rate, split, candidates, captured_at
FROM public.cause_snapshot;
