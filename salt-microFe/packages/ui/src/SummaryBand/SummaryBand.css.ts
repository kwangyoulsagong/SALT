import { style } from "@vanilla-extract/css";

import { vars } from "../styles/tokens.css";

/**
 * 금액 요약 띠(`FE-REQ-060` FR-2 · `screen-desktop.md` §4 "금액 요약 띠") — 타일 가로 격자. 타일은 투명 · 모서리 8 · 8×12,
 * 이름 12/500 2단 · 값 13/600 1단, 주인공 하나만 18/700. 카드 · 그림자 없음(면은 놓는 패널이 준다)
 */
export const band = style({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: "4px 8px",
  margin: 0,
  padding: 0,
  minWidth: 0,
});

export const tile = style({
  display: "flex",
  flexDirection: "column",
  gap: "2px",
  minWidth: 0,
  margin: 0,
  padding: "8px 12px",
  borderRadius: "8px",
});

export const label = style({
  margin: 0,
  fontSize: vars.deskType.label.fontSize,
  lineHeight: vars.deskType.label.lineHeight,
  fontWeight: vars.deskType.label.fontWeight,
  color: vars.colors.desk.text2,
});

export const value = style({
  margin: 0,
  fontSize: vars.deskType.body.fontSize,
  lineHeight: vars.deskType.body.lineHeight,
  fontWeight: vars.deskType.body.fontWeight,
  color: vars.colors.desk.text1,
  fontVariantNumeric: "tabular-nums",
  overflowWrap: "anywhere",
});

/** 주인공 — 한 띠에 하나만 18/700 */
export const heroValue = style({
  fontSize: vars.deskType.title.fontSize,
  lineHeight: vars.deskType.title.lineHeight,
  fontWeight: vars.deskType.title.fontWeight,
});

export const hint = style([label, { fontVariantNumeric: "tabular-nums" }]);
