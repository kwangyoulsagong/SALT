import { style } from "@vanilla-extract/css";

import { vars } from "@/shared/ui/tokens.css";

/** 차트 높이(범례 제외). 자리표시자도 같은 높이다 — CLS 0 (`FE-REQ-034` 성능 예산) */
export const DETAIL_CHART_HEIGHT = 420;
/** 범례 두 줄 자리(`TradingChart` 범례 `minHeight` 40 + 간격) */
export const LEGEND_HEIGHT = 48;

export const chartFallback = style({ height: DETAIL_CHART_HEIGHT + LEGEND_HEIGHT });

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

export const legendNote = style({
  color: vars.colors.text.primary,
  fontSize: vars.fontSizes.small,
});
