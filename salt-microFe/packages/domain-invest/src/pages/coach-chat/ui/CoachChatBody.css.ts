import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/** 지난 대화를 읽는 동안 — 대화 면(소개 · 칩 · 입력)과 비슷한 높이를 지킨다 */
export const placeholder = style({
  minHeight: "320px",
  // 폭을 알기 전(첫 렌더)에도 PC 에서는 격자 높이 — 자리에서 격자로 바뀔 때 아래가 뛰지 않게
  "@media": { "(min-width: 1280px)": { height: "calc(100dvh - 150px)", minHeight: "560px" } },
});

export const note = style({
  margin: 0,
  fontSize: "13px",
  lineHeight: "20px",
  fontWeight: vars.fontWeights.semibold,
  color: vars.colors.neutral[700],
});

/** PC 격자 자리 — 격자와 같은 높이(`PcPanelGrid` `frame`) */
export const gridPlaceholder = style({ height: "calc(100dvh - 150px)", minHeight: "560px" });
