import { style } from "@vanilla-extract/css";
import { vars } from "../../styles/tokens.css";

export const preivewChartWrapper = style({
  position: "relative",
  width: 447,
  height: 210,
  background: vars.colors.background.white,
  overflow: "hidden",
});

export const tootTipBase = style({
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
