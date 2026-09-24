-- DB-REQ-017 FR-60 (2026-09-24, F009 슬라이스 0 C06) — 판단 표본의 출처.
-- 실측 성적은 live 만 센다. 합성 표본(시드)이 게이트를 열지 못하게 한다.
--
-- 기존 행 채우기: 이 테이블을 쓰는 곳은 둘뿐이다 — 워커(PrismaSymbolJudgmentStore.saveSnapshots)와
-- 시드 스크립트(scripts/seed-judgment-snapshots.ts). 시드 행은 reasons 에 "seed:" 표식이 있다.
-- 그래서 출처를 추정하는 것이 아니라 쓴 쪽으로 가른다: 표식 있음 → synthetic, 나머지 → live.
--
-- 롤백: ALTER TABLE symbol_judgment_snapshots DROP COLUMN sample_origin; (행 손실 없음)

ALTER TABLE "symbol_judgment_snapshots" ADD COLUMN "sample_origin" TEXT;

UPDATE "symbol_judgment_snapshots" SET "sample_origin" = 'synthetic'
WHERE "reasons"::text LIKE '%"seed:%';

UPDATE "symbol_judgment_snapshots" SET "sample_origin" = 'live'
WHERE "sample_origin" IS NULL;

ALTER TABLE "symbol_judgment_snapshots" ALTER COLUMN "sample_origin" SET NOT NULL;

ALTER TABLE "symbol_judgment_snapshots"
  ADD CONSTRAINT "symbol_judgment_snapshots_sample_origin_check"
  CHECK ("sample_origin" IN ('live', 'backtest', 'synthetic'));
