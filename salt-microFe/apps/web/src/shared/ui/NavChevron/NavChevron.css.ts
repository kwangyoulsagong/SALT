import { style } from "@vanilla-extract/css";

import { vars } from "../tokens.css";

export const navChevron = style({
  flexShrink: 0,
  color: vars.colors.text.primary,
  verticalAlign: "middle",
});
