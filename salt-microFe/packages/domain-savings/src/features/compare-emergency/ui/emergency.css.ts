import { globalStyle, style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

import { SURFACE } from "@repo/web-shared/ui/surface.css";

export const form = style({ display: "flex", flexDirection: "column", gap: "12px" });

export const inputs = style({
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "8px",
  "@media": { "screen and (max-width: 1023px)": { gridTemplateColumns: "1fr" } },
});

/** 두 줄을 나란히 — 같은 무게(어느 쪽도 강조하지 않는다) */
export const compare = style({ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "8px" });

/** 상세 고정 열 360(`FE-REQ-060` FR-9) — 입력 · 비교를 한 열로 */
export const compact = style({});
globalStyle(`${compact} ${inputs}, ${compact} ${compare}`, { gridTemplateColumns: "1fr" });

export const side = style({ display: "flex", flexDirection: "column", gap: "4px", padding: "12px 16px", borderRadius: "12px", background: SURFACE.infoFill, boxShadow: SURFACE.hairline });

export const value = style({ fontSize: "13px", lineHeight: "20px", fontWeight: 600, color: vars.colors.text.primary, fontVariantNumeric: "tabular-nums" });

export const label = style({ minHeight: "16px", fontSize: "12px", lineHeight: "16px", fontWeight: 500, color: vars.colors.text.tertiary });
