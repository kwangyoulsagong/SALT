import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

import { lineCard } from "@repo/web-shared/ui/surface.css";

export const board = style({ display: "flex", flexDirection: "column", gap: "16px" });

export const controls = style({ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px 16px", maxWidth: "480px" });

export const links = style({ display: "flex", flexWrap: "wrap", gap: "8px 16px" });

/** 공개 전 — 안내 | 예시 카드(2026-11-20) */
export const pending = style([
  lineCard,
  {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr)",
    gap: "24px",
    alignItems: "center",
    "@media": { "screen and (min-width: 1280px)": { gridTemplateColumns: "minmax(0, 1fr) minmax(0, 360px)" } },
  },
]);
export const pendingText = style({ display: "flex", flexDirection: "column", gap: "8px", minWidth: 0 });
export const pendingTitle = style({
  margin: 0,
  fontSize: vars.deskType.title.fontSize,
  lineHeight: vars.deskType.title.lineHeight,
  fontWeight: vars.deskType.title.fontWeight,
  color: vars.colors.desk.text1,
});
export const pendingBody = style({
  margin: 0,
  fontSize: vars.deskType.label.fontSize,
  lineHeight: vars.deskType.label.lineHeight,
  fontWeight: vars.deskType.label.fontWeight,
  color: vars.colors.desk.text2,
});
export const sampleCard = style({
  position: "relative",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  padding: "20px",
  borderRadius: "16px",
  background: "rgba(13, 25, 74, 0.02)",
});
export const sampleBadge = style({
  position: "absolute",
  top: "12px",
  right: "12px",
  padding: "0 6px",
  borderRadius: "6px",
  background: vars.colors.neutral[100],
  fontSize: vars.deskType.label.fontSize,
  lineHeight: "20px",
  color: vars.colors.desk.text2,
});
export const sampleLineWide = style({ display: "block", width: "60%", height: "16px", borderRadius: "6px", background: vars.colors.neutral[200] });
export const sampleLine = style({ display: "block", width: "40%", height: "10px", borderRadius: "6px", background: vars.colors.neutral[200] });
export const sampleDots = style({ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "6px", maxWidth: "220px" });
export const sampleDot = style({ display: "block", aspectRatio: "1", borderRadius: "999px", background: vars.colors.neutral[200] });
export const sampleDotOn = style({ display: "block", aspectRatio: "1", borderRadius: "999px", background: vars.colors.neutral[300] });
