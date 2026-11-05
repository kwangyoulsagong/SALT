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

export const revision = style({ display: "flex", flexDirection: "column", gap: "6px" });

export const revisionDate = style({ color: "rgba(22, 31, 46, 0.64)", marginRight: "8px", fontVariantNumeric: "tabular-nums" });

/** 바뀐 줄(FR-7) — 빨강 · 초록을 쓰지 않는다(이 앱에서 두 색은 오름 · 내림 뜻이 있다). 앞 글자 · 취소선 · 바탕으로 가른다 */
export const changes = style({ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "2px", maxWidth: "720px" });

export const change = style({ display: "grid", gridTemplateColumns: "12px minmax(0, 1fr)", gap: "4px", fontSize: "13px", lineHeight: "20px", wordBreak: "keep-all" });

export const changeMark = style({ color: "rgba(22, 31, 46, 0.64)", fontWeight: 600, textAlign: "center" });

export const removed = style({ color: "rgba(22, 31, 46, 0.64)", textDecoration: "line-through" });

export const added = style({ color: vars.colors.text.primary, textDecoration: "none", background: SURFACE.weakFill, borderRadius: "4px", padding: "0 4px" });

export const srOnly = style({
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
});
