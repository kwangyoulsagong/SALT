import { style } from "@vanilla-extract/css";

export const head = style({ display: "flex", justifyContent: "flex-end", maxWidth: 720, marginBottom: 8 });

export const list = style({ display: "flex", flexDirection: "column", gap: 2, margin: 0, padding: 0, listStyle: "none" });

export const footer = style({ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4, maxWidth: 720, marginTop: 12 });
