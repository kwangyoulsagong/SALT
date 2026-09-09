import { style } from "@vanilla-extract/css";
import { vars } from "../../styles/tokens.css";

export const formStyles = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.sm,
  width: "100%",
  height: "44px",
  padding: `0 ${vars.space.sm} 0 ${vars.space.lg}`,
  borderRadius: vars.radius.medium,
  background: vars.colors.neutral[100],
  fontFamily: vars.fontFamily.base,

  selectors: {
    "&:focus-within": {
      outline: `2px solid ${vars.colors.border.focus}`,
      outlineOffset: "-2px",
    },
  },
});

export const iconStyles = style({
  display: "flex",
  alignItems: "center",
  flexShrink: 0,
  color: vars.colors.text.tertiary,
});

export const inputStyles = style({
  flex: 1,
  minWidth: 0,
  padding: 0,
  border: "none",
  outline: "none",
  background: "transparent",
  color: vars.colors.text.primary,
  fontFamily: vars.fontFamily.base,
  fontSize: vars.typography.t6.fontSize,
  lineHeight: vars.typography.t6.lineHeight,

  "::placeholder": {
    color: vars.colors.text.disabled,
  },

  // 브라우저 기본 x 버튼을 지우고 직접 만든 지우기 버튼만 남긴다.
  "::-webkit-search-cancel-button": {
    WebkitAppearance: "none",
    appearance: "none",
  },
});
