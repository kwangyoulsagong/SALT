import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

export const page = style({ display: "flex", flexDirection: "column", gap: "16px", padding: "20px 24px 32px" });

export const columns = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 360px",
  gap: "16px",
  alignItems: "start",
  "@media": { "screen and (max-width: 1023px)": { gridTemplateColumns: "minmax(0, 1fr)" } },
});

export const stack = style({ display: "flex", flexDirection: "column", gap: "12px" });

export const deposits = style({ display: "flex", flexDirection: "column", gap: "4px", margin: 0, padding: 0, listStyle: "none" });

export const depositRow = style({
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  padding: "8px 0",
  fontSize: "13px",
  lineHeight: "20px",
  fontWeight: 600,
  color: vars.colors.text.primary,
  fontVariantNumeric: "tabular-nums",
});

export const muted = style({ fontSize: "12px", lineHeight: "16px", fontWeight: 500, color: vars.colors.neutral[600] });
