import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/** 문장 · 목록 한 줄은 최대 720(`screen-desktop.md` §2) */
export const root = style({ display: "flex", flexDirection: "column", gap: vars.space.md, maxWidth: "720px" });

export const intro = style({
  margin: 0,
  fontSize: "13px",
  lineHeight: "20px",
  fontWeight: vars.fontWeights.semibold,
  color: vars.colors.neutral[700],
});

export const log = style({ display: "flex", flexDirection: "column", gap: vars.space.sm, minHeight: "120px" });

export const sentences = style({ margin: 0, paddingLeft: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: vars.space.xs });

export const meta = style({ display: "flex", flexWrap: "wrap", alignItems: "center", gap: vars.space.sm });

export const links = style({ display: "flex", flexWrap: "wrap", gap: vars.space.sm, margin: 0, padding: 0, listStyle: "none" });

export const link = style({
  fontSize: "13px",
  lineHeight: "20px",
  fontWeight: vars.fontWeights.semibold,
  color: vars.colors.brand.primary,
  textDecoration: "none",
  selectors: { "&:hover": { textDecoration: "underline" } },
});

export const chips = style({ display: "flex", flexWrap: "wrap", gap: vars.space.sm });

export const composer = style({ display: "flex", flexDirection: "column", gap: vars.space.sm });

export const actions = style({ display: "flex", justifyContent: "flex-end" });

/** 라벨 단 12/500 · 2단 글자색(AA) */
export const note = style({
  margin: 0,
  fontSize: "12px",
  lineHeight: "16px",
  fontWeight: vars.fontWeights.medium,
  color: vars.colors.neutral[700],
});
