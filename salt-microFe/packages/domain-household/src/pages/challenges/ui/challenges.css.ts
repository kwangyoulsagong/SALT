import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

export const page = style({ display: "flex", flexDirection: "column", gap: "16px", padding: "20px 24px 32px" });

export const list = style({ display: "flex", flexDirection: "column", gap: "12px", margin: 0, padding: 0, listStyle: "none", maxWidth: "720px" });

export const sectionTitle = style({ margin: "8px 0 0", fontSize: "14px", lineHeight: "20px", fontWeight: 600, color: vars.colors.text.primary });

export const note = style({ margin: 0, fontSize: "12px", lineHeight: "16px", color: vars.colors.neutral[600] });
