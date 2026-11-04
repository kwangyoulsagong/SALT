import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

import { SURFACE } from "@repo/web-shared/ui/surface.css";

export const card = style({ display: "flex", flexDirection: "column", gap: "10px", padding: "12px 16px", borderRadius: "12px", background: SURFACE.weakFill, maxWidth: "720px" });

export const title = style({ margin: 0, fontSize: "14px", lineHeight: "20px", fontWeight: 600, color: vars.colors.text.primary });

/** 버튼이 카드 폭으로 늘지 않게 */
export const actions = style({ display: "flex", gap: "8px" });

export const note = style({ margin: 0, minHeight: "16px", fontSize: "12px", lineHeight: "16px", color: vars.colors.neutral[600] });
