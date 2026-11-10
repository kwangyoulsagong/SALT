-- SRV-REQ-040 FR-61 v2 (2026-11-10, F017 v2 단계 1b) — 판단 원장에 국내 행. 자산군을 열로 남긴다.
-- 종목 코드 모양으로 자산군을 추측하지 않는다(6글자 코인이 있다 — SRV-REQ-040 FR-39). 읽는 쪽(코인 rule-ic@1 라이브 · 국내 rule-ic-kr)이
-- 이 열로 표본을 가른다 — 코인 라이브 표본(첫 열람 2026-11-23)에 국내 행이 섞이지 않게.
--
-- 기존 행: 발행기(PublishJudgmentLedger)가 코인만 남겼다(`assetClass !== "crypto"` 건너뜀) — 전부 crypto. 쓴 쪽으로 가른다.
-- ADD COLUMN … DEFAULT 는 행을 다시 쓰지 않아 불변 트리거(BEFORE UPDATE)가 돌지 않는다. 기본값은 바로 지운다 — 쓰는 쪽이 말한다(sample_origin 과 같다).
-- 롤백: ALTER TABLE "judgment_ledger" DROP COLUMN "asset_class"; (국내 행이 생긴 뒤면 그 행이 코인으로 읽힌다 — 먼저 국내 행을 뺀다)

ALTER TABLE "judgment_ledger" ADD COLUMN "asset_class" TEXT NOT NULL DEFAULT 'crypto';
ALTER TABLE "judgment_ledger" ALTER COLUMN "asset_class" DROP DEFAULT;
ALTER TABLE "judgment_ledger"
  ADD CONSTRAINT "judgment_ledger_asset_class_check" CHECK ("asset_class" IN ('crypto', 'kr_stock'));
