import { style } from "@vanilla-extract/css";

import { IN_APP_WEBVIEW } from "@repo/core/embed";
import { vars } from "@repo/ui/tokens";

/**
 * 카드 격자 · 간격 16 · 칸 최대 560(`FE-REQ-048` FR-8 · 리서치 — 카드를 패널 폭으로 늘리지 않는다, 1920 에서도 560 에서 멈추고 왼쪽 정렬).
 * 2026-11-20 FR-12 — 미리보기가 들어간 카드는 칸 최소 300: 패널이 넓으면 한 줄 셋, 좁으면 둘씩 접힌다(카드 셋 — 팁은 카드 원천이 없다).
 * 앱 웹뷰(390)는 한 열(FR-9)
 */
export const cardList = style({
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
  gap: vars.space.lg,
  width: "100%",
  maxWidth: "1712px",
  // 앱 웹뷰 — 한 열 목록 행(간격 0, 행 아래 선이 가른다 — `FE-REQ-060` FR-M3)
  selectors: { [IN_APP_WEBVIEW]: { gridTemplateColumns: "minmax(0, 1fr)", gap: 0 } },
});

/** 대기 칸 — 카드와 같은 높이(264)(`streaming-ssr.md` 스켈레톤 높이 = 실제 블록) */
export const skeletonCell = style({ minHeight: "264px", selectors: { [IN_APP_WEBVIEW]: { minHeight: "72px", height: "72px", overflow: "hidden", padding: "4px 0" } } });

/** 카드 줄 + 둘째 줄 */
export const stack = style({ display: "flex", flexDirection: "column", gap: vars.space.lg, maxWidth: "1712px" });

/** 둘째 줄 — 최근 기록(넓게) · 다가오는 일. 패널이 좁으면 위아래 */
export const feedGrid = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr)",
  gap: vars.space.lg,
  alignItems: "start",
  "@media": { "screen and (min-width: 1280px)": { gridTemplateColumns: "minmax(0, 3fr) minmax(0, 2fr)" } },
  selectors: { [IN_APP_WEBVIEW]: { gridTemplateColumns: "minmax(0, 1fr)" } },
});
