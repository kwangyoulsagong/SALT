import { style } from "@vanilla-extract/css";

export const imgBaseStyle = style({
  display: "inline-block",
  userSelect: "none",
});

export const hoverScaleStyle = style({
  transition: "transform 0.2s ease",
  ":hover": {
    transform: "scale(1.05)",
  },
});
