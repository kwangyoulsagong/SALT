import { style } from "@vanilla-extract/css";

import { vars } from "../ui/tokens.css";

export const shell = style({
  display: "flex",
  flexDirection: "column",
  minHeight: "100vh",
  background: vars.colors.background.primary,
});

/** 머리 52 — 로고 하나(`screen-desktop.md` §1). 휴대폰 폭은 여백 16 */
export const header = style({
  display: "flex",
  alignItems: "center",
  height: "52px",
  padding: "0 16px",
  flexShrink: 0,
});

export const main = style({ flex: 1, width: "100%" });
