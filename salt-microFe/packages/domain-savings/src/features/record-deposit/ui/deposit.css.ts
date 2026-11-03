import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

export const form = style({ display: "flex", flexDirection: "column", gap: "12px" });

export const hint = style({ minHeight: "16px", fontSize: "12px", lineHeight: "16px", fontWeight: 500, color: vars.colors.neutral[600] });
