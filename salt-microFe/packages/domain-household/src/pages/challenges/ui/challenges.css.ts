import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";


export const list = style({ display: "flex", flexDirection: "column", gap: "12px", margin: 0, padding: 0, listStyle: "none", maxWidth: "720px" });

export const sectionTitle = style({ margin: "8px 0 0", fontSize: "14px", lineHeight: "20px", fontWeight: 600, color: vars.colors.text.primary });

export const note = style({ margin: 0, fontSize: "12px", lineHeight: "16px", color: vars.colors.text.tertiary });

/** 빈 안내 상자 — 같은 열의 폼 · 목록 카드(720)와 폭을 맞춘다. 한 열로 접히는 1280 미만에서 안내만 꽉 찬 폭이었다(2026-11-21 빈 계정 900 · 1024 실측) */
export const empty = style({ maxWidth: "720px" });

