import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

import { SURFACE } from "@repo/web-shared/ui/surface.css";

/** 화면 제목 18/700(`deskType.title`) — 뒤로 줄 아래 */
export const title = style({
  margin: 0,
  fontSize: vars.deskType.title.fontSize,
  lineHeight: vars.deskType.title.lineHeight,
  fontWeight: vars.deskType.title.fontWeight,
  color: vars.colors.desk.text1,
});

export const description = style({ margin: "-8px 0 0", maxWidth: "720px", fontSize: "13px", lineHeight: "20px", fontWeight: 500, color: vars.colors.desk.text2, wordBreak: "keep-all" });

/** 실패 한 줄 + 다시 불러오기 */
export const statusRow = style({ display: "flex", flexWrap: "wrap", alignItems: "center", gap: vars.space.sm });

export const count = style({ margin: 0, fontSize: "13px", lineHeight: "20px", fontWeight: 600, color: vars.colors.text.primary, fontVariantNumeric: "tabular-nums" });

/** 카드 격자 — 넓은 패널에서 한 줄씩 늘리지 않는다(`screen-desktop.md` §5). 칸 최소 320 · 휴대폰 폭은 한 열 */
export const list = style({ margin: 0, padding: 0, listStyle: "none", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 320px), 1fr))", gap: "12px" });

export const card = style({ display: "flex", flexDirection: "column", gap: "8px", padding: "16px", borderRadius: "12px", background: SURFACE.infoFill, boxShadow: `inset 0 0 0 1px ${vars.colors.desk.line}` });

export const cardTitle = style({ margin: 0, fontSize: "12px", lineHeight: "16px", fontWeight: 600, color: vars.colors.desk.text2 });

export const question = style({ margin: 0, fontSize: "14px", lineHeight: "22px", fontWeight: 600, color: vars.colors.text.primary, wordBreak: "keep-all" });

export const answer = style({ margin: 0, fontSize: "14px", lineHeight: "22px", color: vars.colors.text.primary, wordBreak: "keep-all" });

export const answerLabel = style({ fontWeight: 700, marginRight: "6px" });

export const explanation = style({ margin: 0, fontSize: "13px", lineHeight: "20px", color: vars.colors.text.primary, wordBreak: "keep-all" });

export const foot = style({ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", fontSize: "12px", lineHeight: "16px", color: vars.colors.desk.text2 });

export const link = style({ display: "inline-flex", alignItems: "center", gap: "2px", minHeight: "32px", color: vars.colors.text.primary, fontWeight: 600, textDecoration: "none" });
