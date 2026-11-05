import { globalStyle, style } from "@vanilla-extract/css";
import { vars } from "../../styles/tokens.css";

export const cardStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space.xs,
  width: "100%",
  padding: `${vars.space.md} ${vars.space.lg}`,
  borderRadius: vars.radius.medium,
  background: vars.colors.neutral[50],
  border: `1px solid ${vars.colors.neutral[200]}`,
  fontFamily: vars.fontFamily.base,
  color: vars.colors.neutral[800],
});

export const headStyles = style({
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: vars.space.sm,
});

export const eyebrowStyles = style({
  margin: 0,
  fontSize: vars.typography.t7.fontSize,
  lineHeight: vars.typography.t7.lineHeight,
  color: vars.colors.neutral[600],
});

export const titleStyles = style({
  margin: 0,
  fontSize: vars.typography.t6.fontSize,
  lineHeight: vars.typography.t6.lineHeight,
  fontWeight: vars.fontWeights.bold,
  wordBreak: "keep-all",
});

export const summaryStyles = style({
  margin: 0,
  fontSize: vars.typography.t7.fontSize,
  lineHeight: vars.typography.t7.lineHeight,
  color: vars.colors.neutral[700],
  wordBreak: "keep-all",
});

export const footStyles = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: `${vars.space.xs} ${vars.space.md}`,
  marginTop: vars.space.xs,
  fontSize: vars.typography.t7.fontSize,
  lineHeight: vars.typography.t7.lineHeight,
});

export const linkStyles = style({
  color: vars.colors.neutral[800],
  fontWeight: vars.fontWeights.bold,
  textDecoration: "underline",
  textUnderlineOffset: "3px",
});

/** 글 전체 링크 칸 — 링크는 부르는 쪽이 만든다(zone 을 넘는 `<a>`). 모양은 공식 링크와 같게 */
export const readMoreStyles = style({ display: "inline-flex" });

globalStyle(`${readMoreStyles} a`, {
  color: vars.colors.neutral[800],
  fontWeight: vars.fontWeights.bold,
  textDecoration: "underline",
  textUnderlineOffset: "3px",
});

export const sourceStyles = style({
  color: vars.colors.neutral[600],
});

/** 닫기 — 44px 누름 칸(`a11y-policy.md`), 그림은 작게 */
export const dismissStyles = style({
  flexShrink: 0,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: "44px",
  minHeight: "44px",
  margin: `calc(-1 * ${vars.space.sm}) calc(-1 * ${vars.space.sm}) 0 0`,
  border: "none",
  borderRadius: vars.radius.medium,
  background: "transparent",
  color: vars.colors.neutral[600],
  cursor: "pointer",
  fontSize: vars.typography.t6.fontSize,
  selectors: {
    "&:hover": { background: vars.colors.neutral[100] },
    "&:disabled": { cursor: "progress", opacity: 0.6 },
  },
});
