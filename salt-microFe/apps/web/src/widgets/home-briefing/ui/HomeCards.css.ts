import { style } from "@vanilla-extract/css";

import { IN_APP_WEBVIEW } from "@repo/core/embed";
import { vars } from "@repo/ui/tokens";

/**
 * 카드 2열 · 간격 16 · 칸 최대 560(`FE-REQ-048` FR-8 · 리서치 — 카드를 패널 폭으로 늘리지 않는다, 1920 에서도 560 에서 멈추고 왼쪽 정렬).
 * 앱 웹뷰(390)는 한 열(FR-9)
 */
export const cardList = style({
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 560px))",
  gap: vars.space.lg,
  width: "100%",
  selectors: { [IN_APP_WEBVIEW]: { gridTemplateColumns: "minmax(0, 1fr)" } },
});

/** 대기 칸 — 카드와 같은 높이(152)로 둘씩(`streaming-ssr.md` 스켈레톤 높이 = 실제 블록) */
export const skeletonCell = style({ minHeight: "152px" });
