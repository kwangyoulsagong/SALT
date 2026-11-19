import { style } from "@vanilla-extract/css";

import { IN_APP_WEBVIEW } from "@repo/core/embed";

/**
 * 본문 시작하기 카드는 앱 웹뷰에서만 — 데스크톱 · 태블릿 웹은 오른쪽 칸 행이 대신한다(`FE-REQ-048` FR-8 · FR-9).
 * 둘 다 같은 쿼리를 읽어 요청은 하나다
 */
export const appOnly = style({ display: "none", selectors: { [IN_APP_WEBVIEW]: { display: "block" } } });
