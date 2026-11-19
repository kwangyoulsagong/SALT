import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/** 지난 대화를 읽는 동안 — 대화 면과 같은 높이(`CoachConversation` `root`) */
export const placeholder = style({ height: "calc(100dvh - 208px)", minHeight: "480px" });

export const note = style({
  margin: 0,
  fontSize: "13px",
  lineHeight: "20px",
  fontWeight: vars.fontWeights.semibold,
  color: vars.colors.neutral[700],
});
