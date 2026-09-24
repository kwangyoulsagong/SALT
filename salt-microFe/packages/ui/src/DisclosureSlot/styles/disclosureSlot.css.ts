import { style } from "@vanilla-extract/css";
import { vars } from "../../styles/tokens.css";

/** 카드 맨 아래 헤어라인 위 12px 회색 — 본문보다 한 단계 약하게, 대비는 AA(neutral 600) */
export const slotStyles = style({
  marginTop: vars.space.sm,
  paddingTop: vars.space.sm,
  borderTop: `1px solid ${vars.colors.neutral[100]}`,
});

export const listStyles = style({
  margin: 0,
  padding: 0,
  listStyle: "none",
  display: "flex",
  flexWrap: "wrap",
  columnGap: vars.space.sm,
  rowGap: "2px",
});

export const itemStyles = style({
  color: vars.colors.neutral[600],
  fontFamily: vars.fontFamily.base,
  fontSize: "12px",
  lineHeight: "18px",
  selectors: {
    "&:not(:last-child)::after": {
      content: '"·"',
      marginLeft: vars.space.sm,
      color: vars.colors.neutral[400],
    },
  },
});
