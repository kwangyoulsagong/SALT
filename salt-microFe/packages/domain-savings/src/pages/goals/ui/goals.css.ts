import { style } from "@vanilla-extract/css";

export const page = style({ display: "flex", flexDirection: "column", gap: "16px", padding: "20px 24px 32px" });

export const head = style({ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" });

export const list = style({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
  gap: "12px",
  margin: 0,
  padding: 0,
  listStyle: "none",
});

export const side = style({ maxWidth: "560px" });
