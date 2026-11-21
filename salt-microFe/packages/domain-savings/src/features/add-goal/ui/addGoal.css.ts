import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

import { card, formBox } from "@repo/web-shared/ui/surface.css";

/** 입력 | 계산 결과(2026-11-20) — 1280 이상 나란히 */
export const form = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 560px)",
  gap: "20px",
  alignItems: "start",
  "@media": { "screen and (min-width: 1280px)": { gridTemplateColumns: "minmax(0, 560px) minmax(0, 400px)" } },
});

/** 입력 카드 · 결과 카드(`FE-REQ-076` 2단계 — 카드 판 위 흰 카드) */
export const inputs = style([card, { gap: "16px" }]);

export const outcome = style([card, { gap: "12px", "@media": { "screen and (min-width: 1280px)": { position: "sticky", top: "16px" } } }]);

export const fieldset = style({ display: "flex", flexDirection: "column", gap: "8px", margin: 0, padding: 0, border: 0 });

export const legend = style({ marginBottom: "8px", fontSize: "14px", lineHeight: "20px", fontWeight: 600, color: vars.colors.text.primary });

export const chips = style({ display: "flex", flexWrap: "wrap", gap: "8px" });

export const hint = style({ fontSize: "12px", lineHeight: "16px", fontWeight: 500, color: vars.colors.text.tertiary });

export const result = style([formBox, { gap: "6px" }]);

export const resultRow = style({ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "12px" });

export const resultValue = style({ fontSize: "18px", lineHeight: "24px", fontWeight: 700, color: vars.colors.text.primary, fontVariantNumeric: "tabular-nums" });
