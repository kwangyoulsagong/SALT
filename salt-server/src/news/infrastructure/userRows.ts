/** news 가 주인인 사람 행(`SRV-REQ-048` FR-3 · 4, 서버 S3c) — 북마크 */
import type { UserRowSet } from "../../shared/infrastructure/userRows";

export const NEWS_USER_ROWS: readonly UserRowSet[] = [{ table: "news_bookmarks" }];
