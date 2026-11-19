/** plan 이 주인인 사람 행(`SRV-REQ-048` FR-3 · 4) — 월 적립액 · 주마다 계획 · 체크 */
import type { UserRowSet } from "../../shared/infrastructure/userRows";

export const PLAN_USER_ROWS: readonly UserRowSet[] = [{ table: "weekly_plan_executions" }, { table: "plan_settings" }];
