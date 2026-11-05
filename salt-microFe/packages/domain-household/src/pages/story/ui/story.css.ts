import { style } from "@vanilla-extract/css";

export const page = style({ display: "flex", flexDirection: "column", gap: "16px", padding: "20px 24px 32px" });

export const board = style({ display: "flex", flexDirection: "column", gap: "16px" });

export const controls = style({ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px 16px", maxWidth: "480px" });

export const links = style({ display: "flex", flexWrap: "wrap", gap: "8px 16px" });
