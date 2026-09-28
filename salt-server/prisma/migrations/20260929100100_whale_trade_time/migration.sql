-- F010 슬라이스 1 (2026-09-29) — 대형 체결의 발생 시각 · 거래소 체결 id. DB-REQ-017 FR-63.
-- detected_at 은 "우리가 저장한 시각"(도착)이었다. 같은 체결이 여러 호출에 걸쳐 중복 저장됐고, 체결이 실제로
-- 일어난 시각이 없었다. traded_at(발생) · sequential_id(거래소 체결 id)를 더하고 (symbol, sequential_id) 로 중복을 막는다.
-- 기존 행은 두 열이 NULL 이다(Postgres 유니크는 NULL 을 서로 다르게 본다 — 기존 행과 충돌하지 않는다).
-- 롤백 = DROP INDEX 둘 · DROP COLUMN 둘.
ALTER TABLE "whale_transactions" ADD COLUMN "traded_at" TIMESTAMP(3);
ALTER TABLE "whale_transactions" ADD COLUMN "sequential_id" BIGINT;
CREATE UNIQUE INDEX "whale_transactions_symbol_sequential_id_key" ON "whale_transactions"("symbol", "sequential_id");
CREATE INDEX "whale_transactions_symbol_traded_at_idx" ON "whale_transactions"("symbol", "traded_at");
