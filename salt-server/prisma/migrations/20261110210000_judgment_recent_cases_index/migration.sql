-- 판단 빗나간 사례 조회 인덱스(2026-11-10 F017 v2 단계 1b) — `recentCases`(유형 · 결과 · 최근 3건)가 과거 검산 행이 10만을 넘자
-- 맞는 행 3만 6천을 다 읽어 정렬했다(103ms, 국내 판단 상세 한 번에 두 번 → BFF 300ms 넘어 504). 조건(유형 · 결과) + 정렬(시각 내림 · 종목)
-- 순서 그대로 두면 앞에서 3건만 읽고 멈춘다. 출처 · 규칙 버전은 거르기로 남긴다(라이브 행은 적다).
-- 롤백: DROP INDEX "symbol_judgment_snapshots_recent_cases_idx";
CREATE INDEX "symbol_judgment_snapshots_recent_cases_idx"
  ON "symbol_judgment_snapshots" ("signal_type", "outcome", "judged_at" DESC, "symbol");
