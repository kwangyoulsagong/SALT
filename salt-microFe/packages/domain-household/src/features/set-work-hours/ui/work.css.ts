import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

import { formBox } from "@repo/web-shared/ui/surface.css";

export const form = style([formBox, { gap: "12px", maxWidth: "560px" }]);

export const title = style({ margin: 0, fontSize: "14px", lineHeight: "20px", fontWeight: 600, color: vars.colors.text.primary });

export const note = style({ margin: 0, minHeight: "16px", fontSize: "12px", lineHeight: "16px", color: vars.colors.text.tertiary });

export const actions = style({ display: "flex", gap: "8px" });
