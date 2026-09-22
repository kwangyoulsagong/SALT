import { style } from "@vanilla-extract/css";

import { vars } from "@/shared/ui/tokens.css";

export const detailChart = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space.medium,
  minWidth: 0,
});

/** 폭을 재는 상자 — `MarketPreviewChart.css.ts` `chartMeasure` 와 같은 이유로 100% · 넘침 자름 */
export const detailChartMeasure = style({
  width: "100%",
  minWidth: 0,
  overflow: "hidden",
});
