import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { vars } from "../../styles/tokens.css";

export const wrapperStyles = style({
  position: "relative",
  display: "inline-flex",
});

export const bubbleStyles = recipe({
  base: {
    position: "absolute",
    zIndex: vars.zIndices.tooltip,
    width: "max-content",
    maxWidth: "240px",
    padding: `${vars.space.sm} ${vars.space.md}`,
    borderRadius: vars.radius.base,
    background: vars.colors.neutral[800],
    color: vars.colors.text.white,
    fontFamily: vars.fontFamily.base,
    fontSize: vars.typography.t7.fontSize,
    lineHeight: vars.typography.t7.lineHeight,
    boxShadow: vars.elevation.md,
    wordBreak: "keep-all",
    pointerEvents: "none",
  },

  variants: {
    placement: {
      top: {
        bottom: "calc(100% + 6px)",
        left: "50%",
        transform: "translateX(-50%)",
      },
      bottom: {
        top: "calc(100% + 6px)",
        left: "50%",
        transform: "translateX(-50%)",
      },
      left: {
        right: "calc(100% + 6px)",
        top: "50%",
        transform: "translateY(-50%)",
      },
      right: {
        left: "calc(100% + 6px)",
        top: "50%",
        transform: "translateY(-50%)",
      },
    },
  },

  defaultVariants: {
    placement: "top",
  },
});
