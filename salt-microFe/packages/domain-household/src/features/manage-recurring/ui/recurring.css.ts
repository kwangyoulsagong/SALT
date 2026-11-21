import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

import { formBox, SURFACE } from "@repo/web-shared/ui/surface.css";

/** 반복 확인 카드 · 템플릿 편집 — 가계부 표면과 같은 값(경고 색 0) */
export const card = style([formBox, { gap: "10px" }]);

export const title = style({ margin: 0, fontSize: "14px", lineHeight: "20px", fontWeight: 600, color: vars.colors.text.primary });

export const list = style({ display: "flex", flexDirection: "column", gap: "10px", margin: 0, padding: 0, listStyle: "none" });

export const item = style({ display: "flex", flexDirection: "column", gap: "8px" });

export const line = style({ fontSize: "13px", lineHeight: "20px", fontWeight: 600, color: vars.colors.text.primary, fontVariantNumeric: "tabular-nums" });

export const actions = style({ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px" });

export const note = style({ margin: 0, minHeight: "16px", fontSize: "12px", lineHeight: "16px", color: vars.colors.text.tertiary });

export const form = style({ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "560px" });

export const label = style({ fontSize: "12px", lineHeight: "16px", fontWeight: 500, color: vars.colors.text.tertiary });

export const row = style({ display: "flex", alignItems: "center", gap: "12px", padding: "10px 0", borderBottom: `1px solid ${SURFACE.weakFill}` });

export const rowMain = style({ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0, flex: 1 });

export const amountField = style({ maxWidth: "200px" });

/** 행 왼쪽 분류 판 — 가계부 도메인 색 옅은 면 + 선 아이콘(2026-11-20, 가계부 쓴 내역 행과 같은 모양) */
export const iconPlate = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  width: "32px",
  height: "32px",
  borderRadius: "8px",
  background: "rgba(232, 89, 12, 0.1)",
  color: vars.colors.domain.household,
});

export const asideTitle = style({
  margin: 0,
  fontSize: vars.deskType.section.fontSize,
  lineHeight: vars.deskType.section.lineHeight,
  fontWeight: vars.deskType.section.fontWeight,
  color: vars.colors.desk.text1,
});
