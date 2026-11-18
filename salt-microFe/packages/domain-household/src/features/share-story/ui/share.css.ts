import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

export const note = style({ margin: 0, minHeight: "16px", fontSize: "12px", lineHeight: "16px", color: vars.colors.text.tertiary, maxWidth: "480px" });
