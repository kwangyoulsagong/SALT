import { style } from "@vanilla-extract/css";
import { vars } from "@repo/ui/tokens";

export const page = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: vars.space.md,
  textAlign: "center",
  fontFamily: vars.fontFamily.base,
  // 화면 끝까지 — 70vh 에서 끊겨 아래 회색 바탕이 드러났다(2026-09-30 QA)
  minHeight: "100dvh",
  background: `linear-gradient(180deg, ${vars.colors.graphic.backdrop} 0%, ${vars.colors.background.white} 60%)`,
});

export const link = style({
  display: "inline-flex",
  alignItems: "center",
  height: "40px",
  padding: `0 ${vars.space.lg}`,
  borderRadius: vars.radius.button.md,
  background: vars.colors.brand.primary,
  color: vars.colors.text.white,
  fontWeight: vars.fontWeights.semibold,
  textDecoration: "none",
});

export const title = style({
  margin: `${vars.space.sm} 0 0`,
  color: vars.colors.text.primary,
  fontSize: vars.typography.t5.fontSize,
  lineHeight: vars.typography.t5.lineHeight,
  fontWeight: vars.fontWeights.bold,
});

export const description = style({
  margin: 0,
  color: vars.colors.text.lightGray,
  fontSize: vars.typography.t7.fontSize,
});
