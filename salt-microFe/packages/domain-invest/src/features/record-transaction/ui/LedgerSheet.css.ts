import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/** 거래 기록 시트(F006 G절 2단계) — 필드 순서대로 한 열. 시트 · 모달 둘 다 같은 본문 */
export const sheetBody = style({ display: "grid", gap: 16, minWidth: 0 });
export const field = style({ display: "grid", gap: 6, minWidth: 0 });
export const fieldLabel = style({ fontSize: 13, fontWeight: 600, color: vars.colors.text.primary });
export const note = style({ margin: 0, fontSize: 13, color: vars.colors.text.lightGray });

export const pickedSymbol = style({ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 });
export const pickedName = style({ display: "flex", alignItems: "center", gap: 8, minWidth: 0, fontWeight: 600, color: vars.colors.text.primary });
export const textButton = style({
  border: 0,
  background: "transparent",
  padding: "4px 8px",
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 600,
  color: vars.colors.brand.primary,
  cursor: "pointer",
  ":hover": { background: vars.colors.neutral[50] },
  ":focus-visible": { outline: `2px solid ${vars.colors.brand.primary}`, outlineOffset: 2 },
});

export const resultList = style({ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 2, maxHeight: 240, overflowY: "auto" });
export const resultButton = style({
  display: "flex",
  alignItems: "center",
  gap: 10,
  width: "100%",
  border: 0,
  background: "transparent",
  padding: "8px",
  borderRadius: 8,
  textAlign: "left",
  fontSize: 13,
  fontWeight: 600,
  color: vars.colors.text.primary,
  cursor: "pointer",
  ":hover": { background: vars.colors.neutral[50] },
  ":focus-visible": { outline: `2px solid ${vars.colors.brand.primary}`, outlineOffset: 2 },
});
export const resultCode = style({ fontWeight: 500, color: vars.colors.text.lightGray });

/** 미리보기 카드 — 정보 상자(그림자 없음 · 옅은 면, `screen-desktop.md` §3) */
export const previewBox = style({ display: "grid", gap: 8, padding: 12, borderRadius: 12, background: vars.colors.neutral[50] });
export const previewTitle = style({ margin: 0, fontSize: 13, fontWeight: 600, color: vars.colors.text.primary });
export const previewRows = style({ margin: 0, display: "grid", gap: 6 });
export const previewRow = style({ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" });
/** 옅은 면(neutral 50) 위 — lightGray 는 4.41:1 로 모자라 한 단 진하게(2026-11-18 axe) */
export const previewKey = style({ fontSize: 13, color: vars.colors.text.secondary });
export const previewValue = style({ margin: 0, fontSize: 13, fontWeight: 600, color: vars.colors.text.primary, fontVariantNumeric: "tabular-nums" });

export const actions = style({ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "flex-end" });
export const deleteZone = style({ display: "grid", gap: 8, paddingTop: 12, borderTop: `1px solid ${vars.colors.neutral[100]}` });
