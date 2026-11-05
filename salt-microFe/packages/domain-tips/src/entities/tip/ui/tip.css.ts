import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

import { SURFACE } from "@repo/web-shared/ui/surface.css";

/** 공개 글 — 휴대폰 폭부터(FE-REQ-058 FR-7). 한 줄 최대 720(`screen-desktop.md` §2) */
export const meta = style({
  display: "grid",
  gridTemplateColumns: "max-content minmax(0, 1fr)",
  gap: "4px 12px",
  margin: 0,
  padding: "12px 16px",
  borderRadius: "12px",
  background: SURFACE.weakFill,
  fontSize: "12px",
  lineHeight: "16px",
});

export const metaName = style({ color: "rgba(22, 31, 46, 0.64)", fontWeight: 500 });

export const metaValue = style({ margin: 0, color: vars.colors.text.primary, fontWeight: 500, overflowWrap: "anywhere" });

export const sourceLink = style({ color: vars.colors.text.primary, fontWeight: 600, textDecoration: "underline", textUnderlineOffset: "3px" });

export const body = style({ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "720px" });

export const heading = style({ margin: "8px 0 0", fontSize: "14px", lineHeight: "20px", fontWeight: 600, color: vars.colors.text.primary });

export const paragraph = style({ margin: 0, fontSize: "15px", lineHeight: "24px", color: vars.colors.text.primary, wordBreak: "keep-all" });

export const bullets = style({ margin: 0, paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "6px", fontSize: "15px", lineHeight: "24px", color: vars.colors.text.primary, wordBreak: "keep-all" });

export const revisions = style({ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "4px", fontSize: "12px", lineHeight: "16px", color: vars.colors.text.primary });

export const revisionDate = style({ color: "rgba(22, 31, 46, 0.64)", marginRight: "8px", fontVariantNumeric: "tabular-nums" });
