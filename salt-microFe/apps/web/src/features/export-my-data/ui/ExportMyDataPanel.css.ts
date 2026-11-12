import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

export const actions = style({
  display: "flex",
  gap: vars.space.sm,
});
