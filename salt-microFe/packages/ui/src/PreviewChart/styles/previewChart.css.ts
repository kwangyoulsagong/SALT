import { style } from "@vanilla-extract/css";
import { chartReveal } from "../../Motion/enterReveal.css";
import { vars } from "../../styles/tokens.css";

export const previewChartWrapper = style({
  position: "relative",
  width: 447,
  height: 210,
  background: vars.colors.background.white,
  overflow: "hidden",
});

export const tooltipBase = style({
  position: "absolute",
  top: 40,
  width: "35%",
  padding: `${vars.space.sm} ${vars.space.md}`,
  borderRadius: vars.radius.base,
  background: vars.colors.background.white,
  pointerEvents: "none",
  transition: "opacity 120ms ease, transform 120ms ease",
  whiteSpace: "nowrap",
  border: `1px solid ${vars.colors.background.tertiary} `,
});

/** 처음 그릴 때 봉이 왼쪽부터 드러난다(FE-REQ-062 FR-7) */
export const previewReveal = style(chartReveal);
