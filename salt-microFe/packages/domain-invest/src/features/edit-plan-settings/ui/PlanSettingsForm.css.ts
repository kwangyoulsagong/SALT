import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

export const form = style({ display: "grid", gap: 12, minWidth: 0, maxWidth: 480 });

export const title = style({ margin: 0, fontSize: 14, fontWeight: 600, color: vars.colors.text.primary });

export const note = style({ margin: 0, fontSize: 13, color: vars.colors.text.secondary });

export const list = style({ margin: 0, paddingLeft: 18, display: "grid", gap: 4, fontSize: 13, color: vars.colors.text.primary });

export const actions = style({ display: "flex", justifyContent: "flex-end" });
