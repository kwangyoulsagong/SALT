import { globalStyle, style } from "@vanilla-extract/css";

import { MOBILE_ROOT } from "@repo/core/mobile";

import { vars } from "@repo/ui/tokens";

export const form = style({ display: "flex", flexDirection: "column", gap: "12px" });

export const list = style({ display: "flex", flexDirection: "column", gap: "6px", margin: 0, padding: 0, listStyle: "none" });

export const row = style({ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" });

export const value = style({ fontSize: "13px", lineHeight: "20px", fontWeight: 600, color: vars.colors.text.primary, fontVariantNumeric: "tabular-nums" });

export const label = style({ minHeight: "16px", fontSize: "12px", lineHeight: "16px", fontWeight: 500, color: vars.colors.text.tertiary });

/** 휴대폰(`/m`) — 글자 13 · 누름 44(`FE-REQ-072` FR-5 실측). 데스크톱 값은 그대로 */
globalStyle(`${MOBILE_ROOT} ${label}`, { fontSize: "13px", lineHeight: "20px" });
