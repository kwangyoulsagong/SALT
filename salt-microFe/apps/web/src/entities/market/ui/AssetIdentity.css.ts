import { style, styleVariants } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/** 종목 자리 — 로고 + 한글 이름 + 심볼. 코치 리포트 · 미러 · 판정 성적표가 같이 쓴다 */
const identityBase = style({
  display: "inline-flex",
  alignItems: "center",
  minWidth: 0,
});

export const identity = styleVariants({
  md: [identityBase, { gap: "10px" }],
  sm: [identityBase, { gap: "6px" }],
});

export const identityText = style({
  display: "flex",
  flexDirection: "column",
  minWidth: 0,
});

const nameBase = style({
  color: vars.colors.text.primary,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});

export const identityName = styleVariants({
  md: [nameBase, { fontSize: "15px", lineHeight: "22px", fontWeight: vars.fontWeights.semibold }],
  sm: [
    nameBase,
    {
      color: vars.colors.neutral[600],
      fontSize: "12px",
      lineHeight: "16px",
      fontWeight: vars.fontWeights.semibold,
    },
  ],
});

export const identitySymbol = style({
  color: vars.colors.neutral[500],
  fontSize: "12px",
  lineHeight: "16px",
  fontWeight: vars.fontWeights.medium,
});
