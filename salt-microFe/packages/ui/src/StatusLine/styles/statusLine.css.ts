import { recipe } from "@vanilla-extract/recipes";
import { vars } from "../../styles/tokens.css";

export const statusLineStyles = recipe({
  base: {
    display: "flex",
    alignItems: "center",
    gap: vars.space.sm,
    margin: 0,
    fontFamily: vars.fontFamily.base,
    fontSize: vars.typography.t7.fontSize,
    lineHeight: vars.typography.t7.lineHeight,
    wordBreak: "keep-all",
  },
  variants: {
    kind: {
      success: { color: vars.colors.text.primary, fontWeight: vars.fontWeights.semibold },
      progress: { color: vars.colors.text.lightGray },
      empty: { color: vars.colors.text.lightGray },
      error: { color: vars.colors.text.lightGray },
      blocked: { color: vars.colors.text.lightGray },
    },
  },
});
