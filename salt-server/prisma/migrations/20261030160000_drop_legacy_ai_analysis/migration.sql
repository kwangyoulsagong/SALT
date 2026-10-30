-- 레거시 AI 분석 모델 제거(F000 FR-1 · SRV-REQ-007 FR-1 · DB-REQ-001 FR-1~3 · DB-REQ-003 M4).
-- 삭제 전 확인(2026-10-30): 코드 참조 0건(`grep -rn "AIAnalysis|AnalysisStatus|PredictionType" salt-server/src bff/src`) ·
-- 두 테이블 행 0건 · 이 테이블을 읽는 뷰 0건. 스냅샷 pg_dump -Fc + 복원 테스트 1회(커밋 메시지).
-- 되돌리기: 20251118113716_init 의 해당 CREATE TYPE · CREATE TABLE · 인덱스 · FK 를 다시 실행한다(행이 없어 데이터 복구는 필요 없다).
-- 마이그레이션 diff 에 함께 나온 coach_recommendation_snapshots 인덱스 이름 2건은 이 목적과 무관한 기존 드리프트라 넣지 않는다.

-- DropForeignKey
ALTER TABLE "ai_analyses" DROP CONSTRAINT "ai_analyses_session_id_fkey";

-- DropForeignKey
ALTER TABLE "ai_analyses" DROP CONSTRAINT "ai_analyses_user_id_fkey";

-- DropForeignKey
ALTER TABLE "ai_analysis_sessions" DROP CONSTRAINT "ai_analysis_sessions_user_id_fkey";

-- DropTable
DROP TABLE "ai_analyses";

-- DropTable
DROP TABLE "ai_analysis_sessions";

-- DropEnum
DROP TYPE "AnalysisStatus";

-- DropEnum
DROP TYPE "PredictionType";
