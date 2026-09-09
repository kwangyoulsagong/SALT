import { style } from "@vanilla-extract/css";
import { vars } from "../../styles/tokens.css";

export const gridStyles = style({
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: "1px",
  width: "100%",
  background: vars.colors.background.white,
  paddingBottom: "env(safe-area-inset-bottom, 0px)",
  fontFamily: vars.fontFamily.base,
});

export const keyStyles = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  height: "56px",
  border: "none",
  background: vars.colors.background.white,
  color: vars.colors.text.primary,
  fontSize: vars.typography.t4.fontSize,
  lineHeight: vars.typography.t4.lineHeight,
  fontWeight: vars.fontWeights.semibold,
  fontVariantNumeric: vars.numeric.tabular,
  cursor: "pointer",

  selectors: {
    "&:active:not(:disabled)": {
      background: vars.colors.neutral[100],
    },
    "&:disabled": {
      color: vars.colors.text.disabled,
      cursor: "not-allowed",
    },
  },
});

export const iconKeyStyles = style({
  color: vars.colors.neutral[700],
});
