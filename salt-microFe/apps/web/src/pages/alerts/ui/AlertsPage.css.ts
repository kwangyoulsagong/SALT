import { style } from "@vanilla-extract/css";

/** 한 열 — 목록 한 줄 최대 720(`screen-desktop.md` §2). 빈 상태도 이 열 안에서 가운데(전체 폭 가운데로 떠 있지 않게, 2026-11-18 실화면) */
export const page = style({ display: "flex", flexDirection: "column", gap: 8, maxWidth: 768, padding: "16px 24px", boxSizing: "border-box" });

export const head = style({ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, maxWidth: 720 });

export const settingsLink = style({ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 600, color: "inherit", textDecoration: "none" });
