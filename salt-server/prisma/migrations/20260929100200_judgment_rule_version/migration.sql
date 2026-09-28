-- F010 슬라이스 1 (2026-09-29) — 종목 판단 스냅샷의 규칙 버전. DB-REQ-017 FR-64.
-- 규칙을 mode-decision@2 로 바꾸면 같은 signal_type(예: scalp.avoid)이 다른 규칙의 표본이 된다. 성적표가 두 버전을
-- 섞지 않게 행마다 버전을 적는다. 기존 행은 전부 @1 이 낸 판단이다. 기본값은 채운 뒤 지운다 — 쓰는 쪽이 버전을 말한다.
-- 롤백 = 인덱스 원복 · DROP COLUMN(행 손실 0).
ALTER TABLE "symbol_judgment_snapshots" ADD COLUMN "rule_version" TEXT NOT NULL DEFAULT 'mode-decision@1';
ALTER TABLE "symbol_judgment_snapshots" ALTER COLUMN "rule_version" DROP DEFAULT;

-- 성적 조회는 (버전, 그룹, 결과, 최근순)이다 — 버전을 선행 컬럼으로. 이름은 Prisma 가 63자로 자른 것과 같게
DROP INDEX "symbol_judgment_snapshots_signal_type_outcome_judged_at_idx";
CREATE INDEX "symbol_judgment_snapshots_rule_version_signal_type_outcome__idx"
  ON "symbol_judgment_snapshots"("rule_version", "signal_type", "outcome", "judged_at" DESC);
