import { style } from "@vanilla-extract/css";
import { vars } from "@repo/ui/tokens";

/** 목표 추가 머리 장면 (FE-REQ-044 P-23) */
export const hero = style({
  display: "flex",
  justifyContent: "center",
  paddingTop: vars.space.lg,
});
