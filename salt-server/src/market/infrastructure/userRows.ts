/** market 이 주인인 사람 행(`SRV-REQ-048` FR-3 · 4, 서버 S3c) — 관심 종목 */
import type { UserRowSet } from "../../shared/infrastructure/userRows";

export const MARKET_USER_ROWS: readonly UserRowSet[] = [{ table: "investment_watchlist" }];
