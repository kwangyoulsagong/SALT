/** portfolio 가 주인인 사람 행(`SRV-REQ-048` FR-3 · 4, 서버 S3c) — 거래 기록 · 보유. coach 결과(거래를 가리킨다)보다 뒤에 지운다 */
import type { UserRowSet } from "../../shared/infrastructure/userRows";

export const PORTFOLIO_USER_ROWS: readonly UserRowSet[] = [{ table: "portfolio_holdings" }, { table: "portfolio_transactions" }];
