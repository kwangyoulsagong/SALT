import { style } from "@vanilla-extract/css";
import { vars } from "@repo/ui/tokens";

export const ProfileContainer = style({
  width: "48px",
  height: "48px",
  borderRadius: vars.radius.full,
  flexShrink: 0,
});

/** 이미지가 없을 때의 자리. 브랜드 색을 옅게 깔고 이니셜을 얹는다. */
export const fallback = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: vars.colors.brand.lighter,
  color: vars.colors.brand.primary,
  fontSize: vars.typography.t5.fontSize,
  fontWeight: vars.fontWeights.bold,
  userSelect: "none",
});
