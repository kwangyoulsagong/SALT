import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

export const form = style({ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "640px" });

export const grid = style({ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "12px" });

export const note = style({ margin: 0, minHeight: "16px", fontSize: "12px", lineHeight: "16px", color: vars.colors.neutral[600] });
