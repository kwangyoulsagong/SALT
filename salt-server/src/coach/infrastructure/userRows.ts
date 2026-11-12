/**
 * coach 가 주인인 사람 행(`SRV-REQ-048` FR-3 · 4, 서버 S3c) — 자식 먼저(결과 → 계획). 판단 원장(`judgment_ledger`)에는 사람 칸이 없다.
 * LLM 호출 기록은 지우지 않고 사람 칸만 비운다 — 전체 하루 상한이 그 행 수로 맞는다(행에 프롬프트 · 응답 원문 없음).
 */
import type { UserRowSet } from "../../shared/infrastructure/userRows";

export const COACH_USER_ROWS: readonly UserRowSet[] = [
  { table: "decision_outcomes" },
  { table: "trade_plans" },
  { table: "monthly_reviews" },
  { table: "coach_recommendation_snapshots" },
  { table: "investment_insights" },
  { table: "user_investment_profiles" },
  { table: "coach_generation_logs", export: false },
  { table: "llm_call_logs", nullify: "user_id", export: false },
];
