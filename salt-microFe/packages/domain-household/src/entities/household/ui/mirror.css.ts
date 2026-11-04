import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

import { SURFACE } from "@repo/web-shared/ui/surface.css";

/** 기분별 만족 거울 — 막대 색은 하나. 점수가 높다고 다른 색을 주지 않는다(평가 0) */
export const box = style({ display: "flex", flexDirection: "column", gap: "8px", padding: "12px 16px", borderRadius: "12px", background: SURFACE.weakFill });

export const title = style({ margin: 0, fontSize: "14px", lineHeight: "20px", fontWeight: 600, color: vars.colors.text.primary });

export const list = style({ display: "flex", flexDirection: "column", gap: "12px", margin: 0, padding: 0, listStyle: "none" });

export const item = style({ display: "flex", flexDirection: "column", gap: "4px" });

export const head = style({ fontSize: "13px", lineHeight: "20px", fontWeight: 600, color: vars.colors.text.primary });

export const bars = style({ display: "grid", gridTemplateColumns: "48px repeat(5, minmax(0, 1fr))", alignItems: "end", gap: "4px" });

export const when = style({ alignSelf: "center", fontSize: "12px", lineHeight: "16px", color: vars.colors.neutral[600] });

export const barCell = style({ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", gap: "2px", height: "40px" });

export const bar = style({ width: "100%", minHeight: "2px", borderRadius: "3px 3px 0 0", background: vars.colors.neutral[600] });

export const score = style({ fontSize: "11px", lineHeight: "12px", color: vars.colors.neutral[600] });

export const note = style({ margin: 0, fontSize: "12px", lineHeight: "16px", color: vars.colors.neutral[600] });
