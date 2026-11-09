-- 성적 기저율 풀 조회(접두 LIKE) 인덱스 — 판단 상세가 요청마다 백테스트 5만 행을 훑지 않게(2026-11-09 /api/app/ai-coach/detail 504).
-- 접두 LIKE 가 이 btree 를 타는 건 DB 정렬이 C 라서다(로컬 실측 — 운영 DB 정렬이 다르면 text_pattern_ops 판으로)
CREATE INDEX "symbol_judgment_snapshots_pool_idx" ON "symbol_judgment_snapshots"("sample_origin", "signal_type");
