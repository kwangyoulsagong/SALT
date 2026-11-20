import { globalStyle, style } from "@vanilla-extract/css";

import { enterReveal } from "../Motion/enterReveal.css";

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

/* ── 금액 카드(`FE-REQ-076` FR-4 — 휴대폰 금액 행의 데스크톱 판) ── */

/** 흰 카드 · 모서리 20 · 안쪽 20 × 24 — 왼쪽 금액 행, 오른쪽 나머지 타일. 좁으면(타일이 안 들어가면) 아래로 접힌다 */
export const amountCard = style({
  ...enterReveal,
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "16px 32px",
  margin: 0,
  padding: "20px 24px",
  borderRadius: vars.radius.xl,
  background: vars.colors.background.white,
  minWidth: 0,
  wordBreak: "keep-all",
});

export const amountLead = style({ display: "flex", alignItems: "center", gap: "14px", minWidth: 0, flex: "0 1 auto" });

/** 아이콘 판 44 · 모서리 12 · grey100 + 3D 그림 28 */
export const iconTile = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  width: "44px",
  height: "44px",
  borderRadius: vars.radius.medium,
  background: vars.colors.neutral[100],
});
globalStyle(`${iconTile} img`, { width: "28px", height: "28px" });

/** 금액 위 · 이름 아래 — dt/dd 순서는 그대로, 보이는 순서만 바꾼다 */
export const amountMain = style({ display: "flex", flexDirection: "column-reverse", gap: "2px", minWidth: 0 });

export const amountValue = style({
  margin: 0,
  fontSize: vars.deskType.price.fontSize,
  lineHeight: vars.deskType.price.lineHeight,
  fontWeight: vars.deskType.price.fontWeight,
  color: vars.colors.desk.text1,
  fontVariantNumeric: "tabular-nums",
  overflowWrap: "anywhere",
});

export const amountLabel = style({
  margin: 0,
  fontSize: vars.deskType.label.fontSize,
  lineHeight: vars.deskType.label.lineHeight,
  fontWeight: vars.deskType.label.fontWeight,
  color: vars.colors.desk.text2,
});

/**
 * 나머지 칸 — 1280 이상은 금액 오른쪽(왼쪽 1px 선 뒤), 그 아래 폭은 금액 아래 한 줄(위 1px 선 — 휴대폰 카드 바닥 줄과 같은 모양).
 * 접힐 때 왼쪽 선이 남지 않게 폭으로 가른다(2026-11-20 1024 실측)
 */
export const amountRest = style({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  gap: "4px 8px",
  flex: "1 1 100%",
  minWidth: 0,
  paddingTop: "12px",
  boxShadow: `inset 0 1px 0 ${vars.colors.neutral[100]}`,
  "@media": {
    "screen and (min-width: 1280px)": { flex: "1 1 420px", paddingTop: 0, paddingLeft: "24px", boxShadow: `inset 1px 0 0 ${vars.colors.neutral[100]}` },
  },
});
