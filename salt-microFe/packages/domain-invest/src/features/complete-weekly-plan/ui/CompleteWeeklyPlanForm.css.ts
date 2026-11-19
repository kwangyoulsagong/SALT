import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

export const form = style({ display: "grid", gap: 12, minWidth: 0 });

export const title = style({ margin: 0, fontSize: 14, fontWeight: 600, color: vars.colors.text.primary });

export const what = style({ margin: 0, fontSize: 13, color: vars.colors.text.secondary });

/** 자산 칸 둘 — 넓으면 나란히, 좁으면 한 줄씩 */
export const fields = style({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: 12,
});

export const actions = style({ display: "flex", justifyContent: "flex-end" });
